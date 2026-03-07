# This file contains the code for the triage service. It will be used to triage the patient's symptoms and return the triage result.

# Define the triage function
def run_triage(symptom: str, severity: int):
    """
    Basic triage rules.
    """

    if symptom == "chest pain" and severity >= 7:
        return {
            "urgency": "HIGH",
            "reason": "Severe chest pain may indicate a cardiac emergency.",
            "recommended_action": "Go to the Emergency Room immediately.",
            "confidence": 0.92
        }

    if symptom == "abdominal pain" and severity >= 6:
        return {
            "urgency": "MEDIUM",
            "reason": "Severe abdominal pain may require urgent medical evaluation.",
            "recommended_action": "Visit urgent care or call telehealth.",
            "confidence": 0.78
        }

    return {
        "urgency": "LOW",
        "reason": "Symptoms appear mild.",
        "recommended_action": "Monitor symptoms or consult a pharmacist.",
        "confidence": 0.60
    }