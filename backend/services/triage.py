# This file contains the code for the triage service. It will be used to triage the patient's symptoms and return the triage result.
# This file answers the question: "Given a symptom description and severity (1-10), how urgent is the situation?"

# Define the triage function
def run_triage(symptom: str, severity: int):

    symptom = symptom.lower()

    confidence = round(0.5 + (severity / 20), 2)

    if severity >= 9:
        return {
            "urgency": "HIGH",
            "reason": "Severe symptoms may indicate a potentially life-threatening condition.",
            "recommended_action": "Seek emergency medical care immediately.",
            "confidence": confidence
        }

    elif severity >= 6:
        return {
            "urgency": "MEDIUM",
            "reason": "Moderate symptoms may require medical evaluation.",
            "recommended_action": "Visit urgent care or consult a healthcare provider soon.",
            "confidence": confidence
        }

    elif severity >= 3:
        return {
            "urgency": "LOW",
            "reason": "Symptoms appear mild but should be monitored.",
            "recommended_action": "Monitor symptoms and consult a pharmacist or doctor if they worsen.",
            "confidence": confidence
        }

    else:
        return {
            "urgency": "LOW",
            "reason": "Symptoms appear very mild.",
            "recommended_action": "Rest and monitor symptoms.",
            "confidence": confidence
        }