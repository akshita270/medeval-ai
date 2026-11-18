from functools import lru_cache

from openai import OpenAI

from app.config import get_settings


@lru_cache
def get_openai_client() -> OpenAI:
    """One cached OpenAI client shared by embeddings and chat generation.

    Both call sites need the same api_key from Settings; a single cached
    client avoids opening a second connection pool for no reason.
    """
    # Without an explicit timeout, the SDK's default is 600s -- a hung
    # OpenAI call would tie up a worker for ten minutes with nothing
    # graceful happening. 60s comfortably covers real observed generation
    # latency (~16-20s average per the README) with headroom, while still
    # failing a truly stuck call in a reasonable time. 2 retries (the
    # SDK's own backoff) absorb transient network/5xx errors without this
    # app needing its own retry loop.
    return OpenAI(api_key=get_settings().openai_api_key, timeout=60.0, max_retries=2)
