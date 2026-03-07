# Rule-based symptom normalization for deterministic triage.
# Converts free-text patient descriptions into standardized symptom labels.

symptom_aliases = {
    "abdominal pain": ["stomach", "belly", "tummy"],
    "headache": ["head", "head pain", "migraine"],
    "chest pain": ["chest", "tight chest", "chest pressure"],
    "difficulty breathing": ["breath"],
}


def normalize_symptom(symptom: str) -> str:
    text = (symptom or "").lower()
    for canonical, aliases in symptom_aliases.items():
        if any(alias in text for alias in aliases):
            return canonical
    return text or ""
