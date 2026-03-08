# In-memory patient visit history for stateful context (Phase 1).
# Keyed by patient_id (e.g. Auth0 user.sub). Replace with DB in Phase 2.

MAX_VISITS_PER_PATIENT = 5

_patient_visits: dict[str, list[dict]] = {}


def get_previous_visits(patient_id: str, last_n: int = 2) -> list[dict]:
    """Return the last N visit summaries for the patient, or empty list."""
    if not patient_id or not patient_id.strip():
        return []
    visits = _patient_visits.get(patient_id.strip(), [])
    return visits[-last_n:] if last_n else visits


def format_previous_visits_for_prompt(patient_id: str, last_n: int = 2) -> str:
    """Format previous visits as a string for injection into prompts."""
    visits = get_previous_visits(patient_id, last_n=last_n)
    if not visits:
        return ""
    parts = []
    for i, v in enumerate(visits, 1):
        s = v.get("primary_symptom", "—")
        d = v.get("duration", "")
        sev = v.get("severity", "")
        spec = v.get("specialist", "")
        urg = v.get("urgency", "")
        line = f"Visit {i}: symptom={s}"
        if d:
            line += f", duration={d}"
        if sev:
            line += f", severity={sev}"
        if spec:
            line += f", specialist={spec}"
        if urg:
            line += f", triage={urg}"
        parts.append(line)
    return "Previous visit(s): " + "; ".join(parts)


def append_visit(
    patient_id: str,
    primary_symptom: str = "",
    duration: str = "",
    severity: str = "",
    specialist: str = "",
    urgency: str = "",
) -> None:
    """Append a short visit summary for the patient. Keeps only last MAX_VISITS_PER_PATIENT."""
    if not patient_id or not patient_id.strip():
        return
    pid = patient_id.strip()
    if pid not in _patient_visits:
        _patient_visits[pid] = []
    _patient_visits[pid].append({
        "primary_symptom": primary_symptom,
        "duration": duration,
        "severity": severity,
        "specialist": specialist,
        "urgency": urgency,
    })
    if len(_patient_visits[pid]) > MAX_VISITS_PER_PATIENT:
        _patient_visits[pid] = _patient_visits[pid][-MAX_VISITS_PER_PATIENT:]
