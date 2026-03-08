# This file contains the code for the Backboard client.
# It handles communication with the Backboard API and loads prompts.

# Import the necessary libraries
import os
from pathlib import Path
import requests
from dotenv import load_dotenv, set_key

# Load environment variables
load_dotenv()

API_KEY = os.getenv("BACKBOARD_API_KEY")
BASE_URL = os.getenv("BACKBOARD_BASE_URL", "https://app.backboard.io/api")
ASSISTANT_ID = os.getenv("BACKBOARD_ASSISTANT_ID")

# Per-role assistant IDs (general, dermatology, dental, cardiology)
ASSISTANT_IDS = {}

HEADERS = {
    "X-API-Key": API_KEY
}

# Load prompt from the prompts directory
def load_prompt(prompt_name: str) -> str:
    prompt_path = Path(__file__).parent.parent / "prompts" / prompt_name

    with open(prompt_path, "r", encoding="utf-8") as f:
        return f.read()


def _env_key_for_role(role: str) -> str:
    return f"BACKBOARD_ASSISTANT_ID_{role.upper()}"


def get_or_create_assistant(role: str = "general"):
    """
    Get or create a Backboard assistant for the given role.
    role: "general", "dermatology", or "dental".
    """
    global ASSISTANT_IDS, ASSISTANT_ID

    if role not in ASSISTANT_IDS:
        env_key = _env_key_for_role(role)
        existing = os.getenv(env_key)
        if role == "general" and not existing and ASSISTANT_ID:
            existing = ASSISTANT_ID
        if existing:
            ASSISTANT_IDS[role] = existing
            return existing

        if role == "general":
            system_prompt = load_prompt("general_physician_prompt.txt")
            name = "HackCanada-General"
        elif role == "dermatology":
            system_prompt = (
                "You are a dermatology expert assistant in hospital intake. "
                "Ask focused questions about location, spread, duration, itching/pain; "
                "if no symptom photo was shared, ask the patient to upload one. "
                "Do not give treatment advice. Be concise. Respond only in the user's language."
            )
            name = "HackCanada-Dermatology"
        elif role == "dental":
            system_prompt = (
                "You are a dental expert assistant in hospital intake. "
                "Ask focused questions about which tooth/area, pain type, swelling, trauma. "
                "Do not give treatment advice. Be concise. Respond only in the user's language."
            )
            name = "HackCanada-Dental"
        elif role == "cardiology":
            system_prompt = (
                "You are a cardiology expert assistant in hospital intake. "
                "Ask about chest discomfort type, radiation, shortness of breath, duration, cardiac history. "
                "Do not request a photo. Do not give treatment advice. Be concise. Respond only in the user's language."
            )
            name = "HackCanada-Cardiology"
        else:
            system_prompt = load_prompt("general_physician_prompt.txt")
            name = f"HackCanada-{role.title()}"

        payload = {
            "name": name,
            "system_prompt": system_prompt,
            "model": "gemini-2.5-pro",
            "tools": [],
        }

        response = requests.post(
            f"{BASE_URL}/assistants",
            json=payload,
            headers=HEADERS,
        )
        response.raise_for_status()
        assistant_id = response.json()["assistant_id"]
        ASSISTANT_IDS[role] = assistant_id

        env_path = Path(__file__).resolve().parent.parent.parent / ".env"
        set_key(env_path, env_key, assistant_id)
        if role == "general":
            ASSISTANT_ID = assistant_id

    return ASSISTANT_IDS[role]


def create_thread(assistant_id=None, role: str = "general"):
    """
    Create a Backboard thread. If assistant_id is given, use it; else use assistant for role (default general).
    """
    if assistant_id is None:
        assistant_id = get_or_create_assistant(role=role)
    response = requests.post(
        f"{BASE_URL}/assistants/{assistant_id}/threads",
        json={},
        headers=HEADERS,
    )
    response.raise_for_status()
    return response.json()["thread_id"]

# Upload a document (e.g. symptom image) to the thread for RAG/context. Supports images: .png, .jpg, .jpeg, .webp, etc.
def upload_document_to_thread(thread_id: str, image_url: str) -> bool:
    """Fetch image from URL and upload to Backboard thread. Returns True on success."""
    try:
        r = requests.get(image_url, timeout=30)
        r.raise_for_status()
        content_type = r.headers.get("content-type", "").lower()
        ext = ".jpg"
        if "png" in content_type:
            ext = ".png"
        elif "webp" in content_type:
            ext = ".webp"
        elif "gif" in content_type:
            ext = ".gif"
        filename = f"symptom_image{ext}"
        files = {"file": (filename, r.content, content_type or "image/jpeg")}
        resp = requests.post(
            f"{BASE_URL}/threads/{thread_id}/documents",
            headers=HEADERS,
            files=files,
            timeout=60,
        )
        resp.raise_for_status()
        return True
    except Exception:
        return False


# Send a message to the assistant
def send_message(thread_id, message):
    response = requests.post(
        f"{BASE_URL}/threads/{thread_id}/messages",
        headers=HEADERS,
        data={"content": message, "stream": "false"},
        timeout=60,
    )

    # Surface HTTP errors (rate limit, auth, etc.)
    try:
        response.raise_for_status()
    except requests.RequestException as e:
        raise RuntimeError(
            f"Backboard API error {response.status_code}: {response.text}"
        ) from e

    data = response.json()

    # Backboard may return content in different shapes
    content = data.get("content")
    if content is not None:
        return content

    # Some APIs return the assistant message in a "message" or "messages" array
    msg = data.get("message")
    if isinstance(msg, dict) and msg.get("content"):
        return msg["content"]

    messages = data.get("messages")
    if isinstance(messages, list) and messages:
        last = messages[-1]
        if isinstance(last, dict) and last.get("role") == "assistant":
            content = last.get("content")
            if content is not None:
                return content

    # Log raw response when content is missing (helps debug API/model changes)
    import logging
    logging.warning(
        "Backboard returned no 'content'. Full response: %s",
        data,
    )
    return None