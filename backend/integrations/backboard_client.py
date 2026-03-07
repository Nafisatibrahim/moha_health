# This file contains the code for the Backboard client.
# It handles communication with the Backboard API and loads prompts.

# Import the necessary libraries
import os
from pathlib import Path
import requests
from dotenv import load_dotenv, set_key
from tools.triage_tool import triage_tool # Import the triage tool
#from tools.extraction_tool import extraction_tool # Import the extraction tool
#from tools.intake_tool import intake_tool # Import the intake tool

# Load environment variables
load_dotenv()

API_KEY = os.getenv("BACKBOARD_API_KEY")
BASE_URL = os.getenv("BACKBOARD_BASE_URL", "https://app.backboard.io/api")
ASSISTANT_ID = os.getenv("BACKBOARD_ASSISTANT_ID")

HEADERS = {
    "X-API-Key": API_KEY
}

# Load prompt from the prompts directory
def load_prompt(prompt_name: str) -> str:
    prompt_path = Path(__file__).parent.parent / "prompts" / prompt_name

    with open(prompt_path, "r", encoding="utf-8") as f:
        return f.read()

# Create Backboard assistant
def get_or_create_assistant():

    global ASSISTANT_ID

    if ASSISTANT_ID:
        return ASSISTANT_ID

    system_prompt = load_prompt("triage_prompt.txt")

    payload = {
        "name": "HackCanada-Triage",
        "system_prompt": system_prompt,
        "model": "gemini-1.5-pro",
        "tools": [
            {
                "name": "triage_tool",
                "description": "Determine medical urgency based on symptom and severity.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "symptom": {
                            "type": "string"
                        },
                        "severity": {
                            "type": "integer"
                        }
                    },
                    "required": ["symptom", "severity"]
                }
            }
        ]
    }

    response = requests.post(
        f"{BASE_URL}/assistants",
        json=payload,
        headers=HEADERS
    )

    assistant_id = response.json()["assistant_id"]

    # Save assistant ID to .env so we reuse it
    env_path = Path(__file__).resolve().parent.parent.parent / ".env"
    set_key(env_path, "BACKBOARD_ASSISTANT_ID", assistant_id)

    ASSISTANT_ID = assistant_id

    return assistant_id

# Create a conversation thread
def create_thread():

    assistant_id = get_or_create_assistant()

    response = requests.post(
        f"{BASE_URL}/assistants/{assistant_id}/threads",
        json={},
        headers=HEADERS
    )

    return response.json()["thread_id"]

# Send a message to the assistant
def send_message(thread_id, message):

    response = requests.post(
        f"{BASE_URL}/threads/{thread_id}/messages",
        headers=HEADERS,
        data={"content": message, "stream": "false"}
    )

    return response.json().get("content")