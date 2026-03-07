# This file contains the code for the extraction service. It will be used to extract the symptoms from the patient's symptoms and return the extracted symptoms.

# Define the extraction function
def extract_symptoms(text: str):

    text = text.lower()

    if "chest pain" in text:
        return {
            "symptom": "chest pain",
            "severity": 8
        }

    if "stomach" in text or "abdominal" in text:
        return {
            "symptom": "abdominal pain",
            "severity": 6
        }

    return {
        "symptom": "unknown",
        "severity": 3
    }