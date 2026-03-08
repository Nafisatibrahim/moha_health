# Rule-based routing: primary symptom + context → specialist or general.
# Returns "dermatology", "dental", "cardiology", "gastroenterology", or "general".


def route_specialist(primary_symptom: str, additional_symptoms: str = "", location: str = "") -> str:
    """
    Given intake context, return which specialist (if any) should take over.
    Returns "dermatology", "dental", "cardiology", "gastroenterology", or "general".
    """
    text = " ".join(
        [
            (primary_symptom or "").lower(),
            (additional_symptoms or "").lower(),
            (location or "").lower(),
        ]
    )

    # Dermatology: rash, skin, itch, lesion, acne, eczema, etc.
    dermatology_keywords = [
        "rash", "skin", "itch", "itching", "lesion", "acne", "eczema",
        "dermatitis", "hive", "blister", "patch", "mole", "burn", "sunburn",
        "scab", "scar", "wart", "fungal", "ringworm", "psoriasis",
    ]
    if any(k in text for k in dermatology_keywords):
        return "dermatology"

    # Dental: tooth, teeth, gum, jaw, mouth (pain/oral), dental
    dental_keywords = [
        "tooth", "teeth", "gum", "gums", "jaw", "dental", "mouth pain",
        "oral", "cavity", "extraction", "wisdom", "molar", "canine",
    ]
    if any(k in text for k in dental_keywords):
        return "dental"

    # Cardiology: chest, heart, palpitation, shortness of breath, cardiac
    cardiology_keywords = [
        "chest pain", "chest tightness", "heart", "palpitation", "palpitations",
        "shortness of breath", "sob", "cardiac", "heartburn", "arm pain",
        "jaw pain", "pressure", "squeezing",
    ]
    if any(k in text for k in cardiology_keywords):
        return "cardiology"

    # Gastroenterologist: stomach, abdomen, nausea, bowel, gi
    gastroenterology_keywords = [
        "stomach", "abdomen", "abdominal", "nausea", "vomit", "bowel",
        "diarrhea", "constipation", "gi", "digestive", "belly",
    ]
    if any(k in text for k in gastroenterology_keywords):
        return "gastroenterology"

    return "general"


ROUTER_VALID_SPECIALTIES = ("dermatology", "dental", "cardiology", "gastroenterology", "general")


def parse_router_response(reply: str) -> str | None:
    """Parse LLM router reply to one of ROUTER_VALID_SPECIALTIES. Returns None if invalid."""
    if not reply or not isinstance(reply, str):
        return None
    t = reply.strip().lower()
    for spec in ROUTER_VALID_SPECIALTIES:
        if spec in t or t == spec:
            return spec
    return None
