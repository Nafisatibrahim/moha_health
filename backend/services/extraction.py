# This file extracts structured intake information from user responses

# Import the necessary libraries
import json
from integrations.backboard_client import send_message, create_thread, load_prompt


def extract_intake_field(thread_id: str, user_input: str):
    """
    Use Gemini to extract which intake field the user response belongs to.
    """

    prompt_template = load_prompt("extraction_prompt.txt")
    prompt = prompt_template.format(user_input=user_input)

    temp_thread = create_thread()
    response = send_message(temp_thread, prompt)

    try:
        parsed = json.loads(response)
        return parsed
    except Exception:
        return None