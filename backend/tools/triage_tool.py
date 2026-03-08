# This file contains the code for the triage tool. 
# It will be used to triage the patient's symptoms and return the triage result.
# This file exposes the triage engine as a tool that the AI assistant can call.

# Import the necessary libraries
from backend.services.triage import run_triage

# Define the triage tool function
def triage_tool(symptom: str, severity: int):
    """
    Tool used by the AI assistant to perform medical triage.

    Parameters
    ----------
    symptom : str
        The symptom described by the patient.

    severity : int
        The severity of the symptom reported by the patient (1–10).

    Returns
    -------
    dict
        The triage result including urgency, reasoning, recommended action, and confidence.
    """

    result = run_triage(symptom, severity)

    return result
