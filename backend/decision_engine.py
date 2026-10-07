def evaluate_decision(ai_result, user_balance, amount):
    """
    Synthesizes AI models (XGBoost + Autoencoder), rules, and balances
    into the final transaction decision.
    """
    fraud_prob = ai_result["fraud_probability"]
    reasons = list(ai_result.get("reasons", []))

    # Balance check
    if amount > user_balance:
        return {
            "decision": "BLOCKED",
            "risk_level": "HIGH",
            "status_code": "INSUFFICIENT_FUNDS",
            "suggested_action": "Add Funds to Simulated Account",
            "reasons": ["Transaction Amount exceeds available balance"] + reasons
        }

    # Fraud thresholds
    is_amount_spike = amount >= 25000 or any("Amount Spike" in r for r in reasons)
    if fraud_prob >= 0.65:
        risk_level = "HIGH"
        decision = "BLOCKED"
        suggested_action = "OTP Verification Required"
    elif fraud_prob >= 0.35 or is_amount_spike:
        risk_level = "MEDIUM"
        decision = "BLOCKED" # Require step-up verification
        suggested_action = "Step-up OTP Verification"
    else:
        risk_level = "LOW"
        decision = "APPROVED"
        suggested_action = "None"

    return {
        "decision": decision,
        "risk_level": risk_level,
        "suggested_action": suggested_action,
        "reasons": reasons
    }
