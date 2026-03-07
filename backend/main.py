# This file contains the code for the main application. It will be used to run the application.

# Import the necessary libraries
import os
import tempfile
import requests
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, UploadFile, File, HTTPException
import json
from integrations.backboard_client import (
    create_thread,     # Create a thread
    send_message,       # Send a message to the thread
    load_prompt         # Load a prompt
)

from services.intake import (
    store_answer,
    get_intake_data,
    get_missing_fields,
    is_intake_complete,
    store_last_question,
    get_last_question,
    REQUIRED_FIELDS,
)

from services.triage import run_triage
from services.vitals_triage import escalate_with_vitals
from services.extraction import extract_intake_field
from services.vitals import get_vitals_from_video

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
        },
    }


@app.get("/frontend-config")
def frontend_config():
    """
    Expose non-secret frontend config so index.html can read Cloudinary settings
    without hardcoding them.
    """
    return {
        "cloudinary_cloud_name": os.getenv("CLOUDINARY_CLOUD_NAME", ""),
        "cloudinary_upload_preset": os.getenv("CLOUDINARY_UPLOAD_PRESET", ""),
        "backend_base_url": os.getenv("BACKEND_PUBLIC_URL", "http://127.0.0.1:8000"),
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


# Define the assess endpoint
@app.post("/assess")
def assess(data: dict):
    # User message and optional vitals (from video upload flow)
    text = data.get("text") or ""
    vitals = data.get("vitals")  # e.g. {"heart_rate": 72, "respiration": 16}

    # Get the collected intake data
    intake_data = get_intake_data(thread_id)

    # If no data yet → store the primary symptom
    if "primary_symptom" not in intake_data:
        store_answer(thread_id, "primary_symptom", text)
    else:
        # Refresh so we have current missing_fields and last_question for extraction
        intake_data = get_intake_data(thread_id)
        missing_fields = get_missing_fields(thread_id)
        missing_fields = [f for f in missing_fields if f != "primary_symptom"]
        last_question = get_last_question(thread_id)

        # Extract which field this answer belongs to (with context so we don't loop)
        parsed = extract_intake_field(thread_id, text, last_question=last_question, missing_fields=missing_fields)

        if parsed:
            field = (parsed.get("field") or "").strip().lower()
            value = parsed.get("value")
            if field and value is not None:
                value = str(value).strip()
            # Only store if it's a known intake field (avoid storing wrong keys)
            if field in [f for f in REQUIRED_FIELDS if f != "primary_symptom"] and value:
                if field == "severity":
                    try:
                        value = max(1, min(10, int(value)))
                    except (TypeError, ValueError):
                        pass
                store_answer(thread_id, field, value)

    # Refresh the collected intake data
    intake_data = get_intake_data(thread_id)
    missing_fields = get_missing_fields(thread_id)
    missing_fields = [f for f in missing_fields if f != "primary_symptom"]
    last_question = get_last_question(thread_id)

    # If intake is not complete → ask AI to generate next question
    if not is_intake_complete(thread_id):
        # Load the intake question prompt
        prompt_template = load_prompt("intake_question_prompt.txt")

        # Format the prompt with the intake data
        message = prompt_template.format(
            primary_symptom=intake_data.get("primary_symptom"),
            intake_data=intake_data,
            missing_fields=missing_fields,
            last_question=last_question
        )

        response = send_message(thread_id, message)
        if response is None:
            response = "[No response from assistant. Check backend logs and Backboard API.]"

        # Store the last question asked
        store_last_question(thread_id, response)

        return {
            "intake_data": intake_data,
            "assistant_question": response
        }

    # Intake complete → rule-based triage then vitals escalation
    triage_result = run_triage(intake_data)
    triage_result = escalate_with_vitals(triage_result, vitals)

    return {
        "intake_data": intake_data,
        "triage": triage_result
    }