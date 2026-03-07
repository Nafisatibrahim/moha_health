# This file extracts structured intake information from user responses

# Import the necessary libraries
import json
import re
from integrations.backboard_client import send_message, create_thread, load_prompt


def _parse_json_from_response(response: str):
    """Try to extract and parse JSON from model output (may be wrapped in markdown)."""
    if not response or not response.strip():
        return None
    text = response.strip()
    # Strip markdown code blocks
    if "```" in text:
        match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
        if match:
            text = match.group(1)
    # Find first {...}
    match = re.search(r"\{[^{}]*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return None


def extract_intake_field(thread_id: str, user_input: str, last_question: str = "", missing_fields: list = None):
    """
    Use Gemini to extract which intake field the user response belongs to.
    Pass last_question and missing_fields so the model knows context.
    """
    missing_fields = missing_fields or []

    prompt_template = load_prompt("extraction_prompt.txt")
    prompt = prompt_template.format(
        user_input=user_input,
        last_question=last_question or "(none)",
        missing_fields=", ".join(missing_fields) if missing_fields else "location, severity, duration, additional_symptoms",
    )

    temp_thread = create_thread()
    response = send_message(temp_thread, prompt)
    if not response:
        return None

    parsed = _parse_json_from_response(response)
    if parsed and isinstance(parsed, dict) and parsed.get("field") and parsed.get("value") is not None:
        return parsed
    return None