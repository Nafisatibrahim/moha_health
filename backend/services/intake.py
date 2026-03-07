# This file manages the patient intake workflow
# The file is responsible for:
# - Tracking conversation progress
# - Storing patient answers
# - Defining required intake fields
# - Checking what intake information is still missing

# Required intake fields that must be collected before triage
REQUIRED_FIELDS = [
    "primary_symptom",
    "location",
    "severity",
    "duration",
    "additional_symptoms"
]

# Track intake progress per conversation
thread_steps = {}

# Store collected intake answers
thread_intake_data = {}


def get_step(thread_id: str):
    """
    Return the current intake step for a thread.
    """
    return thread_steps.get(thread_id, 0)


def advance_step(thread_id: str):
    """
    Move the intake process to the next step.
    """
    current = thread_steps.get(thread_id, 0)
    thread_steps[thread_id] = current + 1


def store_answer(thread_id: str, key: str, value: str):
    """
    Store a patient's answer.
    """
    if thread_id not in thread_intake_data:
        thread_intake_data[thread_id] = {}

    thread_intake_data[thread_id][key] = value


def get_intake_data(thread_id: str):
    """
    Retrieve collected intake data.
    """
    return thread_intake_data.get(thread_id, {})


def get_missing_fields(thread_id: str):
    """
    Return the list of required intake fields that are still missing.
    """
    intake_data = get_intake_data(thread_id)

    missing_fields = []

    for field in REQUIRED_FIELDS:
        value = intake_data.get(field)

        if value is None or str(value).strip() == "":
            missing_fields.append(field)

    return missing_fields


def is_intake_complete(thread_id: str):
    """
    Return True if all required intake fields have been collected.
    """
    return len(get_missing_fields(thread_id)) == 0

# Track the last question asked
thread_last_question = {}

def store_last_question(thread_id: str, question: str):
    """
    Store the last question asked for a thread.
    """
    thread_last_question[thread_id] = question

def get_last_question(thread_id: str):
    """
    Get the last question asked for a thread.
    """
    return thread_last_question.get(thread_id)