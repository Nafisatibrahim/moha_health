# Voice service: ElevenLabs TTS and STT.
import logging
import os
from typing import BinaryIO

logger = logging.getLogger(__name__)


class ElevenLabsTranscribeError(Exception):
    """Raised when ElevenLabs STT fails. Carries request_id for support tickets."""
    def __init__(self, message: str, request_id: str | None = None):
        super().__init__(message)
        self.request_id = request_id

# Lazy client so missing API key doesn't break import
_client = None


def _get_client():
    global _client
    if _client is not None:
        return _client
    try:
        from elevenlabs.client import ElevenLabs
    except ImportError as e:
        logger.exception("ElevenLabs package not installed")
        raise RuntimeError("elevenlabs package not installed; run: pip install elevenlabs") from e
    raw_key = os.getenv("ELEVENLABS_API_KEY")
    api_key = (raw_key or "").strip()
    if not api_key:
        logger.error("ELEVENLABS_API_KEY is missing or empty")
        raise ValueError("ELEVENLABS_API_KEY not set. Add it in .env or deployment variables.")
    if not api_key.startswith("sk_"):
        logger.warning("ELEVENLABS_API_KEY may be invalid (expected to start with sk_)")
    _client = ElevenLabs(api_key=api_key)
    return _client


def _get_voice_id(name: str = "Rachel") -> str:
    """Resolve voice name to voice_id."""
    client = _get_client()
    try:
        response = client.voices.get_all()
        voices = getattr(response, "voices", []) or []
        for v in voices:
            if getattr(v, "name", "").lower() == name.lower():
                return getattr(v, "voice_id", "") or ""
        if voices:
            return getattr(voices[0], "voice_id", "") or ""
    except Exception as e:
        logger.warning("Could not list ElevenLabs voices, using default Rachel id: %s", e)
    # ElevenLabs default Rachel voice_id (known preset)
    return "21m00Tcm4TlvDq8ikWAM"


def generate_voice(text: str, voice_id: str | None = None) -> bytes:
    """Generate TTS audio bytes (MP3) via ElevenLabs. If voice_id is provided, use it; else default to Rachel."""
    client = _get_client()
    if not (voice_id and voice_id.strip()):
        voice_id = _get_voice_id("Rachel")
    try:
        result = client.text_to_speech.convert(
            voice_id=voice_id,
            text=text,
        )
    except Exception as e:
        logger.exception("ElevenLabs TTS failed: %s", e)
        raise
    # convert() can return bytes or an iterator of chunks
    if isinstance(result, bytes):
        return result
    return b"".join(result)


def _get_request_id_from_response(response: object) -> str | None:
    """Extract request-id from SDK raw response or exception.response headers."""
    if response is None:
        return None
    headers = getattr(response, "headers", None)
    if not headers:
        return None
    return headers.get("request-id") or headers.get("x-request-id")


def transcribe_audio(
    audio_file: BinaryIO,
    filename: str = "audio.webm",
    language_code: str | None = None,
) -> tuple[str, str | None]:
    """Transcribe audio file to text via ElevenLabs STT.
    Returns (transcribed_text, request_id). request_id is for ElevenLabs support tickets.
    If language_code is set (e.g. 'en', 'fr'), hints the model."""
    client = _get_client()
    # Ensure stream is at start so SDK sends full payload (cursor may be at end if read elsewhere)
    audio_file.seek(0)
    # SDK expects file as (filename, file_obj, content_type) for multipart form
    kwargs = {
        "model_id": "scribe_v2",
        "file": (filename, audio_file, "audio/webm"),
    }
    if language_code and language_code.strip():
        kwargs["language_code"] = language_code.strip()
    request_id: str | None = None
    try:
        raw = client.speech_to_text.with_raw_response.convert(**kwargs)
        request_id = _get_request_id_from_response(raw)
        if request_id:
            logger.info("ElevenLabs STT request_id=%s", request_id)
        result = raw.data
    except Exception as e:
        request_id = _get_request_id_from_response(
            getattr(e, "raw_response", None) or getattr(e, "response", None)
        )
        if request_id:
            logger.warning("ElevenLabs STT failed request_id=%s: %s", request_id, e)
        else:
            logger.exception("ElevenLabs STT failed: %s", e)
        raise ElevenLabsTranscribeError(str(e), request_id=request_id) from e
    text = ""
    if hasattr(result, "text"):
        text = (result.text or "").strip()
    elif isinstance(result, str):
        text = result.strip()
    return (text, request_id)
