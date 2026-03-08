"""Assessment (triage) history stored in Supabase, keyed by patient_id. Used for context memory and Profile history."""

import os
from typing import Any

_client = None


def _get_client():
    """Lazy-init Supabase client. Returns None if SUPABASE_URL or SUPABASE_KEY not set."""
    global _client
    if _client is not None:
        return _client
    url = (os.environ.get("SUPABASE_URL") or "").strip()
    key = (os.environ.get("SUPABASE_KEY") or "").strip()
    if not url or not key:
        return None
    try:
        from supabase import create_client
        _client = create_client(url, key)
    except Exception:
        return None
    return _client


def save_assessment(
    patient_id: str,
    session_id: str,
    primary_symptom: str = "",
    duration: str = "",
    severity: str = "",
    specialist: str = "",
    urgency: str = "",
    report: str = "",
    report_json: dict | None = None,
) -> None:
    """Insert one assessment row. No-op if Supabase is not configured."""
    if not (patient_id and patient_id.strip()):
        return
    client = _get_client()
    if client is None:
        return
    pid = patient_id.strip()
    row = {
        "patient_id": pid,
        "session_id": (session_id or "").strip(),
        "primary_symptom": (primary_symptom or "").strip(),
        "duration": (duration or "").strip(),
        "severity": (severity or "").strip(),
        "specialist": (specialist or "").strip(),
        "urgency": (urgency or "").strip(),
        "report": (report or "").strip(),
        "report_json": report_json if isinstance(report_json, dict) else {},
    }
    try:
        client.table("assessments").insert(row).execute()
    except Exception:
        pass


def get_assessments(patient_id: str, limit: int = 20) -> list[dict[str, Any]]:
    """Return the most recent assessments for the patient (newest first). Empty list if not found or Supabase not configured."""
    if not (patient_id and patient_id.strip()) or limit <= 0:
        return []
    client = _get_client()
    if client is None:
        return []
    pid = patient_id.strip()
    try:
        r = (
            client.table("assessments")
            .select("id, patient_id, session_id, primary_symptom, duration, severity, specialist, urgency, report, report_json, created_at")
            .eq("patient_id", pid)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
    except Exception:
        return []
    rows = getattr(r, "data", None) or []
    out = []
    for row in rows:
        created = row.get("created_at")
        if created and hasattr(created, "isoformat"):
            created = created.isoformat()
        out.append({
            "id": row.get("id"),
            "patient_id": row.get("patient_id", ""),
            "session_id": row.get("session_id", ""),
            "primary_symptom": row.get("primary_symptom", ""),
            "duration": row.get("duration", ""),
            "severity": row.get("severity", ""),
            "specialist": row.get("specialist", ""),
            "urgency": row.get("urgency", ""),
            "report": row.get("report", ""),
            "report_json": row.get("report_json") if isinstance(row.get("report_json"), dict) else {},
            "created_at": created or "",
        })
    return out
