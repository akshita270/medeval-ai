from fastapi import Header, HTTPException

from app.config import get_settings


def require_api_key(x_api_key: str | None = Header(default=None)) -> None:
    """Gate on a shared secret so the paid /ask endpoint can't be hit by
    anyone who finds the public URL. Empty api_key in settings means auth
    is off (local dev with no .env override) -- same opt-in convention as
    llm_cache_enabled/use_hybrid_retrieval elsewhere in this config.
    """
    settings = get_settings()
    if not settings.api_key:
        return
    if x_api_key != settings.api_key:
        raise HTTPException(status_code=401, detail="Missing or invalid API key")
