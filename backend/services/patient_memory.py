# Previous visits for prompt context: read from Supabase (assessment_store). In-memory fallback no longer used.

def _get_visits_from_store(patient_id: str, last_n: int) -> list[dict]:
    """Return last N assessments (chronological order: oldest first) for prompt formatting."""
    try:
        from backend.services.assessment_store import get_assessments
        rows = get_assessments(patient_id, limit=last_n)
        # get_assessments returns newest first; reverse so oldest is first for "Visit 1, Visit 2, ..."
        return list(reversed(rows)) if rows else []
    except Exception:
        return []


def format_previous_visits_for_prompt(patient_id: str, last_n: int = 2) -> str:
    """Format previous visits as a string for injection into prompts (from Supabase assessment history)."""
    visits = _get_visits_from_store(patient_id, last_n)
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
