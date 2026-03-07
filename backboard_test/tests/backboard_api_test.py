import os
from pathlib import Path
import requests
from dotenv import load_dotenv

# Load .env from project root
_env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=_env_path)

API_KEY = os.getenv("BACKBOARD_API_KEY")
if not API_KEY:
    raise ValueError("BACKBOARD_API_KEY not set. Add it to your .env file.")

BASE_URL = os.getenv("BACKBOARD_BASE_URL", "https://app.backboard.io/api")

HEADERS = {
    "X-API-Key": API_KEY,
    "Content-Type": "application/json"
}

print("Using Backboard API:", BASE_URL)


# Helper to check API responses
def check_response(response):
    if response.status_code != 200:
        print("Error:", response.status_code)
        print(response.text)
        response.raise_for_status()
    return response.json()


# 1️⃣ Create assistant
assistant_payload = {
    "name": "Hack Canada Triage Assistant",
    "system_prompt": "You are a medical triage assistant that helps evaluate symptoms."
}

response = requests.post(
    f"{BASE_URL}/assistants",
    json=assistant_payload,
    headers=HEADERS,
)

assistant_data = check_response(response)
assistant_id = assistant_data["assistant_id"]

print("Assistant created:", assistant_id)


# 2️⃣ Create thread
response = requests.post(
    f"{BASE_URL}/assistants/{assistant_id}/threads",
    json={},
    headers=HEADERS,
)

thread_data = check_response(response)
thread_id = thread_data["thread_id"]

print("Thread created:", thread_id)


# 3️⃣ Send message
message_payload = {
    "content": "I have severe chest pain and shortness of breath",
    "stream": False
}

response = requests.post(
    f"{BASE_URL}/threads/{thread_id}/messages",
    json=message_payload,
    headers=HEADERS,
)

message_data = check_response(response)

print("\nAssistant response:")
print(message_data.get("content"))