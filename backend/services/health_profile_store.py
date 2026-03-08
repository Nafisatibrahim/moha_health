"""In-memory store for health profiles keyed by patient_id (e.g. Auth0 user.sub)."""

from typing import Any

# patient_id -> health_profile dict (same shape as frontend HealthProfile)
_store: dict[str, dict[str, Any]] = {}

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


def get(patient_id: str) -> dict[str, Any] | None:
    """Return stored health profile for patient_id, or None."""
    if not (patient_id and patient_id.strip()):
        return None
    pid = patient_id.strip()
    return _store.get(pid)


def set_profile(patient_id: str, health_profile: dict[str, Any]) -> dict[str, Any]:
    """Store health profile for patient_id. Normalizes keys and returns stored dict."""
    if not (patient_id and patient_id.strip()):
        raise ValueError("patient_id is required")
    pid = patient_id.strip()
    normalized = {}
    for key in PROFILE_KEYS:
        val = health_profile.get(key) or health_profile.get(key.replace("_", ""))
        normalized[key] = str(val).strip() if val is not None else ""
    _store[pid] = normalized
    return normalized
