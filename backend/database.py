import os
import re
import copy
import json
import time
import logging
import sqlite3
from datetime import datetime, date
from dotenv import load_dotenv

import pymongo
from pymongo import MongoClient, ASCENDING, DESCENDING

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("database")

# Environment configs
MONGODB_URI = os.environ.get("MONGODB_URI", "")
MONGODB_DB_NAME = os.environ.get("MONGODB_DB_NAME", "upi_fraud_detection")
SQLITE_DB_URL = os.environ.get("DATABASE_URL", "sqlite:///upi_fraud.db")

# Global Mongo handles
_mongo_client = None
_mongo_db = None
_mongo_connected = False
_mongo_error = None
_last_mongo_check = 0
_mongo_retry_delay = 180  # Don't stall requests with repeated failed timeouts for 3 minutes

def get_sqlite_path():
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(backend_dir, "upi_fraud.db")

def parse_dt(val):
    if isinstance(val, datetime):
        return val
    if not val:
        return datetime.utcnow()
    for fmt in (
        "%Y-%m-%d %H:%M:%S.%f",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S.%f",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d"
    ):
        try:
            return datetime.strptime(str(val), fmt)
        except Exception:
            pass
    try:
        return datetime.fromisoformat(str(val))
    except Exception:
        return datetime.utcnow()

def init_mongo(force=False):
    global _mongo_client, _mongo_db, _mongo_connected, _mongo_error, _last_mongo_check
    if _mongo_connected and _mongo_db is not None:
        return _mongo_db

    # If it failed recently and not forced, return immediately to prevent stalling server requests
    now = time.time()
    if not force and (_mongo_error is not None) and (now - _last_mongo_check < _mongo_retry_delay):
        return None

    _last_mongo_check = now
    try:
        if not MONGODB_URI:
            raise ValueError("MONGODB_URI is not configured.")

        logger.info(f"Connecting to MongoDB Atlas [{MONGODB_DB_NAME}]...")
        mongo_kwargs = {
            "serverSelectionTimeoutMS": 3000,
            "connectTimeoutMS": 3000,
            "socketTimeoutMS": 5000
        }
        try:
            import certifi
            mongo_kwargs["tlsCAFile"] = certifi.where()
        except ImportError:
            pass

        client = MongoClient(MONGODB_URI, **mongo_kwargs)
        # Ping check
        client.admin.command('ping')
        _mongo_client = client
        _mongo_db = client[MONGODB_DB_NAME]
        _mongo_connected = True
        _mongo_error = None
        logger.info("Successfully connected to MongoDB Atlas database!")
        return _mongo_db
    except Exception as e:
        _mongo_connected = False
        _mongo_error = str(e)
        logger.warning(f"Could not connect to MongoDB Atlas ({e}). Will use local SQLite fallback.")
        return None

def get_mongo_client():
    global _mongo_client
    if _mongo_client is None:
        init_mongo()
    return _mongo_client

def get_mongo_db():
    global _mongo_db
    if _mongo_db is None and not _mongo_connected:
        init_mongo()
    return _mongo_db

def setup_indexes():
    db = get_mongo_db()
    if db is None:
        return
    try:
        db.users.create_index([("email", ASCENDING)], unique=True, sparse=True)
        db.users.create_index([("upi_id", ASCENDING)], unique=True, sparse=True)
        db.users.create_index([("id", ASCENDING)], sparse=True)

        db.transactions.create_index([("id", ASCENDING)], unique=True)
        db.transactions.create_index([("timestamp", DESCENDING)])
        db.transactions.create_index([("sender_upi", ASCENDING)])
        db.transactions.create_index([("status", ASCENDING)])
        logger.info("MongoDB collections and indexes ensured.")
    except Exception as e:
        logger.warning(f"Error setting up MongoDB indexes: {e}")

def migrate_sqlite_to_mongodb():
    """Idempotently transfers any existing users and transactions from SQLite upi_fraud.db to MongoDB."""
    db = get_mongo_db()
    if db is None:
        return

    sqlite_path = get_sqlite_path()
    if not os.path.exists(sqlite_path):
        return

    try:
        conn = sqlite3.connect(sqlite_path)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()

        # Migrate Users
        try:
            cur.execute("SELECT * FROM users")
            users = [dict(r) for r in cur.fetchall()]
            for u in users:
                uid = u.get("id")
                existing = db.users.find_one({"$or": [{"_id": uid}, {"email": u.get("email")}]})
                if not existing:
                    u["_id"] = uid
                    u["created_at"] = parse_dt(u.get("created_at"))
                    db.users.insert_one(u)
                    logger.info(f"Migrated user {u.get('email')} to MongoDB.")
        except Exception as ue:
            logger.warning(f"Users migration note: {ue}")

        # Migrate Transactions
        try:
            cur.execute("SELECT * FROM transactions")
            txns = [dict(r) for r in cur.fetchall()]
            for t in txns:
                tid = t.get("id")
                existing = db.transactions.find_one({"_id": tid})
                if not existing:
                    t["_id"] = tid
                    t["timestamp"] = parse_dt(t.get("timestamp"))
                    db.transactions.insert_one(t)
            if txns:
                logger.info(f"Verified/migrated {len(txns)} transactions into MongoDB Atlas.")
        except Exception as te:
            logger.warning(f"Transactions migration note: {te}")

        conn.close()
    except Exception as e:
        logger.warning(f"SQLite migration check skipped: {e}")

# --- FILTER & QUERY ENGINE ---

class ColumnAttribute:
    def __init__(self, name):
        self.name = name

    def __eq__(self, other):
        return FilterClause({self.name: other})

    def __ne__(self, other):
        return FilterClause({self.name: {"$ne": other}})

    def __ge__(self, other):
        if isinstance(other, date) and not isinstance(other, datetime):
            other = datetime.combine(other, datetime.min.time())
        return FilterClause({self.name: {"$gte": other}})

    def __gt__(self, other):
        if isinstance(other, date) and not isinstance(other, datetime):
            other = datetime.combine(other, datetime.min.time())
        return FilterClause({self.name: {"$gt": other}})

    def __le__(self, other):
        if isinstance(other, date) and not isinstance(other, datetime):
            other = datetime.combine(other, datetime.max.time())
        return FilterClause({self.name: {"$lte": other}})

    def __lt__(self, other):
        if isinstance(other, date) and not isinstance(other, datetime):
            other = datetime.combine(other, datetime.min.time())
        return FilterClause({self.name: {"$lt": other}})

    def ilike(self, pattern):
        raw = str(pattern).strip("%")
        escaped = re.escape(raw)
        return FilterClause({self.name: {"$regex": escaped, "$options": "i"}})

    def in_(self, values):
        return FilterClause({self.name: {"$in": list(values)}})

class FilterClause:
    def __init__(self, query_dict):
        self.query_dict = query_dict

    def __or__(self, other):
        c1 = self.query_dict
        c2 = other.query_dict if isinstance(other, FilterClause) else other
        or_list = []
        if "$or" in c1:
            or_list.extend(c1["$or"])
        else:
            or_list.append(c1)
        if isinstance(c2, dict) and "$or" in c2:
            or_list.extend(c2["$or"])
        else:
            or_list.append(c2)
        return FilterClause({"$or": or_list})

    def __and__(self, other):
        c1 = self.query_dict
        c2 = other.query_dict if isinstance(other, FilterClause) else other
        return FilterClause({"$and": [c1, c2]})

def desc(col):
    col_name = "id" if getattr(col, "name", None) == "_id" else getattr(col, "name", str(col))
    return (col_name, DESCENDING)

def parse_sort_arg(arg):
    if isinstance(arg, tuple):
        col, d = arg
        if col == "_id":
            col = "id"
        return (col, d)
    if hasattr(arg, "name"):
        col = "id" if arg.name == "_id" else arg.name
        return (col, ASCENDING)
    if isinstance(arg, str):
        if arg.startswith("-"):
            col = "id" if arg[1:] == "_id" else arg[1:]
            return (col, DESCENDING)
        col = "id" if arg == "_id" else arg
        return (col, ASCENDING)
    return ("id", ASCENDING)

class MetaModel(type):
    def __getattr__(cls, name):
        if name.startswith("__"):
            raise AttributeError(name)
        return ColumnAttribute(name)

class ModelBase:
    __collection__ = ""

class User(ModelBase, metaclass=MetaModel):
    __collection__ = "users"

    def __init__(self, **kwargs):
        self.id = kwargs.get("id") or kwargs.get("_id")
        self.full_name = kwargs.get("full_name", "Aman Sharma")
        self.email = (kwargs.get("email") or "").strip().lower()
        self.password = kwargs.get("password", "password123")
        self.upi_id = (kwargs.get("upi_id") or "amansharma@aegis").strip().lower()
        self.account_balance = float(kwargs.get("account_balance", 125000.00))
        self.primary_device_id = kwargs.get("primary_device_id", "dev_default_desktop")
        self.primary_city = kwargs.get("primary_city", "Bengaluru")
        self.primary_lat = float(kwargs.get("primary_lat", 12.9716))
        self.primary_lon = float(kwargs.get("primary_lon", 77.5946))
        self.avg_txn_amount = float(kwargs.get("avg_txn_amount", 1200.0))
        created = kwargs.get("created_at")
        self.created_at = parse_dt(created) if created else datetime.utcnow()

    def to_doc(self):
        doc = {
            "id": self.id,
            "full_name": self.full_name,
            "email": self.email,
            "password": self.password,
            "upi_id": self.upi_id,
            "account_balance": float(self.account_balance),
            "primary_device_id": self.primary_device_id,
            "primary_city": self.primary_city,
            "primary_lat": float(self.primary_lat),
            "primary_lon": float(self.primary_lon),
            "avg_txn_amount": float(self.avg_txn_amount),
            "created_at": self.created_at
        }
        if self.id is not None:
            doc["_id"] = self.id
        return doc

    @classmethod
    def from_doc(cls, doc):
        if not doc:
            return None
        d = dict(doc)
        if "_id" in d and "id" not in d:
            d["id"] = d["_id"]
        return cls(**d)

class Transaction(ModelBase, metaclass=MetaModel):
    __collection__ = "transactions"

    def __init__(self, **kwargs):
        self.id = kwargs.get("id") or kwargs.get("_id")
        self.sender_upi = kwargs.get("sender_upi", "")
        self.receiver_upi = kwargs.get("receiver_upi", "")
        self.receiver_name = kwargs.get("receiver_name", "Merchant / User")
        self.amount = float(kwargs.get("amount", 0.0))
        self.remarks = kwargs.get("remarks", "UPI Transfer")
        self.status = kwargs.get("status", "APPROVED")
        self.fraud_probability = float(kwargs.get("fraud_probability", 0.0))
        self.xgb_score = float(kwargs.get("xgb_score", 0.0))
        self.autoencoder_score = float(kwargs.get("autoencoder_score", 0.0))
        self.risk_level = kwargs.get("risk_level", "LOW")

        reasons = kwargs.get("risk_reasons", "[]")
        self.risk_reasons = reasons if isinstance(reasons, str) else json.dumps(reasons)

        shap = kwargs.get("shap_explanation", "{}")
        self.shap_explanation = shap if isinstance(shap, str) else json.dumps(shap)

        dev = kwargs.get("device_info", "{}")
        self.device_info = dev if isinstance(dev, str) else json.dumps(dev)

        loc = kwargs.get("location_info", "{}")
        self.location_info = loc if isinstance(loc, str) else json.dumps(loc)

        self.ip_address = kwargs.get("ip_address", "127.0.0.1")
        ts = kwargs.get("timestamp")
        self.timestamp = parse_dt(ts) if ts else datetime.utcnow()

    def to_doc(self):
        return {
            "_id": self.id,
            "id": self.id,
            "sender_upi": self.sender_upi,
            "receiver_upi": self.receiver_upi,
            "receiver_name": self.receiver_name,
            "amount": float(self.amount),
            "remarks": self.remarks,
            "status": self.status,
            "fraud_probability": float(self.fraud_probability),
            "xgb_score": float(self.xgb_score),
            "autoencoder_score": float(self.autoencoder_score),
            "risk_level": self.risk_level,
            "risk_reasons": self.risk_reasons,
            "shap_explanation": self.shap_explanation,
            "device_info": self.device_info,
            "location_info": self.location_info,
            "ip_address": self.ip_address,
            "timestamp": self.timestamp
        }

    @classmethod
    def from_doc(cls, doc):
        if not doc:
            return None
        d = dict(doc)
        if "_id" in d and "id" not in d:
            d["id"] = str(d["_id"])
        return cls(**d)

# --- MONGODB IMPLEMENTATION ---

class MongoQuery:
    def __init__(self, model_class, collection, session):
        self.model_class = model_class
        self.collection = collection
        self.session = session
        self.filters = {}
        self.sort_criteria = []
        self._limit = None
        self._offset = None

    def filter(self, *clauses):
        for c in clauses:
            if isinstance(c, FilterClause):
                q = c.query_dict
            elif isinstance(c, dict):
                q = c
            else:
                continue

            for k, v in q.items():
                if k == "$or":
                    if "$or" not in self.filters:
                        self.filters["$or"] = []
                    self.filters["$or"].extend(v)
                elif k in self.filters:
                    if isinstance(self.filters[k], dict) and isinstance(v, dict):
                        self.filters[k].update(v)
                    else:
                        if "$and" not in self.filters:
                            self.filters["$and"] = []
                        self.filters["$and"].append({k: self.filters.pop(k)})
                        self.filters["$and"].append({k: v})
                else:
                    self.filters[k] = v
        return self

    def order_by(self, *args):
        for arg in args:
            self.sort_criteria.append(parse_sort_arg(arg))
        return self

    def limit(self, n):
        self._limit = n
        return self

    def offset(self, n):
        self._offset = n
        return self

    def count(self):
        if not self.filters:
            return self.collection.count_documents({})
        return self.collection.count_documents(self.filters)

    def first(self):
        cursor = self.collection.find(self.filters)
        if self.sort_criteria:
            cursor = cursor.sort(self.sort_criteria)
        if self._offset is not None and self._offset > 0:
            cursor = cursor.skip(self._offset)
        doc = next(cursor, None)
        if not doc:
            return None
        obj = self.model_class.from_doc(doc)
        self.session._track(obj)
        return obj

    def all(self):
        cursor = self.collection.find(self.filters)
        if self.sort_criteria:
            cursor = cursor.sort(self.sort_criteria)
        if self._offset is not None and self._offset > 0:
            cursor = cursor.skip(self._offset)
        if self._limit is not None and self._limit > 0:
            cursor = cursor.limit(self._limit)

        results = []
        for doc in cursor:
            obj = self.model_class.from_doc(doc)
            self.session._track(obj)
            results.append(obj)
        return results

class MongoSession:
    def __init__(self, db):
        self.db = db
        self._tracked = {}
        self._new_objects = []

    def query(self, model_class):
        collection = self.db[model_class.__collection__]
        return MongoQuery(model_class, collection, self)

    def add(self, obj):
        self._new_objects.append(obj)

    def add_all(self, objs):
        for obj in objs:
            self.add(obj)

    def _track(self, obj):
        if obj and getattr(obj, "id", None) is not None:
            key = (type(obj), str(obj.id))
            self._tracked[key] = (obj, copy.deepcopy(obj.to_doc()))

    def commit(self):
        # 1. Insert/Upsert new objects
        for obj in self._new_objects:
            col = self.db[obj.__collection__]
            if getattr(obj, "id", None) is None:
                max_doc = col.find_one(sort=[("id", DESCENDING)])
                max_id = max_doc["id"] if (max_doc and isinstance(max_doc.get("id"), int)) else 0
                obj.id = max_id + 1

            doc = obj.to_doc()
            if "_id" not in doc or doc["_id"] is None:
                doc["_id"] = obj.id

            col.update_one({"_id": doc["_id"]}, {"$set": doc}, upsert=True)
            self._track(obj)
        self._new_objects.clear()

        # 2. Update modified tracked objects
        for key, (obj, original_doc) in list(self._tracked.items()):
            col = self.db[obj.__collection__]
            current_doc = obj.to_doc()
            diff = {}
            for field, val in current_doc.items():
                if field == "_id":
                    continue
                if field not in original_doc or original_doc[field] != val:
                    diff[field] = val
            if diff:
                doc_id = current_doc.get("_id") or current_doc.get("id")
                col.update_one({"_id": doc_id}, {"$set": diff})
                self._tracked[key] = (obj, copy.deepcopy(current_doc))

    def refresh(self, obj):
        col = self.db[obj.__collection__]
        doc_id = getattr(obj, "id", None)
        if doc_id is not None:
            doc = col.find_one({"_id": doc_id}) or col.find_one({"id": doc_id})
            if doc:
                for k, v in doc.items():
                    if k != "_id":
                        setattr(obj, k, v)
                self._track(obj)

    def close(self):
        self._tracked.clear()
        self._new_objects.clear()

# --- SQLITE LOCAL FALLBACK IMPLEMENTATION ---

def build_sql_where(q):
    """Translates a filter dict to SQL WHERE clause and parameter list."""
    if not q:
        return "1=1", []
    clauses = []
    params = []
    for k, v in q.items():
        col_name = "id" if k == "_id" else k
        if k == "$or":
            sub_clauses = []
            for sub_q in v:
                sc, sp = build_sql_where(sub_q)
                sub_clauses.append(f"({sc})")
                params.extend(sp)
            if sub_clauses:
                clauses.append(f"({' OR '.join(sub_clauses)})")
        elif k == "$and":
            sub_clauses = []
            for sub_q in v:
                sc, sp = build_sql_where(sub_q)
                sub_clauses.append(f"({sc})")
                params.extend(sp)
            if sub_clauses:
                clauses.append(f"({' AND '.join(sub_clauses)})")
        elif isinstance(v, dict):
            for op, val in v.items():
                if isinstance(val, (datetime, date)):
                    val = val.strftime("%Y-%m-%d %H:%M:%S")
                if op == "$gte":
                    clauses.append(f"{col_name} >= ?")
                    params.append(val)
                elif op == "$gt":
                    clauses.append(f"{col_name} > ?")
                    params.append(val)
                elif op == "$lte":
                    clauses.append(f"{col_name} <= ?")
                    params.append(val)
                elif op == "$lt":
                    clauses.append(f"{col_name} < ?")
                    params.append(val)
                elif op == "$ne":
                    clauses.append(f"{col_name} != ?")
                    params.append(val)
                elif op == "$regex":
                    clean_pat = val.replace("\\", "")
                    clauses.append(f"{col_name} LIKE ?")
                    params.append(f"%{clean_pat}%")
                elif op == "$in":
                    placeholders = ",".join(["?"] * len(val))
                    clauses.append(f"{col_name} IN ({placeholders})")
                    params.extend(val)
        else:
            if isinstance(v, (datetime, date)):
                v = v.strftime("%Y-%m-%d %H:%M:%S")
            clauses.append(f"{col_name} = ?")
            params.append(v)
    if not clauses:
        return "1=1", []
    return " AND ".join(clauses), params

class SQLiteQuery:
    def __init__(self, model_class, table_name, session):
        self.model_class = model_class
        self.table_name = table_name
        self.session = session
        self.clauses = []
        self.sort_criteria = []
        self._limit = None
        self._offset = None

    def filter(self, *clauses):
        for c in clauses:
            if isinstance(c, FilterClause):
                self.clauses.append(c.query_dict)
            elif isinstance(c, dict):
                self.clauses.append(c)
        return self

    def order_by(self, *args):
        for arg in args:
            self.sort_criteria.append(parse_sort_arg(arg))
        return self

    def limit(self, n):
        self._limit = n
        return self

    def offset(self, n):
        self._offset = n
        return self

    def _build_where(self):
        if not self.clauses:
            return "1=1", []
        parts = []
        all_params = []
        for q in self.clauses:
            sql, p = build_sql_where(q)
            parts.append(f"({sql})")
            all_params.extend(p)
        return " AND ".join(parts), all_params

    def count(self):
        where_sql, params = self._build_where()
        sql = f"SELECT COUNT(*) FROM {self.table_name} WHERE {where_sql}"
        cur = self.session.conn.cursor()
        cur.execute(sql, params)
        res = cur.fetchone()
        return res[0] if res else 0

    def first(self):
        where_sql, params = self._build_where()
        sql = f"SELECT * FROM {self.table_name} WHERE {where_sql}"
        if self.sort_criteria:
            order_parts = []
            for col, d in self.sort_criteria:
                order_parts.append(f"{col} {'DESC' if d == DESCENDING else 'ASC'}")
            sql += f" ORDER BY {', '.join(order_parts)}"
        sql += " LIMIT 1"
        cur = self.session.conn.cursor()
        cur.execute(sql, params)
        row = cur.fetchone()
        if not row:
            return None
        obj = self.model_class.from_doc(dict(row))
        self.session._track(obj)
        return obj

    def all(self):
        where_sql, params = self._build_where()
        sql = f"SELECT * FROM {self.table_name} WHERE {where_sql}"
        if self.sort_criteria:
            order_parts = []
            for col, d in self.sort_criteria:
                order_parts.append(f"{col} {'DESC' if d == DESCENDING else 'ASC'}")
            sql += f" ORDER BY {', '.join(order_parts)}"
        if self._limit is not None and self._limit > 0:
            sql += f" LIMIT {self._limit}"
        if self._offset is not None and self._offset > 0:
            if self._limit is None:
                sql += " LIMIT -1"
            sql += f" OFFSET {self._offset}"
        cur = self.session.conn.cursor()
        cur.execute(sql, params)
        rows = cur.fetchall()
        results = []
        for r in rows:
            obj = self.model_class.from_doc(dict(r))
            self.session._track(obj)
            results.append(obj)
        return results

class SQLiteSession:
    def __init__(self, db_path):
        self.db_path = db_path
        self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self._tracked = {}
        self._new_objects = []

    def query(self, model_class):
        table_name = getattr(model_class, "__collection__", "users")
        return SQLiteQuery(model_class, table_name, self)

    def add(self, obj):
        self._new_objects.append(obj)

    def add_all(self, objs):
        for obj in objs:
            self.add(obj)

    def _track(self, obj):
        if obj and getattr(obj, "id", None) is not None:
            key = (type(obj), str(obj.id))
            self._tracked[key] = (obj, copy.deepcopy(obj.to_doc()))

    def commit(self):
        cur = self.conn.cursor()
        for obj in self._new_objects:
            table_name = obj.__collection__
            doc = obj.to_doc()
            if "_id" in doc:
                del doc["_id"]
            for k, val in list(doc.items()):
                if isinstance(val, (datetime, date)):
                    doc[k] = val.strftime("%Y-%m-%d %H:%M:%S")
            if doc.get("id") is None:
                cur.execute(f"SELECT MAX(id) FROM {table_name}")
                row = cur.fetchone()
                max_id = row[0] if (row and row[0] is not None) else 0
                obj.id = max_id + 1
                doc["id"] = obj.id
            cols = list(doc.keys())
            placeholders = ",".join(["?"] * len(cols))
            col_names = ",".join(cols)
            vals = [doc[c] for c in cols]
            cur.execute(f"INSERT OR REPLACE INTO {table_name} ({col_names}) VALUES ({placeholders})", vals)
            self._track(obj)
        self._new_objects.clear()

        for key, (obj, original_doc) in list(self._tracked.items()):
            table_name = obj.__collection__
            current_doc = obj.to_doc()
            if "_id" in current_doc:
                del current_doc["_id"]
            diff = {}
            for field, val in current_doc.items():
                if field not in original_doc or original_doc[field] != val:
                    if isinstance(val, (datetime, date)):
                        diff[field] = val.strftime("%Y-%m-%d %H:%M:%S")
                    else:
                        diff[field] = val
            if diff:
                set_clauses = [f"{f} = ?" for f in diff.keys()]
                vals = list(diff.values())
                vals.append(obj.id)
                cur.execute(f"UPDATE {table_name} SET {', '.join(set_clauses)} WHERE id = ?", vals)
                self._tracked[key] = (obj, copy.deepcopy(current_doc))
        self.conn.commit()

    def refresh(self, obj):
        table_name = obj.__collection__
        if getattr(obj, "id", None) is not None:
            cur = self.conn.cursor()
            cur.execute(f"SELECT * FROM {table_name} WHERE id = ?", (obj.id,))
            row = cur.fetchone()
            if row:
                d = dict(row)
                for k, v in d.items():
                    setattr(obj, k, v)
                self._track(obj)

    def close(self):
        try:
            self.conn.close()
        except Exception:
            pass
        self._tracked.clear()
        self._new_objects.clear()

def init_sqlite_db():
    sqlite_path = get_sqlite_path()
    conn = sqlite3.connect(sqlite_path)
    try:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name VARCHAR(100),
                email VARCHAR(100) NOT NULL UNIQUE,
                password VARCHAR(200) NOT NULL,
                upi_id VARCHAR(100) NOT NULL UNIQUE,
                account_balance FLOAT DEFAULT 100000.0,
                primary_device_id VARCHAR(100),
                primary_city VARCHAR(50),
                primary_lat FLOAT,
                primary_lon FLOAT,
                avg_txn_amount FLOAT DEFAULT 1200.0,
                created_at DATETIME
            )
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS transactions (
                id VARCHAR(50) PRIMARY KEY,
                sender_upi VARCHAR(100) NOT NULL,
                receiver_upi VARCHAR(100) NOT NULL,
                receiver_name VARCHAR(100),
                amount FLOAT NOT NULL,
                remarks VARCHAR(255),
                status VARCHAR(20) NOT NULL,
                fraud_probability FLOAT NOT NULL,
                xgb_score FLOAT NOT NULL,
                autoencoder_score FLOAT NOT NULL,
                risk_level VARCHAR(20) NOT NULL,
                risk_reasons TEXT,
                shap_explanation TEXT,
                device_info TEXT,
                location_info TEXT,
                ip_address VARCHAR(50),
                timestamp DATETIME
            )
        """)
        conn.commit()
    finally:
        conn.close()

def SessionLocal():
    db = get_mongo_db()
    if db is not None:
        return MongoSession(db)
    return SQLiteSession(get_sqlite_path())

def init_db():
    db = init_mongo()
    if db is not None:
        setup_indexes()
        migrate_sqlite_to_mongodb()
    else:
        init_sqlite_db()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_db_status():
    """Returns database health metrics, connection latency, and collections status."""
    db = get_mongo_db()
    if db is not None:
        try:
            t0 = time.time()
            get_mongo_client().admin.command('ping')
            latency = round((time.time() - t0) * 1000, 1)
            u_count = db.users.count_documents({})
            t_count = db.transactions.count_documents({})
            return {
                "engine": "MongoDB Atlas",
                "connected": True,
                "database": MONGODB_DB_NAME,
                "cluster": MONGODB_URI.split("@")[-1].split("/")[0] if "@" in MONGODB_URI else "Cluster0",
                "users_count": u_count,
                "transactions_count": t_count,
                "latency_ms": latency,
                "status": "healthy"
            }
        except Exception as e:
            return {
                "engine": "MongoDB Atlas",
                "connected": False,
                "error": str(e),
                "status": "unhealthy"
            }
    else:
        u_count = 0
        t_count = 0
        try:
            s = SQLiteSession(get_sqlite_path())
            u_count = s.query(User).count()
            t_count = s.query(Transaction).count()
            s.close()
        except Exception:
            pass
        return {
            "engine": "SQLite (Local Fallback)",
            "connected": True,
            "database": "upi_fraud.db",
            "users_count": u_count,
            "transactions_count": t_count,
            "status": "healthy",
            "fallback": True,
            "mongo_error": _mongo_error
        }
