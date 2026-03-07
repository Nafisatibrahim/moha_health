# This file contains the code for the triage service. It will be used to triage the patient's symptoms and return the triage result.
# This file answers the question: "Given a symptom description and severity (1-10), how urgent is the situation?"

from services.symptom_normalizer import normalize_symptom


def run_triage(intake_data: dict):
    """
    Basic rule-based triage engine.
    Returns urgency level and department.
    """
    symptom = normalize_symptom(intake_data.get("primary_symptom", ""))
    severity = intake_data.get("severity", 0)
    location = str(intake_data.get("location", "")).lower()
    additional = str(intake_data.get("additional_symptoms", "")).lower()

    urgency = "LOW"
    department = "Primary Care"
    reason = "Symptoms appear mild based on available information."

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

    # MEDIUM risk rules
    elif severity >= 5:
        urgency = "MEDIUM"
        department = "Urgent Care"
        reason = "Moderate pain level reported."

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