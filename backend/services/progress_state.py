# This file tracks intake progress for each conversation thread

thread_steps = {}


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