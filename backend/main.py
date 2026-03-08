# This file contains the code for the main application. It will be used to run the application.

# Import the necessary libraries
import os
import tempfile
import requests
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
import json
from backend.integrations.backboard_client import (
    create_thread,
    send_message,
    load_prompt,
    upload_document_to_thread,
    get_or_create_assistant,
)

from backend.services.intake import (
    store_answer,
    get_intake_data,
    get_missing_fields,
    is_intake_complete,
    store_last_question,
    get_last_question,
    REQUIRED_FIELDS,
    get_phase,
    set_phase,
    get_specialist,
    set_specialist,
    get_specialist_thread_id,
    set_specialist_thread_id,
    get_specialist_turns,
    increment_specialist_turns,
    get_specialist_notes,
    append_specialist_notes,
    MAX_SPECIALIST_TURNS,
)

from backend.services.routing import route_specialist, parse_router_response, ROUTER_VALID_SPECIALTIES
from backend.services.triage import run_triage
from backend.services.report import build_doctor_report
from backend.services.patient_memory import format_previous_visits_for_prompt, append_visit
from backend.services.knowledge import retrieve as knowledge_retrieve
from backend.services.vitals_triage import escalate_with_vitals
from backend.services.extraction import extract_intake_fields
from backend.services.vitals import get_vitals_from_video
from backend.services.voice import generate_voice, transcribe_audio
from backend.services.health_profile_store import get as get_health_profile, set_profile as set_health_profile

# Add CORS middleware
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Create a thread
thread_id = create_thread()


@app.get("/")
def root():
    """Root route: API info and links to docs."""
    return {
        "message": "AI Health Hack Canada 2026 API",
        "docs": "/docs",
        "endpoints": {
            "POST /assess": "Intake and triage",
            "POST /vitals": "Upload video file for heart rate & respiration (Presage)",
            "POST /vitals/from-url": "Vitals from video URL (e.g. Cloudinary)",
            "GET /profile/health": "Get health profile by patient_id",
            "PUT /profile/health": "Save health profile for patient_id",
        },
    }


@app.get("/profile/health")
def get_profile_health(patient_id: str = ""):
    """Get stored health profile for the given patient_id (e.g. Auth0 user.sub). Returns 404 if not found."""
    pid = (patient_id or "").strip()
    if not pid:
        raise HTTPException(status_code=400, detail="patient_id is required")
    profile = get_health_profile(pid)
    if profile is None:
        raise HTTPException(status_code=404, detail="Health profile not found")
    return {"health_profile": profile}


@app.put("/profile/health")
def put_profile_health(data: dict):
    """Save health profile for patient_id. Body: { patient_id, health_profile }."""
    body = data or {}
    pid = (body.get("patient_id") or "").strip()
    if not pid:
        raise HTTPException(status_code=400, detail="patient_id is required")
    health_profile = body.get("health_profile")
    if not isinstance(health_profile, dict):
        health_profile = {}
    try:
        stored = set_health_profile(pid, health_profile)
        return {"health_profile": stored}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/speak")
def speak(data: dict):
    """Convert text to speech via ElevenLabs and stream MP3 audio."""
    body = data or {}
    text = body.get("text") or ""
    if not text.strip():
        raise HTTPException(status_code=400, detail="Missing or empty 'text' in JSON body")
    voice_id = (body.get("voice_id") or "").strip() or None
    try:
        audio = generate_voice(text, voice_id=voice_id)
        if audio is None or len(audio) == 0:
            raise HTTPException(status_code=500, detail="Voice generation failed")
        return StreamingResponse(
            iter([audio]),
            media_type="audio/mpeg",
        )
    except HTTPException:
        raise
    except Exception as e:
        err_str = str(e).lower()
        if "quota" in err_str or "quota_exceeded" in err_str:
            raise HTTPException(
                status_code=429,
                detail={"status": "quota_exceeded", "message": "TTS quota exceeded. Please use text mode."},
            )
        raise HTTPException(status_code=500, detail=f"TTS error: {str(e)}")


@app.post("/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    language_code: str | None = None,
):
    """Accept an audio file (e.g. webm from browser), return transcribed text.
    Optional language_code (e.g. 'en', 'fr') hints the STT model to avoid wrong-language output."""
    try:
        body = await audio.read()
        if not body:
            raise HTTPException(status_code=400, detail="Empty audio file")
        from io import BytesIO
        text = transcribe_audio(
            BytesIO(body),
            audio.filename or "audio.webm",
            language_code=language_code,
        )
        return {"text": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription error: {str(e)}")


@app.get("/frontend-config")
def frontend_config():
    """
    Expose non-secret frontend config (Cloudinary, Auth0 client ID for SPA, etc.).
    """
    return {
        "cloudinary_cloud_name": os.getenv("CLOUDINARY_CLOUD_NAME", ""),
        "cloudinary_upload_preset": os.getenv("CLOUDINARY_UPLOAD_PRESET", ""),
        "backend_base_url": os.getenv("BACKEND_PUBLIC_URL", "http://127.0.0.1:8000"),
        "auth0_domain": os.getenv("AUTH0_DOMAIN", ""),
        "auth0_client_id": os.getenv("AUTH0_CLIENT_ID", ""),
    }


# Vitals: upload a short video (20–30 s); backend sends to Presage cloud and returns hr/rr
@app.post("/vitals")
async def vitals(video: UploadFile = File(...)):
    """Accept a video file (MP4/AVI/MOV), send to Presage Physiology API, return heart rate and respiration."""
    suffix = ".mp4"
    if video.filename and "." in video.filename:
        suffix = "." + video.filename.rsplit(".", 1)[-1].lower()
    if suffix not in (".mp4", ".avi", ".mov"):
        suffix = ".mp4"
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await video.read()
            tmp.write(content)
            tmp_path = tmp.name
        result = get_vitals_from_video(tmp_path)
        return result if result is not None else {"error": "Could not compute vitals from video"}
    except Exception as e:
        return {"error": str(e)}
    finally:
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except Exception:
                pass


# Vitals from a video URL (e.g. Cloudinary): frontend uploads to Cloudinary, sends URL here
@app.post("/vitals/from-url")
async def vitals_from_url(body: dict):
    """
    Accept a video URL (e.g. Cloudinary), download it, send to Presage, return heart rate and respiration.
    Body: { "url": "https://res.cloudinary.com/.../video/upload/..." }
    """
    url = (body or {}).get("url")
    if not url or not isinstance(url, str):
        raise HTTPException(status_code=400, detail="Missing or invalid 'url' in JSON body")
    if not url.strip().lower().startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="URL must be http or https")

    tmp_path = None
    try:
        print("VIDEO URL RECEIVED:", url)
        r = requests.get(url, stream=True, timeout=60)
        r.raise_for_status()
        # Prefer .mp4; Cloudinary and others often use it
        suffix = ".mp4"
        if ".mp4" in url.lower() or "mp4" in (r.headers.get("content-type") or "").lower():
            suffix = ".mp4"
        elif ".mov" in url.lower():
            suffix = ".mov"
        elif ".avi" in url.lower():
            suffix = ".avi"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            for chunk in r.iter_content(chunk_size=8192):
                tmp.write(chunk)
            tmp_path = tmp.name
        result = get_vitals_from_video(tmp_path)
        print("PRESAGE VITALS RESULT:", result)
        if result is None:
            return {"error": "Could not compute vitals from video"}
        return result
    except requests.RequestException as e:
        print("VIDEO FETCH ERROR:", e)
        return {"error": f"Failed to fetch video: {str(e)}"}
    except Exception as e:
        print("VITALS_FROM_URL ERROR:", e)
        return {"error": str(e)}
    finally:
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except Exception:
                pass


def _format_health_profile(health_profile) -> str:
    """Turn health_profile (dict or str) into a string for prompts."""
    if not health_profile:
        return "None provided."
    if isinstance(health_profile, str):
        return health_profile.strip() or "None provided."
    if isinstance(health_profile, dict):
        parts = []
        labels = {
            "allergies": "Allergies",
            "past_surgeries": "Past surgeries / operations",
            "last_surgery_date": "Last surgery date",
            "chronic_conditions": "Chronic conditions",
            "medications": "Current medications",
            "blood_type": "Blood type",
            "family_history": "Family history",
            "other_relevant": "Other relevant history",
        }
        for key, label in labels.items():
            val = health_profile.get(key) or health_profile.get(key.replace("_", ""))
            if val and str(val).strip():
                parts.append(f"{label}: {str(val).strip()}")
        return "\n".join(parts) if parts else "None provided."
    return "None provided."


# Map frontend locale to full language name for Gemini instruction
LOCALE_TO_LANGUAGE = {"en": "English", "fr": "French", "es": "Spanish"}


# Define the assess endpoint
@app.post("/assess")
def assess(data: dict):
    # User message, optional vitals, optional health profile, optional symptom image, optional patient_id (Auth0 user.sub)
    text = data.get("text") or ""
    vitals = data.get("vitals")  # e.g. {"heart_rate": 72, "respiration": 16}
    health_profile_from_body = data.get("health_profile")
    locale = (data.get("locale") or "en").lower()
    language_name = LOCALE_TO_LANGUAGE.get(locale) or LOCALE_TO_LANGUAGE["en"]
    symptom_image_url = (data.get("symptom_image_url") or "").strip()
    patient_id = (data.get("patient_id") or "").strip()
    if patient_id and (not health_profile_from_body or (isinstance(health_profile_from_body, dict) and not any((v or "").strip() for v in (health_profile_from_body or {}).values()))):
        stored = get_health_profile(patient_id)
        if stored:
            health_profile_from_body = stored
    health_profile_str = _format_health_profile(health_profile_from_body)
    previous_visits_str = format_previous_visits_for_prompt(patient_id) if patient_id else ""
    if not previous_visits_str:
        previous_visits_str = "None."

    # If the patient shared a symptom image (e.g. rash), upload to main thread (and specialist thread if in use)
    if symptom_image_url and symptom_image_url.startswith(("http://", "https://")):
        upload_document_to_thread(thread_id, symptom_image_url)
        spec_tid = get_specialist_thread_id(thread_id)
        if spec_tid:
            upload_document_to_thread(spec_tid, symptom_image_url)

    # Get the collected intake data
    intake_data = get_intake_data(thread_id)

    # First message: store primary symptom and extract any volunteered fields from the same message
    if "primary_symptom" not in intake_data:
        store_answer(thread_id, "primary_symptom", text)
        extractions = extract_intake_fields(
            thread_id,
            user_input=text,
            last_question="(Patient's initial description)",
            missing_fields=["location", "severity", "duration", "additional_symptoms"],
        )
        for parsed in extractions:
            field = (parsed.get("field") or "").strip().lower()
            value = parsed.get("value")
            if field and value is not None:
                value = str(value).strip()
            if field in [f for f in REQUIRED_FIELDS if f != "primary_symptom"] and value:
                if field == "severity":
                    try:
                        value = str(max(1, min(10, int(value))))
                    except (TypeError, ValueError):
                        pass
                store_answer(thread_id, field, value)
    else:
        # Later messages: extract all fields the patient provided and store each
        intake_data = get_intake_data(thread_id)
        missing_fields = get_missing_fields(thread_id)
        missing_fields = [f for f in missing_fields if f != "primary_symptom"]
        last_question = get_last_question(thread_id)
        extractions = extract_intake_fields(
            thread_id, text, last_question=last_question, missing_fields=missing_fields
        )
        for parsed in extractions:
            field = (parsed.get("field") or "").strip().lower()
            value = parsed.get("value")
            if field and value is not None:
                value = str(value).strip()
            if field in [f for f in REQUIRED_FIELDS if f != "primary_symptom"] and value:
                if field == "severity":
                    try:
                        value = str(max(1, min(10, int(value))))
                    except (TypeError, ValueError):
                        pass
                store_answer(thread_id, field, value)

    # Refresh the collected intake data
    intake_data = get_intake_data(thread_id)
    missing_fields = get_missing_fields(thread_id)
    missing_fields = [f for f in missing_fields if f != "primary_symptom"]
    last_question = get_last_question(thread_id)

    # If intake is not complete → general phase: ask AI for next question (conversational)
    if not is_intake_complete(thread_id):
        prompt_template = load_prompt("general_physician_prompt.txt")
        message = prompt_template.format(
            health_profile=health_profile_str,
            previous_visits=previous_visits_str,
            primary_symptom=intake_data.get("primary_symptom"),
            intake_data=intake_data,
            missing_fields=missing_fields,
            last_question=last_question,
            user_response=text,
        )
        message += f"\n\nRespond only in the user's language. User language: {language_name}."
        if symptom_image_url:
            message += "\n\nThe patient has shared an image of their symptom (uploaded to this thread). Consider the image when asking follow-up questions and assessing location, severity, or additional symptoms."

        response = send_message(thread_id, message)
        if response is None:
            response = "[No response from assistant. Check backend logs and Backboard API.]"
        store_last_question(thread_id, response)
        return {"intake_data": intake_data, "assistant_question": response, "specialist": get_specialist(thread_id) or "", "agent_role": "intake"}

    # Intake complete — check if we should hand off to a specialist (general phase)
    phase = get_phase(thread_id)
    if phase == "general":
        # Optional LLM router: one-off Backboard call; fallback to rule-based
        router_reply = None
        try:
            router_prompt = load_prompt("router_prompt.txt").format(
                primary_symptom=intake_data.get("primary_symptom", ""),
                location=intake_data.get("location", ""),
                additional_symptoms=intake_data.get("additional_symptoms", ""),
            )
            router_thread = create_thread(role="general")
            router_reply = send_message(router_thread, router_prompt)
        except Exception:
            pass
        specialist_role = parse_router_response(router_reply) if router_reply else None
        if specialist_role not in ROUTER_VALID_SPECIALTIES or specialist_role == "general":
            specialist_role = route_specialist(
                primary_symptom=intake_data.get("primary_symptom", ""),
                additional_symptoms=intake_data.get("additional_symptoms", ""),
                location=intake_data.get("location", ""),
            )
        if specialist_role in ("dermatology", "dental", "cardiology"):
            # Create specialist thread and send first context message
            spec_thread_id = create_thread(role=specialist_role)
            set_specialist_thread_id(thread_id, spec_thread_id)
            set_specialist(thread_id, specialist_role)
            set_phase(thread_id, "specialist")
            if symptom_image_url:
                upload_document_to_thread(spec_thread_id, symptom_image_url)

            prompt_name = (
                "dermatologist_prompt.txt"
                if specialist_role == "dermatology"
                else "dentist_prompt.txt"
                if specialist_role == "dental"
                else "cardiologist_prompt.txt"
            )
            prompt_template = load_prompt(prompt_name)
            conversation_summary = (
                f"Primary symptom: {intake_data.get('primary_symptom')}. "
                f"Location: {intake_data.get('location')}. Severity: {intake_data.get('severity')}. "
                f"Duration: {intake_data.get('duration')}. Additional: {intake_data.get('additional_symptoms')}."
            )
            if symptom_image_url:
                conversation_summary += " The patient has uploaded a symptom image (available to the care team)."
            if previous_visits_str and previous_visits_str != "None.":
                conversation_summary += " " + previous_visits_str
            spec_message = prompt_template.format(
                conversation_summary=conversation_summary,
                intake_data=intake_data,
                health_profile=health_profile_str,
            )
            spec_message += f"\n\nRespond only in the user's language. User language: {language_name}."

            response = send_message(spec_thread_id, spec_message)
            if response is None:
                response = "[No response from specialist. Check backend logs.]"
            append_specialist_notes(thread_id, response)
            store_last_question(thread_id, response)
            increment_specialist_turns(thread_id)
            return {"intake_data": intake_data, "assistant_question": response, "specialist": specialist_role, "agent_role": specialist_role}
        # No specialist → go to triage
        set_phase(thread_id, "triage")

    # Specialist phase: user is replying to the specialist
    if phase == "specialist":
        spec_thread_id = get_specialist_thread_id(thread_id)
        if spec_thread_id:
            response = send_message(spec_thread_id, text)
            if response is None:
                response = "[No response from specialist.]"
            append_specialist_notes(thread_id, response)
            store_last_question(thread_id, response)
            increment_specialist_turns(thread_id)
            if get_specialist_turns(thread_id) >= MAX_SPECIALIST_TURNS:
                set_phase(thread_id, "triage")
                # Fall through to triage and report below
            else:
                return {"intake_data": intake_data, "assistant_question": response, "specialist": get_specialist(thread_id) or "", "agent_role": get_specialist(thread_id) or "intake"}

    # RAG: retrieve relevant guideline excerpt before triage
    symptom_summary = str(intake_data.get("primary_symptom", "")) + " " + str(intake_data.get("additional_symptoms", ""))
    rag_context = knowledge_retrieve(
        symptom_summary=symptom_summary,
        primary_symptom=intake_data.get("primary_symptom", ""),
        additional_symptoms=intake_data.get("additional_symptoms", ""),
    )

    # Triage + report (phase is triage or we just finished specialist)
    triage_result = run_triage(
        intake_data,
        health_profile=health_profile_str,
        specialist_notes=get_specialist_notes(thread_id) or None,
        rag_context=rag_context or None,
    )
    triage_result = escalate_with_vitals(triage_result, vitals)
    health_profile_dict = health_profile_from_body if isinstance(health_profile_from_body, dict) else None
    report_text, report_dict = build_doctor_report(
        intake_data=intake_data,
        health_profile_str=health_profile_str,
        health_profile_dict=health_profile_dict,
        specialist_notes=get_specialist_notes(thread_id) or "",
        specialist=get_specialist(thread_id) or "",
        triage_result=triage_result,
        vitals=vitals or {},
        rag_context=rag_context or "",
        patient_id=patient_id,
        session_id=thread_id,
        symptom_image_provided=bool(symptom_image_url),
        vitals_video_provided=bool(vitals),
    )
    triage_result["confidence"] = report_dict.get("ai_confidence_score", 0.8)
    if patient_id:
        append_visit(
            patient_id,
            primary_symptom=intake_data.get("primary_symptom", ""),
            duration=intake_data.get("duration", ""),
            severity=str(intake_data.get("severity", "")),
            specialist=get_specialist(thread_id) or "",
            urgency=triage_result.get("urgency", ""),
        )
    return {
        "intake_data": intake_data,
        "triage": triage_result,
        "report": report_text,
        "report_json": report_dict,
        "session_id": thread_id,
        "specialist": get_specialist(thread_id) or "",
        "agent_role": get_specialist(thread_id) or "intake",
    }