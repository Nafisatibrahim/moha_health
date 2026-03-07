"""
Temporary stub for vitals.

For the hackathon demo we return fixed vitals instead of calling
the Presage Physiology API. Replace this with the real integration later.
"""
from pathlib import Path


def get_vitals_from_video(video_path: str | Path) -> dict | None:
    return {
        "heart_rate": 72,
        "respiration": 16,
    }
