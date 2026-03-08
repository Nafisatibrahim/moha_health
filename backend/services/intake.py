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
    The backend (not the model) decides when to stop asking: once extraction
    has populated primary_symptom, location, severity, duration, and
    additional_symptoms, intake is complete and the flow moves to specialist or triage.
    """
    return len(get_missing_fields(thread_id)) == 0

# Track the last question asked
thread_last_question = {}

# Phase: "general" | "specialist" | "triage" (triage = done with intake/specialist, ready for triage)
thread_phase = {}
# Which specialist is active (e.g. "dermatology", "dental")
thread_specialist = {}
# Backboard thread_id for the specialist conversation (thread is per assistant)
thread_specialist_thread_id = {}
# Number of specialist exchange turns (user message + assistant reply = 1)
thread_specialist_turns = {}
# Accumulated specialist assessment notes for report/triage
thread_specialist_notes = {}

# Max specialist turns before forcing transition to triage
MAX_SPECIALIST_TURNS = 3


def get_phase(thread_id: str) -> str:
    return thread_phase.get(thread_id, "general")


def set_phase(thread_id: str, phase: str):
    thread_phase[thread_id] = phase


def get_specialist(thread_id: str) -> str:
    return thread_specialist.get(thread_id, "")


def set_specialist(thread_id: str, specialist: str):
    thread_specialist[thread_id] = specialist


def get_specialist_thread_id(thread_id: str):
    return thread_specialist_thread_id.get(thread_id)


def set_specialist_thread_id(thread_id: str, sid: str):
    thread_specialist_thread_id[thread_id] = sid


def get_specialist_turns(thread_id: str) -> int:
    return thread_specialist_turns.get(thread_id, 0)


def increment_specialist_turns(thread_id: str):
    thread_specialist_turns[thread_id] = get_specialist_turns(thread_id) + 1


def get_specialist_notes(thread_id: str) -> str:
    return thread_specialist_notes.get(thread_id, "")


def append_specialist_notes(thread_id: str, text: str):
    cur = thread_specialist_notes.get(thread_id, "")
    thread_specialist_notes[thread_id] = (cur + "\n" + text).strip() if cur else text


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