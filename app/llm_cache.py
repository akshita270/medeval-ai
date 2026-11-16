"""A simple, local SQLite cache for LLM API responses, keyed by a hash of
the exact inputs that determine the response.

Applied to the calls where a repeated identical input is common and a
cached answer is pure upside -- live generation (generate_answer),
the guardrail Layer-2 classifier (check_semantic_intent /
check_output_safety), and embeddings (embed_texts). Deliberately never
applied to the judge/evaluation path: the quality gate depends on a
fresh, independent score every run, and a cached judge score could
silently mask a real regression instead of catching it.

Off by default (`llm_cache_enabled=False`) -- the same ablation-toggle
convention Settings already uses for use_hybrid_retrieval/use_reranking
-- and local SQLite by design, the same "no managed service" approach
MLflow's own tracking store already uses elsewhere in this project.
"""

import hashlib
import json
import sqlite3
from collections.abc import Callable
from functools import lru_cache
from pathlib import Path
from threading import Lock
from typing import Any

from app.config import Settings


class LLMCache:
    """Exact-match cache_key -> JSON-serializable value, backed by one
    SQLite table. A single process-wide Lock serializes access -- a
    sqlite3 connection isn't safe to share across threads without one,
    and FastAPI's sync endpoints run in a threadpool.
    """

    def __init__(self, db_path: Path):
        db_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = Lock()
        self._conn = sqlite3.connect(db_path, check_same_thread=False)
        with self._lock:
            self._conn.execute("CREATE TABLE IF NOT EXISTS llm_cache (cache_key TEXT PRIMARY KEY, value_json TEXT)")
            self._conn.commit()

    def get(self, cache_key: str) -> Any | None:
        with self._lock:
            row = self._conn.execute("SELECT value_json FROM llm_cache WHERE cache_key = ?", (cache_key,)).fetchone()
        return json.loads(row[0]) if row else None

    def set(self, cache_key: str, value: Any) -> None:
        with self._lock:
            self._conn.execute(
                "INSERT OR REPLACE INTO llm_cache (cache_key, value_json) VALUES (?, ?)",
                (cache_key, json.dumps(value)),
            )
            self._conn.commit()


def make_cache_key(*parts: Any) -> str:
    """Deterministic SHA-256 hash of `parts`, canonically JSON-encoded.

    `sort_keys=True` only affects dict key order within a part -- the
    order of `parts` themselves, and of any list passed as one part
    (e.g. an ordered list of retrieved chunk_ids), is preserved exactly
    as given, since that order can genuinely change what a prompt says.
    """
    canonical = json.dumps(parts, sort_keys=True, default=str)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


@lru_cache
def get_llm_cache(db_path: str) -> LLMCache:
    """One cached LLMCache (and its one sqlite3 connection) per distinct
    db_path for the process's lifetime -- mirrors get_openai_client()'s
    cached-singleton shape in app/llm_client.py. Keyed by path (a plain
    string, hashable) rather than a Settings object, so tests pointing
    at different temp paths each get their own isolated cache.
    """
    return LLMCache(Path(db_path))


def get_cache_for_settings(settings: Settings) -> LLMCache | None:
    """Returns the shared LLMCache for `settings.llm_cache_db_path` if
    `settings.llm_cache_enabled`, else None. The single place that turns
    the ablation-toggle setting into the `cache` object (or lack of one)
    every call site passes to cached_call().
    """
    if not settings.llm_cache_enabled:
        return None
    return get_llm_cache(str(settings.llm_cache_db_path))


def cached_call(
    cache: LLMCache | None,
    key_parts: tuple[Any, ...],
    compute: Callable[[], dict[str, Any]],
) -> tuple[dict[str, Any], bool]:
    """Runs `compute()` and caches its JSON-serializable dict result
    under a key derived from `key_parts`. `cache=None` (the caller's way
    of expressing "caching is disabled") always calls `compute()` fresh
    and never touches a cache at all. Returns (result_dict, was_cache_hit).
    """
    if cache is None:
        return compute(), False

    key = make_cache_key(*key_parts)
    hit = cache.get(key)
    if hit is not None:
        return hit, True

    result = compute()
    cache.set(key, result)
    return result, False
