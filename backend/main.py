# This file contains the code for the main application. It will be used to run the application.

# Import the necessary libraries
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
from integrations.backboard_client import (
    create_thread,
    send_message
)

from services.intake import (
    get_question,    # Get next intake question
    store_answer,    # Store patient answers
    get_step,        # Get current intake step
    advance_step,    # Advance to next intake step
    get_intake_data  # Retrieve collected intake data
)

# Add CORS middleware
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Create a thread
thread_id = create_thread()

# Define the assess endpoint
@app.post("/assess")
def assess(data: dict):

    text = data["text"]

    step = get_step(thread_id)

    question_data = get_question(step)

    # If intake questions remain
    if question_data:

        key, question = question_data

        # Store the user's previous answer (if not first step)
        if step > 0:
            previous_key = get_question(step - 1)[0]
            store_answer(thread_id, previous_key, text)

        advance_step(thread_id)

        return {
            "intake_question": question
        }

    # Intake finished → send structured data to AI
    intake_data = get_intake_data(thread_id)

    message = f"""
    Patient Intake Report

    Location: {intake_data.get("location")}
    Severity: {intake_data.get("severity")}
    Duration: {intake_data.get("duration")}
    Additional Symptoms: {intake_data.get("additional_symptoms")}

    Use the triage_tool to determine urgency.
    """

    response = send_message(thread_id, message)

    return {
        "intake_data": intake_data,
        "assistant_response": response
    }