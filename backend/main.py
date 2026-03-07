# This file contains the code for the main application. It will be used to run the application.

# Import the necessary libraries
from fastapi.middleware.cors import CORSMiddleware
import json
from fastapi import FastAPI
from integrations.backboard_client import (
    create_thread,     # Create a thread
    send_message,       # Send a message to the thread
    load_prompt         # Load a prompt
)

from services.intake import (
    store_answer,       # Store patient answers
    get_intake_data,    # Retrieve collected intake data
    get_missing_fields, # Check what intake information is still missing
    is_intake_complete, # Check if intake is complete    
    store_last_question, # Store the last question asked
    get_last_question    # Get the last question asked
)

from services.extraction import extract_intake_field

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

    # Get the user's message
    text = data["text"]

    # Get the collected intake data
    intake_data = get_intake_data(thread_id)

    # If no data yet → store the primary symptom
    if "primary_symptom" not in intake_data:
        store_answer(thread_id, "primary_symptom", text)

    # If data already exists, extract structured field from user answer
    else:
        # Extract structured field from user answer
        parsed = extract_intake_field(thread_id, text) 

        # If the extraction is successful, store the answer
        if parsed:
            field = parsed.get("field")
            value = parsed.get("value")

            if field and value:
                # Clamp severity values
                if field == "severity":
                    try:
                        value = int(value)
                        value = max(1, min(10, value))
                    except:
                        pass

                store_answer(thread_id, field, value)

    # Refresh the collected intake data just in case it's outdated
    intake_data = get_intake_data(thread_id)

    # Check missing intake fields
    missing_fields = get_missing_fields(thread_id)

    # Primary symptom is already known, remove it from missing fields
    missing_fields = [f for f in missing_fields if f != "primary_symptom"]

    # Get the last question asked
    last_question = get_last_question(thread_id)

    # If intake is not complete → ask AI to generate next question
    if not is_intake_complete(thread_id):
        # Load the intake question prompt
        prompt_template = load_prompt("intake_question_prompt.txt")

        # Format the prompt with the intake data
        message = prompt_template.format(
            primary_symptom=intake_data.get("primary_symptom"),
            intake_data=intake_data,
            missing_fields=missing_fields,
            last_question=last_question
        )

        response = send_message(thread_id, message)
        if response is None:
            response = "[No response from assistant. Check backend logs and Backboard API.]"

        # Store the last question asked
        store_last_question(thread_id, response)

        return {
            "intake_data": intake_data,
            "assistant_question": response
        }

    # Intake complete → run triage
    message = f"""
    Patient Intake Report:

    {intake_data}

    Determine:

    1. Urgency level (LOW, MEDIUM, HIGH)
    2. Recommended department
    3. Recommended action

    Use the triage_tool if necessary.
    """

    response = send_message(thread_id, message)
    if response is None:
        response = "[No response from assistant. Check backend logs and Backboard API.]"

    return {
        "intake_data": intake_data,
        "assistant_response": response
    }