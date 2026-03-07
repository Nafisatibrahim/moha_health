# This file contains the code for the intake service. It will be used to intake the patient's symptoms and return the intake result.

# Define the intake function
def generate_questions(symptom: str):

    if symptom == "abdominal pain":
        return [
            "Where exactly is the pain located?",
            "How severe is the pain from 1 to 10?",
            "Do you feel nausea?"
        ]

    if symptom == "chest pain":
        return [
            "Does the pain spread to your arm or jaw?",
            "Do you feel shortness of breath?",
            "How severe is the pain from 1 to 10?"
        ]

    return [
        "Where is the discomfort located?",
        "How severe is the symptom from 1 to 10?"
    ]