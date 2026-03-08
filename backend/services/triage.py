# This file contains the code for the triage service. It will be used to triage the patient's symptoms and return the triage result.
# This file answers the question: "Given a symptom description and severity (1-10), how urgent is the situation?"

from services.symptom_normalizer import normalize_symptom


def run_triage(intake_data: dict, health_profile: str = ""):
    """
    Basic rule-based triage engine.
    Uses health_profile (e.g. past surgeries) to escalate when relevant — e.g. recent surgery + return symptoms.
    """
    symptom = normalize_symptom(intake_data.get("primary_symptom", ""))
    severity = intake_data.get("severity", 0)
    if isinstance(severity, str):
        try:
            severity = int(severity)
        except (TypeError, ValueError):
            severity = 0
    location = str(intake_data.get("location", "")).lower()
    additional = str(intake_data.get("additional_symptoms", "")).lower()
    profile_lower = (health_profile or "").lower()

    urgency = "LOW"
    department = "Primary Care"
    reason = "Symptoms appear mild based on available information."

    # Context: recent surgery/operation in profile can increase risk if symptoms could be related
    has_surgery_in_profile = any(
        w in profile_lower for w in ("surgery", "operation", "procedure", "colon", "appendectomy", "hysterectomy")
    )

    # HIGH risk rules
    if symptom == "chest pain":
        urgency = "HIGH"
        department = "Emergency / Cardiology"
        reason = "Chest pain may indicate a cardiac emergency."

    elif symptom == "abdominal pain" and severity >= 7:
        urgency = "HIGH"
        department = "Emergency Medicine"
        reason = "Severe abdominal pain may indicate appendicitis or other acute conditions."

    elif "difficulty breathing" in additional:
        urgency = "HIGH"
        department = "Emergency Medicine"
        reason = "Breathing difficulty may indicate respiratory distress."

    elif severity >= 8:
        urgency = "HIGH"
        department = "Emergency Medicine"
        reason = "Very severe pain reported."

    elif has_surgery_in_profile and severity >= 5:
        urgency = "HIGH"
        department = "Emergency Medicine"
        reason = "Patient reports significant symptoms and has relevant surgical history; possible complication or recurrence — recommend evaluation."

    # MEDIUM risk rules
    elif severity >= 5:
        urgency = "MEDIUM"
        department = "Urgent Care"
        reason = "Moderate pain level reported."
    elif has_surgery_in_profile and severity >= 3:
        urgency = "MEDIUM"
        department = "Urgent Care"
        reason = "Patient has relevant surgical/medical history; symptoms warrant evaluation."

    # Priority ranking
    priority = {
        "HIGH": 1,
        "MEDIUM": 2,
        "LOW": 3
    }

    return {
    "urgency": urgency,
    "department": department,
    "reason": reason,
    "priority_level": priority[urgency],
    "triage_message": f"Urgency level {urgency}. Please proceed to {department}."
}