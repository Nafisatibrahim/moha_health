# This file manages the patient intake workflow
# The file is responsible for:
# - Tracking conversation progress
# - Storing patient answers
# - Providing intake questions

# Map intake questions to structured fields
INTAKE_FLOW = [
    ("location", "Where exactly is the pain located?"),
    ("severity", "How severe is the pain from 1 to 10?"),
    ("duration", "When did it start?"),
    ("additional_symptoms", "Do you have any additional symptoms such as fever, nausea, or difficulty breathing?")
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


def get_question(step: int):
    """
    Return the next intake question.
    """
    if step < len(INTAKE_FLOW):
        return INTAKE_FLOW[step]

    return None


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