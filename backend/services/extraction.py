# This file extracts structured intake information from user responses

# Import the necessary libraries
import json
import re
from backend.integrations.backboard_client import send_message, create_thread, load_prompt


def _strip_markdown_json(text: str) -> str:
    """Strip markdown code blocks so we can parse JSON."""
    if "```" in text:
        match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
        if match:
            return match.group(1).strip()
    return text.strip()


def _parse_extractions_response(response: str) -> list:
    """
    Parse extraction response: expect {"extractions": [{"field": "...", "value": "..."}, ...]}.
    Return list of {"field", "value"} dicts. Empty list on parse failure.
    """
    if not response or not response.strip():
        return []
    text = _strip_markdown_json(response)
    # Try to parse full JSON (may span multiple lines)
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        # Fallback: find first {...} for single extraction
        match = re.search(r"\{[^{}]*\}", text, re.DOTALL)
        if match:
            try:
                single = json.loads(match.group(0))
                if isinstance(single, dict) and single.get("field") and single.get("value") is not None:
                    return [single]
            except json.JSONDecodeError:
                pass
        return []
    if not isinstance(parsed, dict):
        return []
    extractions = parsed.get("extractions")
    if not isinstance(extractions, list):
        return []
    result = []
    for item in extractions:
        if isinstance(item, dict) and item.get("field") and item.get("value") is not None:
            result.append({"field": str(item["field"]).strip().lower(), "value": item["value"]})
    return result


def extract_intake_fields(
    thread_id: str, user_input: str, last_question: str = "", missing_fields: list = None
) -> list:
    """
    Use Backboard to extract all intake fields the patient provided in this message.
    Returns a list of {"field", "value"} dicts (e.g. [{"field": "location", "value": "back"}, ...]).
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
        return []
    return _parse_extractions_response(response)