from functools import lru_cache

from openai import OpenAI

from app.config import get_settings


@lru_cache
def get_openai_client() -> OpenAI:
    """One cached OpenAI client shared by embeddings and chat generation.

    Both call sites need the same api_key from Settings; a single cached
    client avoids opening a second connection pool for no reason.
    """
    return OpenAI(api_key=get_settings().openai_api_key)
