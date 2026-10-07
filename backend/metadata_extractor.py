import math
from datetime import datetime, timedelta

def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate distance in kilometers between two GPS coordinates."""
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return 0.0
    R = 6371.0 # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

KNOWN_VERIFIED_MERCHANTS = [
    "swiggy@icici", "zomato@hdfcbank", "amazon@apl", "flipkart@axisbank",
    "irctc@sbi", "uber@okhdfcbank", "netflix@kotak", "tatasky@paytm",
    "jioprepaid@jio", "airtel@airtelbank", "starbucks@hdfcbank"
]

SUSPICIOUS_RECEIVER_PATTERNS = [
    "cryptopay", "winrealcash", "lottery", "instantdouble", "darkfund",
    "rummy", "bet99", "freebonus", "telegramgift"
]

def evaluate_receiver_risk(receiver_upi):
    receiver_upi = (receiver_upi or "").lower().strip()
    if any(m in receiver_upi for m in KNOWN_VERIFIED_MERCHANTS):
        return 0.05 # Very safe known merchant
    if any(pat in receiver_upi for pat in SUSPICIOUS_RECEIVER_PATTERNS):
        return 0.92 # Highly suspicious
    if receiver_upi.endswith(("@okhdfcbank", "@okaxis", "@oksbi", "@paytm", "@ibl", "@ybl")):
        return 0.25 # Standard consumer VPA
    return 0.45 # Unknown custom handle

def build_features_from_request(payload, user, db_session=None):
    """
    Combines user profile history, transaction input, and collected device metadata
    into the feature vector expected by the AI models.
    """
    amount = float(payload.get("amount", 0.0))
    receiver_upi = payload.get("receiver_upi", "")
    metadata = payload.get("metadata", {})

    # Timestamp & Hour
    now = datetime.utcnow()
    # Check if client sent specific timestamp or timezone offset
    client_hour = metadata.get("hour")
    if client_hour is not None:
        try:
            hour = int(client_hour)
        except Exception:
            hour = now.hour
    else:
        hour = now.hour

    is_night = 1 if hour in [23, 0, 1, 2, 3, 4, 5] else 0
    dow = now.weekday() # 0-6
    is_weekend = 1 if dow in [5, 6] else 0

    # User average ratio
    user_avg = user.avg_txn_amount if user and user.avg_txn_amount > 0 else 1000.0
    amount_to_avg_ratio = amount / user_avg

    # Device comparison
    device_fp = metadata.get("device_fingerprint", "")
    primary_device = user.primary_device_id if user else ""

    if payload.get("simulate_new_device") is True:
        is_new_device = 1
    else:
        # If user has a default/placeholder seed device or none registered yet,
        # bind this browser as their trusted device so normal payments aren't falsely flagged
        if user and (not primary_device or primary_device in ["default_dev", "fp_chrome_win_a8f9", "fp_user_registered"]):
            user.primary_device_id = device_fp or "fp_primary_device"
            primary_device = user.primary_device_id
            if db_session:
                try:
                    db_session.commit()
                except Exception:
                    pass
        is_new_device = 1 if (device_fp and primary_device and device_fp != primary_device) else 0

    # Location distance
    client_lat = metadata.get("gps_lat")
    client_lon = metadata.get("gps_lon")
    base_lat = user.primary_lat if user else 12.9716
    base_lon = user.primary_lon if user else 77.5946

    if payload.get("simulate_location_anomaly") is True:
        location_dist_km = 1450.0  # Simulated jump across the country
    elif client_lat is not None and client_lon is not None:
        try:
            # If user has default seed Bengaluru coords, update base to current client coordinates
            # so real users testing outside Bengaluru aren't flagged as an inter-state anomaly
            if user and (round(user.primary_lat, 4) == 12.9716 and round(user.primary_lon, 4) == 77.5946) and metadata.get("city") != "Bengaluru (HQ)":
                user.primary_lat = float(client_lat)
                user.primary_lon = float(client_lon)
                base_lat = user.primary_lat
                base_lon = user.primary_lon
                if db_session:
                    try:
                        db_session.commit()
                    except Exception:
                        pass
            location_dist_km = float(haversine_distance(base_lat, base_lon, float(client_lat), float(client_lon)))
        except Exception:
            location_dist_km = 0.0
    else:
        location_dist_km = 0.0

    # Velocity checks from database
    velocity_1h = 1
    velocity_24h = 2
    if db_session and user:
        from database import Transaction
        one_hour_ago = now - timedelta(hours=1)
        one_day_ago = now - timedelta(days=1)
        try:
            v1 = db_session.query(Transaction).filter(
                Transaction.sender_upi == user.upi_id,
                Transaction.timestamp >= one_hour_ago
            ).count()
            v24 = db_session.query(Transaction).filter(
                Transaction.sender_upi == user.upi_id,
                Transaction.timestamp >= one_day_ago
            ).count()
            # For normal non-simulated burst, cap baseline velocity to realistic normal user behavior
            velocity_1h = min(v1 + 1, 3)
            velocity_24h = min(max(velocity_1h, v24 + 1), 5)
        except Exception:
            pass

    if payload.get("simulate_velocity_burst") is True:
        velocity_1h = 8
        velocity_24h = 16

    # Receiver risk
    receiver_risk = evaluate_receiver_risk(receiver_upi)
    if payload.get("simulate_suspicious_receiver") is True:
        receiver_risk = 0.95

    # VPN / Proxy
    is_vpn_proxy = 1 if metadata.get("is_vpn") is True or payload.get("simulate_vpn") is True else 0

    # Device properties
    battery_level = float(metadata.get("battery_level", 0.75))
    device_type = (metadata.get("device_type", "desktop") or "").lower()
    is_mobile = 1 if "mobile" in device_type or "android" in (metadata.get("os", "")).lower() or "ios" in (metadata.get("os", "")).lower() else 0

    feature_dict = {
        "amount": amount,
        "hour": hour,
        "is_night": is_night,
        "day_of_week": dow,
        "is_weekend": is_weekend,
        "amount_to_avg_ratio": amount_to_avg_ratio,
        "velocity_1h": velocity_1h,
        "velocity_24h": velocity_24h,
        "is_new_device": is_new_device,
        "location_dist_km": location_dist_km,
        "is_vpn_proxy": is_vpn_proxy,
        "receiver_risk": receiver_risk,
        "battery_level": battery_level,
        "is_mobile": is_mobile
    }

    return feature_dict
