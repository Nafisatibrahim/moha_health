# This file contains the code for the main application. It will be used to run the application.

# Import the necessary libraries
from fastapi import FastAPI
from integrations.backboard_client import (
    create_assistant,
    create_thread,
    send_message
)

# Define the FastAPI app
app = FastAPI()

# Create the assistant and thread
assistant_id = create_assistant()
thread_id = create_thread(assistant_id)

# Define the assess endpoint
@app.post("/assess")
def assess(data: dict):

    text = data["text"]

    response = send_message(thread_id, text)

    return {
        "input_text": text,
        "assistant_response": response
    }