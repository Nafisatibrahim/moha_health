# Voice service: ElevenLabs TTS and STT.
import os
from typing import BinaryIO

# Lazy client so missing API key doesn't break import
_client = None


def _get_client():
    global _client
    if _client is not None:
        return _client
    try:
        from elevenlabs.client import ElevenLabs
    except ImportError:
        raise RuntimeError("elevenlabs package not installed; run: pip install elevenlabs")
    api_key = os.getenv("ELEVENLABS_API_KEY")
    if not api_key:
        raise ValueError("ELEVENLABS_API_KEY not set")
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
    except Exception:
        pass
    # ElevenLabs default Rachel voice_id (known preset)
    return "21m00Tcm4TlvDq8ikWAM"


def generate_voice(text: str, voice_id: str | None = None) -> bytes:
    """Generate TTS audio bytes (MP3) via ElevenLabs. If voice_id is provided, use it; else default to Rachel."""
    client = _get_client()
    if not (voice_id and voice_id.strip()):
        voice_id = _get_voice_id("Rachel")
    result = client.text_to_speech.convert(
        voice_id=voice_id,
        text=text,
    )
    # convert() can return bytes or an iterator of chunks
    if isinstance(result, bytes):
        return result
    return b"".join(result)


def transcribe_audio(
    audio_file: BinaryIO,
    filename: str = "audio.webm",
    language_code: str | None = None,
) -> str:
    """Transcribe audio file to text via ElevenLabs STT. Returns transcribed text.
    If language_code is set (e.g. 'en', 'fr'), hints the model to avoid wrong-language transcription."""
    client = _get_client()
    kwargs = {"model_id": "scribe_v2", "file": audio_file}
    if language_code and language_code.strip():
        kwargs["language_code"] = language_code.strip()
    result = client.speech_to_text.convert(**kwargs)
    if hasattr(result, "text"):
        return result.text or ""
    if isinstance(result, str):
        return result
    return ""
