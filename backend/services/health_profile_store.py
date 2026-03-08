"""Health profiles stored in Supabase, keyed by patient_id (e.g. Auth0 user.sub)."""

import os
from datetime import datetime, timezone
from typing import Any

PROFILE_KEYS = (
    "allergies",
    "past_surgeries",
    "last_surgery_date",
    "chronic_conditions",
    "medications",
    "blood_type",
    "family_history",
    "other_relevant",
)

_client = None


def _get_client():
    """Lazy-init Supabase client. Raises if SUPABASE_URL or SUPABASE_KEY not set."""
    global _client
    if _client is not None:
        return _client
    url = (os.environ.get("SUPABASE_URL") or "").strip()
    key = (os.environ.get("SUPABASE_KEY") or "").strip()
    if not url or not key:
        raise ValueError(
            "SUPABASE_URL and SUPABASE_KEY must be set for health profile storage. "
            "Add them to your .env or Railway variables."
        )
    from supabase import create_client
    _client = create_client(url, key)
    return _client


def _row_to_profile(row: dict[str, Any] | None) -> dict[str, Any] | None:
    """Convert Supabase row to profile dict (only PROFILE_KEYS)."""
    if not row:
        return None
    return {k: (row.get(k) or "") for k in PROFILE_KEYS}


def get(patient_id: str) -> dict[str, Any] | None:
    """Return stored health profile for patient_id, or None if not found."""
    if not (patient_id and patient_id.strip()):
        return None
    pid = patient_id.strip()
    client = _get_client()
    r = client.table("health_profiles").select(",".join(PROFILE_KEYS)).eq("patient_id", pid).maybe_single().execute()
    row = r.data if hasattr(r, "data") else None
    return _row_to_profile(row)


def set_profile(patient_id: str, health_profile: dict[str, Any]) -> dict[str, Any]:
    """Upsert health profile for patient_id. Normalizes keys and returns stored dict."""
    if not (patient_id and patient_id.strip()):
        raise ValueError("patient_id is required")
    pid = patient_id.strip()
    normalized = {}
    for key in PROFILE_KEYS:
        val = health_profile.get(key) or health_profile.get(key.replace("_", ""))
        normalized[key] = str(val).strip() if val is not None else ""
    client = _get_client()
    now = datetime.now(timezone.utc).isoformat()
    row = {"patient_id": pid, "updated_at": now, **normalized}
    client.table("health_profiles").upsert(row, on_conflict="patient_id").execute()
    return normalized
