# Vitals-based risk escalation: adjust triage when heart rate or respiration are abnormal.
# Hospitals often escalate when HR > 110 or RR > 24.


def escalate_with_vitals(triage_result: dict, vitals: dict | None) -> dict:
    """
    If vitals indicate elevated risk (e.g. heart rate > 110, respiration > 24),
    escalate urgency to HIGH and append to reason. Returns a copy of triage_result.
    """
    if not vitals or not isinstance(triage_result, dict):
        return triage_result

    result = dict(triage_result)
    heart_rate = vitals.get("heart_rate")
    respiration = vitals.get("respiration")

    escalated = False
    reason = result.get("reason") or ""

    if heart_rate is not None and heart_rate != "not detected":
        try:
            hr = float(heart_rate)
            if hr > 110:
                result["urgency"] = "HIGH"
                result["department"] = "Emergency Medicine"
                reason = (reason.rstrip(".") + ". Elevated heart rate detected.").strip()
                escalated = True
        except (TypeError, ValueError):
            pass

    if respiration is not None and respiration != "not detected":
        try:
            rr = float(respiration)
            if rr > 24:
                result["urgency"] = "HIGH"
                result["department"] = "Emergency Medicine"
                reason = (reason.rstrip(".") + ". Rapid respiration detected.").strip()
                escalated = True
        except (TypeError, ValueError):
            pass

    if escalated:
        result["reason"] = reason
        result["priority_level"] = 1
        result["triage_message"] = f"Urgency level {result['urgency']}. Please proceed to {result['department']}."

    return result
