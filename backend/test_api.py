import urllib.request
import json

def test_pay(title, payload):
    req = urllib.request.Request(
        'http://127.0.0.1:5000/api/payment',
        data=json.dumps(payload).encode(),
        headers={'Content-Type': 'application/json'}
    )
    res = urllib.request.urlopen(req)
    data = json.loads(res.read().decode())
    print(f"=== {title} ===")
    print("Transaction ID:", data['transaction_id'])
    print("Decision Status:", data['status'])
    print(f"Fraud Probability: {data['fraud_percentage']}% ({data['risk_level']} RISK)")
    print("XGBoost Score:", data['xgb_score'])
    print("Autoencoder Score:", data['autoencoder_score'])
    print("Identified Reasons:", data['reasons'])
    print("Top SHAP Contributions:")
    for f in data['shap_features'][:4]:
        print(f"  - {f['label']}: {f['formatted_pct']} ({f['impact']})")
    print()

test_pay("Safe Grocery Payment", {
    "sender_upi": "amansharma@aegis",
    "receiver_upi": "swiggy@icici",
    "receiver_name": "Swiggy",
    "amount": 350.0,
    "metadata": {
        "browser": "Chrome",
        "os": "Windows 11",
        "device_fingerprint": "dev_default_desktop",
        "hour": 14
    }
})

test_pay("Midnight Account Takeover Anomaly", {
    "sender_upi": "amansharma@aegis",
    "receiver_upi": "unknown_crypto_p2p@airtel",
    "receiver_name": "Crypto P2P Desk",
    "amount": 85000.0,
    "simulate_new_device": True,
    "simulate_location_anomaly": True,
    "simulate_suspicious_receiver": True,
    "metadata": {
        "hour": 3,
        "is_vpn": True
    }
})
