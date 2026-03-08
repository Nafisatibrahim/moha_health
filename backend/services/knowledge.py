# Simple keyword-based retrieval over static guideline texts (Phase 1 RAG).
# Returns relevant excerpts for triage/report context.

from pathlib import Path

KNOWLEDGE_DIR = Path(__file__).resolve().parent.parent / "knowledge"
MAX_EXCERPT_CHARS = 1500


def _load_texts() -> list[tuple[str, str]]:
    """Load all .txt files from knowledge dir. Returns list of (filename, content)."""
    if not KNOWLEDGE_DIR.exists():
        return []
    out = []
    for p in KNOWLEDGE_DIR.glob("*.txt"):
        try:
            out.append((p.name, p.read_text(encoding="utf-8")))
        except Exception:
            pass
    return out


def retrieve(symptom_summary: str, primary_symptom: str = "", additional_symptoms: str = "") -> str:
    """
    Return a short excerpt from knowledge docs relevant to the given symptoms.
    Uses simple keyword overlap; no embeddings. symptom_summary can be a one-line description.
    """
    if not symptom_summary and not primary_symptom:
        return ""
    text = f" {symptom_summary} {primary_symptom} {additional_symptoms} ".lower()
    # Build a small set of query terms (words that might appear in guidelines)
    words = [w for w in text.split() if len(w) > 2]
    docs = _load_texts()
    if not docs:
        return ""
    best_chunk = ""
    best_score = 0
    for _name, content in docs:
        content_lower = content.lower()
        score = sum(1 for w in words if w in content_lower)
        if score > best_score:
            best_score = score
            # Take first MAX_EXCERPT_CHARS of this doc as excerpt
            best_chunk = content[:MAX_EXCERPT_CHARS].strip()
            if len(content) > MAX_EXCERPT_CHARS:
                best_chunk += "..."
    if not best_chunk:
        # No match: return first doc snippet as generic context
        if docs:
            best_chunk = docs[0][1][:MAX_EXCERPT_CHARS].strip()
            if len(docs[0][1]) > MAX_EXCERPT_CHARS:
                best_chunk += "..."
    return best_chunk
