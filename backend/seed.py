import json
import random
from datetime import datetime, timedelta
from database import SessionLocal, init_db, User, Transaction

def seed_database():
    init_db()
    db = SessionLocal()

    # Create default demo user if not exists
    user = db.query(User).filter(User.email == "demo@aegispay.com").first()
    if not user:
        user = User(
            full_name="Aman Sharma",
            email="demo@aegispay.com",
            password="password123",
            upi_id="amansharma@aegis",
            account_balance=85420.50,
            primary_device_id="fp_chrome_win_a8f9",
            primary_city="Bengaluru, Karnataka",
            primary_lat=12.9716,
            primary_lon=77.5946,
            avg_txn_amount=1250.0
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print("Default user created: demo@aegispay.com / password123")

    # If transactions already exist, skip
    count = db.query(Transaction).count()
    if count >= 15:
        db.close()
        return

    print("Seeding realistic sample transactions...")
    sample_receivers = [
        {"vpa": "swiggy@icici", "name": "Swiggy Food Delivery", "safe": True, "amt_range": (150, 850)},
        {"vpa": "zomato@hdfcbank", "name": "Zomato Dine", "safe": True, "amt_range": (300, 1400)},
        {"vpa": "amazon@apl", "name": "Amazon India", "safe": True, "amt_range": (450, 4200)},
        {"vpa": "priya.sharma@okaxis", "name": "Priya Sharma (Friend)", "safe": True, "amt_range": (500, 3000)},
        {"vpa": "uber@okhdfcbank", "name": "Uber India Rides", "safe": True, "amt_range": (120, 680)},
        {"vpa": "tatasky@paytm", "name": "Tata Play DTH", "safe": True, "amt_range": (350, 800)},
        {"vpa": "starbucks@hdfcbank", "name": "Starbucks Coffee", "safe": True, "amt_range": (350, 950)},
        {"vpa": "unknown_crypto_p2p@airtel", "name": "Cryptonex Quick P2P", "safe": False, "amt_range": (45000, 98000)},
        {"vpa": "winrealcash99@telegramgift", "name": "Mega Lottery Jackpot Win", "safe": False, "amt_range": (25000, 65000)},
        {"vpa": "unverified_vpn_drain@ibl", "name": "Anonymous Digital Transfer", "safe": False, "amt_range": (72000, 95000)},
    ]

    base_time = datetime.utcnow()
    transactions = []

    for i in range(25):
        # 4 fraud, 21 safe
        is_fraud = (i % 6 == 0)
        rec = random.choice([r for r in sample_receivers if r["safe"] != is_fraud])
        
        amount = round(random.uniform(*rec["amt_range"]), 2)
        days_ago = random.randint(0, 6)
        hours_ago = random.randint(0, 23)
        txn_time = base_time - timedelta(days=days_ago, hours=hours_ago, minutes=random.randint(5, 55))

        if is_fraud:
            status = "BLOCKED"
            risk_level = "HIGH"
            fraud_prob = round(random.uniform(0.78, 0.96), 4)
            xgb_s = round(random.uniform(0.75, 0.95), 4)
            ae_s = round(random.uniform(0.70, 0.92), 4)
            reasons = [
                f"High Amount Spike (₹{amount:,.2f})",
                "Unrecognized New Device Fingerprint",
                "Anomalous Location (> 800 km jump)",
                "Night Transaction Pattern"
            ]
        else:
            status = "APPROVED"
            risk_level = "LOW"
            fraud_prob = round(random.uniform(0.02, 0.18), 4)
            xgb_s = round(random.uniform(0.01, 0.15), 4)
            ae_s = round(random.uniform(0.05, 0.22), 4)
            reasons = [
                "Verified Device & Known Hardware Fingerprint",
                "Within Typical Spending Pattern",
                "Consistent Geolocation Profile"
            ]

        txn_id = f"UPI-2026-{10000 + i}"
        device_meta = {
            "browser": "Chrome 128",
            "os": "Windows 11" if not is_fraud else "Unknown Linux Headless",
            "device_fingerprint": user.primary_device_id if not is_fraud else "fp_rogue_emul_9921",
            "screen_resolution": "1920x1080",
            "timezone": "Asia/Kolkata",
            "network_type": "4g"
        }
        loc_meta = {
            "city": "Bengaluru" if not is_fraud else "Kolkata (Proxy)",
            "lat": 12.9716 if not is_fraud else 22.5726,
            "lon": 77.5946 if not is_fraud else 88.3639
        }

        # Simulated SHAP
        shap_data = {
            "base_value": -2.8,
            "features": [
                {"label": "Transaction Amount (₹)", "percentage": 34.5 if is_fraud else -22.0, "impact": "INCREASES_RISK" if is_fraud else "DECREASES_RISK"},
                {"label": "Unrecognized / New Device", "percentage": 24.0 if is_fraud else -18.5, "impact": "INCREASES_RISK" if is_fraud else "DECREASES_RISK"},
                {"label": "Location Distance Jump", "percentage": 18.2 if is_fraud else -12.0, "impact": "INCREASES_RISK" if is_fraud else "DECREASES_RISK"},
                {"label": "Night Transaction (11PM-5AM)", "percentage": 12.5 if is_fraud else -15.0, "impact": "INCREASES_RISK" if is_fraud else "DECREASES_RISK"},
                {"label": "Receiver Risk Profile", "percentage": 10.8 if is_fraud else -32.5, "impact": "INCREASES_RISK" if is_fraud else "DECREASES_RISK"}
            ]
        }

        txn = Transaction(
            id=txn_id,
            sender_upi=user.upi_id,
            receiver_upi=rec["vpa"],
            receiver_name=rec["name"],
            amount=amount,
            remarks="Payment simulation",
            status=status,
            fraud_probability=fraud_prob,
            xgb_score=xgb_s,
            autoencoder_score=ae_s,
            risk_level=risk_level,
            risk_reasons=json.dumps(reasons),
            shap_explanation=json.dumps(shap_data),
            device_info=json.dumps(device_meta),
            location_info=json.dumps(loc_meta),
            ip_address="192.168.1.104" if not is_fraud else "185.220.101.5",
            timestamp=txn_time
        )
        transactions.append(txn)

    db.add_all(transactions)
    db.commit()
    db.close()
    print("Database successfully seeded with realistic transactions!")

if __name__ == "__main__":
    seed_database()
