"""
Vitals via Presage Physiology API (cloud).

Presage does not run in the browser. Flow:
  1. Web app records a short video (e.g. 20–30 s) with getUserMedia + MediaRecorder.
  2. Frontend uploads the video file to POST /vitals.
  3. Backend saves to temp file, sends to Presage cloud, polls for result, returns hr/rr.
"""
import os
import time
import tempfile
from pathlib import Path

def get_vitals_from_video(video_path: str | Path) -> dict | None:
    """
    Send a video file to Presage Physiology API and return heart rate + respiration.
    Video should be ~20–30 s, face/shoulders/chest visible, good lighting.
    Supported formats: AVI, MOV, MP4.
    """
    api_key = os.getenv("PRESAGE_API_KEY")
    if not api_key:
        return None

    try:
        from presage_technologies import Physiology
    except ImportError:
        return None

    physio = Physiology(api_key)
    path = str(video_path)

    try:
        video_id = physio.queue_processing_hr_rr(path, preprocess=True, compress=True)
    except Exception:
        return None

    # Presage suggests waiting ~half the video length before polling
    duration_guess = 20
    wait_until = time.monotonic() + min(duration_guess / 2, 15)
    while time.monotonic() < wait_until:
        time.sleep(2)
        try:
            data = physio.retrieve_result(video_id)
            if not data:
                continue
            hr = data.get("hr")
            rr = data.get("rr")
            if hr is None and rr is None:
                continue
            # API returns time-series; use latest or average for simple vitals
            heart_rate = _latest_or_avg(hr)
            respiration = _latest_or_avg(rr)
            return {
                "heart_rate": round(heart_rate, 1) if heart_rate is not None else None,
                "respiration": round(respiration, 1) if respiration is not None else None,
            }
        except Exception:
            continue

    return None


def _latest_or_avg(series) -> float | None:
    """Take latest value or average from Presage time-series."""
    if series is None:
        return None
    if isinstance(series, (int, float)):
        return float(series)
    if isinstance(series, dict):
        vals = [v for v in series.values() if isinstance(v, (int, float))]
        return sum(vals) / len(vals) if vals else None
    if isinstance(series, (list, tuple)):
        vals = [v for v in series if isinstance(v, (int, float))]
        return sum(vals) / len(vals) if vals else None
    return None
