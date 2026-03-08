# Build structured AI Clinical Intake Report for physicians (text + JSON).
# Template: concise, scannable; no conversational text. Includes confidence score.

from datetime import datetime
from typing import Any


def _compute_confidence(
    triage_result: dict,
    specialist_notes: str | None,
    vitals: dict | None,
) -> float:
    """
    Rule-based confidence score for triage (0.0–1.0).
    Higher when urgency is clear, specialist contributed, and vitals available.
    """
    urgency = (triage_result.get("urgency") or "").upper()
    base = {"HIGH": 0.88, "MEDIUM": 0.78, "LOW": 0.72}.get(urgency, 0.75)
    if specialist_notes and specialist_notes.strip():
        base = min(0.95, base + 0.05)
    if vitals and (vitals.get("heart_rate") is not None or vitals.get("respiration") is not None):
        base = min(0.95, base + 0.04)
    return round(base, 2)


def _health_profile_to_optional_section(health_profile: dict | None) -> dict[str, str]:
    """Extract optional patient info from health profile dict."""
    if not health_profile or not isinstance(health_profile, dict):
        return {
            "age": "Not provided",
            "sex": "Not provided",
            "known_conditions": "Not provided",
            "medications": "Not provided",
            "allergies": "Not provided",
        }
    get = lambda k: (health_profile.get(k) or health_profile.get(k.replace("_", "")) or "").strip()
    return {
        "age": get("age") or "Not provided",
        "sex": "Not provided",  # not in current schema
        "known_conditions": get("chronic_conditions") or "Not provided",
        "medications": get("medications") or "Not provided",
        "allergies": get("allergies") or "Not provided",
    }


def build_doctor_report(
    intake_data: dict,
    health_profile_str: str,
    health_profile_dict: dict | None,
    specialist_notes: str,
    specialist: str,
    triage_result: dict,
    vitals: dict,
    rag_context: str = "",
    patient_id: str = "",
    session_id: str = "",
    symptom_image_provided: bool = False,
    vitals_video_provided: bool = False,
    image_analysis_text: str = "",
) -> tuple[str, dict[str, Any]]:
    """
    Build structured AI Clinical Intake Report (text and JSON).
    Returns (report_text, report_dict).
    """
    now = datetime.utcnow()
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H:%M UTC")

    confidence = _compute_confidence(triage_result, specialist_notes, vitals or {})
    triage_result_with_confidence = {**triage_result, "confidence": confidence}

    optional_info = _health_profile_to_optional_section(health_profile_dict)

    chief = (intake_data.get("primary_symptom") or "").strip() or "Not specified."
    location = (intake_data.get("location") or "").strip() or "Not specified."
    severity = (intake_data.get("severity") or "").strip() or "Not specified."
    duration = (intake_data.get("duration") or "").strip() or "Not specified."
    additional = (intake_data.get("additional_symptoms") or "").strip() or "None reported."

    # Associated symptoms as bullet list (split by comma or newline)
    assoc_list = [s.strip() for s in additional.replace("\n", ",").split(",") if s.strip()]
    if not assoc_list:
        assoc_list = [additional] if additional != "None reported." else []

    # Patient intake summary bullets
    summary_bullets = [
        f"Chief complaint: {chief}",
        f"Location: {location}",
        f"Severity: {severity}",
        f"Duration: {duration}",
        f"Additional symptoms: {additional}",
    ]

    hr = vitals.get("heart_rate") if vitals else None
    rr = vitals.get("respiration") if vitals else None
    stress = vitals.get("stress_index") if vitals else None

    # Build JSON structure first (single source of truth for schema)
    report_dict: dict[str, Any] = {
        "patient_identification": {
            "patient_id": patient_id or "Not provided",
            "session_id": session_id or "Not provided",
            "date": date_str,
            "time": time_str,
            "source": "AI Intake Assistant",
        },
        "optional_patient_info": optional_info,
        "chief_complaint": chief,
        "symptom_history": {
            "symptom_onset": duration,
            "progression": "As reported in intake.",
            "severity": severity,
            "location": location,
        },
        "associated_symptoms": assoc_list,
        "patient_intake_summary": summary_bullets,
        "uploaded_media": {
            "symptom_image": "Provided" if symptom_image_provided else "Not Provided",
            "vitals_video": "Provided" if vitals_video_provided else "Not Provided",
        },
        "image_analysis": (image_analysis_text or "Not performed.").strip() or "Not performed.",
        "vitals": {
            "heart_rate": hr if hr is not None else "Not recorded",
            "respiration_rate": rr if rr is not None else "Not recorded",
            "stress_index": stress if stress is not None else "Not recorded",
        },
        "specialist_analysis": (specialist_notes or "N/A").strip() if specialist else "N/A",
        "possible_considerations": [
            "See specialist analysis above. No medical diagnosis; clinical review required.",
        ],
        "clinical_context": (rag_context or "None retrieved.").strip()[:2000] if rag_context else "None retrieved.",
        "triage_decision": {
            "urgency_level": triage_result.get("urgency", ""),
            "priority_level": triage_result.get("priority_level"),
            "recommended_department": triage_result.get("department", ""),
        },
        "reason": triage_result.get("reason", ""),
        "ai_notes_for_physician": f"Specialist involved: {specialist}" if specialist else "General intake only.",
        "ai_assistance_disclaimer": "This intake summary was generated by an AI assistant to support clinical triage. It is not a medical diagnosis and must be reviewed by a qualified healthcare professional.",
        "ai_confidence_score": confidence,
    }

    # Build human-readable text from same data
    lines = [
        "AI CLINICAL INTAKE REPORT",
        "",
        "Patient Identification",
        f"Patient ID: {report_dict['patient_identification']['patient_id']}",
        f"Session ID: {report_dict['patient_identification']['session_id']}",
        f"Date: {date_str}",
        f"Time: {time_str}",
        "Source: AI Intake Assistant",
        "",
        "Optional Patient Information (include only if available)",
        f"Age: {optional_info['age']}",
        f"Sex: {optional_info['sex']}",
        f"Known Conditions: {optional_info['known_conditions']}",
        f"Medications: {optional_info['medications']}",
        f"Allergies: {optional_info['allergies']}",
        "",
        "Chief Complaint",
        chief,
        "",
        "Symptom History",
        f"Symptom Onset: {duration}",
        "Progression: As reported in intake.",
        f"Severity: {severity}",
        f"Location: {location}",
        "",
        "Associated Symptoms",
    ]
    for item in assoc_list:
        lines.append(f"• {item}")
    lines.extend(["", "Patient Intake Summary"])
    for b in summary_bullets:
        lines.append(f"• {b}")
    lines.extend([
        "",
        "Uploaded Media",
        f"Symptom Image: {'Provided' if symptom_image_provided else 'Not Provided'}",
        f"Vitals Video: {'Provided' if vitals_video_provided else 'Not Provided'}",
        "",
        "Image Analysis (if available)",
        report_dict["image_analysis"],
        "",
        "Vitals (AI Estimated)",
        f"Heart Rate: {hr if hr is not None else 'Not recorded'}",
        f"Respiration Rate: {rr if rr is not None else 'Not recorded'}",
        f"Stress Index: {stress if stress is not None else 'Not recorded'}",
        "",
        "Specialist Analysis",
        report_dict["specialist_analysis"],
        "",
        "Possible Considerations",
    ])
    for c in report_dict["possible_considerations"]:
        lines.append(f"• {c}")
    lines.extend([
        "",
        "Clinical Context (Guideline Reference)",
        report_dict["clinical_context"],
        "",
        "Triage Decision",
        f"Urgency Level: {triage_result.get('urgency', '')}",
        f"Priority Level: Level {triage_result.get('priority_level', '')}",
        f"Recommended Department: {triage_result.get('department', '')}",
        "",
        "Reason",
        triage_result.get("reason", ""),
        "",
        "AI Notes for Physician",
        report_dict["ai_notes_for_physician"],
        "",
        "AI Assistance Disclaimer",
        report_dict["ai_assistance_disclaimer"],
        "",
        "AI Confidence Score",
        f"Confidence: {confidence} (rule-based triage; heuristic).",
    ])

    report_text = "\n".join(lines)
    return report_text, report_dict


def build_doctor_report_legacy(
    intake_data: dict,
    health_profile_str: str,
    specialist_notes: str,
    specialist: str,
    triage_result: dict,
    vitals: dict,
    rag_context: str = "",
) -> str:
    """
    Legacy builder: returns only text. Used if callers do not pass new params.
    """
    text, _ = build_doctor_report(
        intake_data=intake_data,
        health_profile_str=health_profile_str,
        health_profile_dict=None,
        specialist_notes=specialist_notes or "",
        specialist=specialist or "",
        triage_result=triage_result,
        vitals=vitals or {},
        rag_context=rag_context or "",
        patient_id="",
        session_id="",
        symptom_image_provided=False,
        vitals_video_provided=False,
    )
    return text
