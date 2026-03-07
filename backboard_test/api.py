from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class PatientInput(BaseModel):
    symptom: str
    severity: int


class TextInput(BaseModel):
    text: str


def run_triage(symptom, severity):
    symptom = (symptom or "").lower().strip()

    if symptom == "chest pain" and severity >= 7:
        return {
            "urgency": "HIGH",
            "reason": "Severe chest pain may indicate a heart attack or other cardiac emergency.",
            "confidence": 0.92,
            "action": "Go to the Emergency Room immediately."
        }

    if symptom == "abdominal pain" and severity >= 6:
        return {
            "urgency": "MEDIUM",
            "reason": "Severe abdominal pain could indicate appendicitis or another urgent condition.",
            "confidence": 0.78,
            "action": "Seek urgent medical care within 24 hours."
        }

    return {
        "urgency": "LOW",
        "reason": "Symptoms appear mild and may not require immediate medical attention.",
        "confidence": 0.65,
        "action": "Monitor symptoms or consult a pharmacist or family doctor."
    }


@app.post("/triage")
def triage_patient(data: PatientInput):

    result = run_triage(data.symptom, data.severity)

    return {
        "symptom": data.symptom,
        "severity": data.severity,
        "triage_result": result
    }


@app.post("/extract")
def extract_symptoms(data: TextInput):

    text = data.text.lower()

    if "chest pain" in text:
        symptom = "chest pain"
        severity = 8

    elif "stomach" in text or "abdomen" in text:
        symptom = "abdominal pain"
        severity = 6

    else:
        symptom = "unknown"
        severity = 3

    return {
        "symptom": symptom,
        "severity": severity
    }


@app.post("/assess")
def assess_patient(data: TextInput):

    # Step 1 — extract symptoms
    extracted = extract_symptoms(data)

    symptom = extracted["symptom"]
    severity = extracted["severity"]

    # Step 2 — run triage
    triage_result = run_triage(symptom, severity)

    urgency = triage_result["urgency"]

    # Step 3 — recommend care
    care_recommendation = recommend_care(urgency)

    explanation = f"""
Based on the symptoms described, the system classified this case as {triage_result['urgency']} risk.

Reason: {triage_result['reason']}

Recommended action: {triage_result['action']}

Confidence level: {triage_result['confidence']}
"""

    return {
        "input_text": data.text,
        "extracted_data": extracted,
        "triage_result": triage_result,
        "care_recommendation": care_recommendation
    }


def recommend_care(urgency):

    if urgency == "HIGH":
        return {
            "recommended_action": "Go to the Emergency Room immediately",
            "care_options": [
                "Emergency Room",
                "Call 911 if symptoms worsen"
            ]
        }

    elif urgency == "MEDIUM":
        return {
            "recommended_action": "Seek medical attention within 24 hours",
            "care_options": [
                "Urgent Care Clinic",
                "Walk-in Clinic",
                "Call Telehealth Ontario (811)"
            ]
        }

    else:
        return {
            "recommended_action": "Monitor symptoms",
            "care_options": [
                "Pharmacist consultation",
                "Family doctor appointment",
                "Call Telehealth Ontario (811)"
            ]
        }


class SymptomInput(BaseModel):
    symptom: str


@app.post("/intake")
def intake_questions(data: SymptomInput):

    symptom = data.symptom.lower()

    if "stomach" in symptom or "abdominal" in symptom:
        questions = [
            "Where exactly is the pain located?",
            "How severe is the pain on a scale of 1–10?",
            "Do you feel nausea or vomiting?",
            "How long have you been experiencing the pain?"
        ]

    elif "chest" in symptom:
        questions = [
            "How severe is the chest pain (1–10)?",
            "Did the pain start suddenly?",
            "Does the pain spread to your arm, jaw, or back?",
            "Do you feel shortness of breath?"
        ]

    elif "headache" in symptom:
        questions = [
            "How severe is the headache (1–10)?",
            "Did it start suddenly?",
            "Do you have vision problems or dizziness?",
            "Do you have nausea?"
        ]

    else:
        questions = [
            "Where is the pain located?",
            "How severe is it (1–10)?",
            "When did the symptoms start?"
        ]

    return {
        "symptom": data.symptom,
        "follow_up_questions": questions
    }

