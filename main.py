"""Production entrypoint: read PORT from env and run uvicorn (Option 2 — recommended for Railway)."""
import os
import sys

# Ensure app root is on path so "backend" package resolves (e.g. in Docker /app)
_ROOT = os.path.abspath(os.path.dirname(__file__))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

import uvicorn

port = int(os.environ.get("PORT", 8000))

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port)
