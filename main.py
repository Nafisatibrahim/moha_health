"""Production entrypoint: read PORT from env and run uvicorn (Option 2 — recommended for Railway)."""
import os
import uvicorn

port = int(os.environ.get("PORT", 8000))

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port)
