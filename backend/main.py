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
    store_answer,       # Store patient answers
    get_intake_data,    # Retrieve collected intake data
    get_missing_fields, # Check what intake information is still missing
    is_intake_complete, # Check if intake is complete    
    store_last_question, # Store the last question asked
    get_last_question    # Get the last question asked
)

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
        if result is None:
            return {"error": "Could not compute vitals from video"}
        return result
    except requests.RequestException as e:
        return {"error": f"Failed to fetch video: {str(e)}"}
    except Exception as e:
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

    # Get the user's message
    text = data["text"]

    # Get the collected intake data
    intake_data = get_intake_data(thread_id)

    # If no data yet → store the primary symptom
    if "primary_symptom" not in intake_data:
        store_answer(thread_id, "primary_symptom", text)

    # If data already exists, extract structured field from user answer
    else:
        # Extract structured field from user answer
        parsed = extract_intake_field(thread_id, text) 

        # If the extraction is successful, store the answer
        if parsed:
            field = parsed.get("field")
            value = parsed.get("value")

            if field and value:
                # Clamp severity values
                if field == "severity":
                    try:
                        value = int(value)
                        value = max(1, min(10, value))
                    except:
                        pass

                store_answer(thread_id, field, value)

    # Refresh the collected intake data just in case it's outdated
    intake_data = get_intake_data(thread_id)

    # Check missing intake fields
    missing_fields = get_missing_fields(thread_id)

    # Primary symptom is already known, remove it from missing fields
    missing_fields = [f for f in missing_fields if f != "primary_symptom"]

    # Get the last question asked
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

    # Intake complete → run triage
    message = f"""
    Patient Intake Report:

    {intake_data}

    Determine:

    1. Urgency level (LOW, MEDIUM, HIGH)
    2. Recommended department
    3. Recommended action

    Use the triage_tool if necessary.
    """

    response = send_message(thread_id, message)
    if response is None:
        response = "[No response from assistant. Check backend logs and Backboard API.]"

    return {
        "intake_data": intake_data,
        "assistant_response": response
    }