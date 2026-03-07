#!/usr/bin/env python3
"""
Test the /vitals endpoint by uploading a video file.
Usage: python scripts/test_vitals_upload.py <path_to_video.mp4>
Requires the backend to be running (e.g. uvicorn main:app) or set BASE_URL.
"""
import sys
import os

# Run from backend/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

BASE_URL = os.environ.get("BASE_URL", "http://localhost:8000")


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/test_vitals_upload.py <path_to_video.mp4>")
        sys.exit(1)
    path = sys.argv[1]
    if not os.path.isfile(path):
        print(f"File not found: {path}")
        sys.exit(1)

    try:
        import requests
    except ImportError:
        print("Install requests: pip install requests")
        sys.exit(1)

    url = f"{BASE_URL}/vitals"
    with open(path, "rb") as f:
        files = {"video": (os.path.basename(path), f)}
        r = requests.post(url, files=files, timeout=120)
    print("Status:", r.status_code)
    print("Response:", r.json())


if __name__ == "__main__":
    main()
