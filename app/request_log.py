"""Local SQLite log of every /ask call, used to power the frontend's
Dashboard and Monitoring pages with real traffic/latency/cost numbers
instead of invented ones.

Same "no managed service" local-SQLite pattern as app/llm_cache.py and
MLflow's own tracking store elsewhere in this project. Unlike that
cache, logging is never toggled off -- there's no ablation reason to
not record what actually happened.
"""

import sqlite3
import time
from dataclasses import dataclass
from datetime import UTC, datetime
from functools import lru_cache
from pathlib import Path
from threading import Lock

from app.pricing import estimate_cost_usd


@dataclass
class RequestLogEntry:
    model: str
    latency_ms: float
    prompt_tokens: int
    completion_tokens: int
    blocked: bool
    cache_hit: bool
    blocked_reasons: tuple[str, ...] = ()


class RequestLog:
    """One SQLite table of request records. A single process-wide Lock
    serializes access -- a sqlite3 connection isn't safe to share across
    threads without one, and FastAPI's sync endpoints run in a threadpool.
    """

    def __init__(self, db_path: Path):
        db_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = Lock()
        self._conn = sqlite3.connect(db_path, check_same_thread=False)
        with self._lock:
            self._conn.execute(
                """
                CREATE TABLE IF NOT EXISTS requests (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ts REAL NOT NULL,
                    model TEXT NOT NULL,
                    latency_ms REAL NOT NULL,
                    prompt_tokens INTEGER NOT NULL,
                    completion_tokens INTEGER NOT NULL,
                    blocked INTEGER NOT NULL,
                    cache_hit INTEGER NOT NULL,
                    blocked_reasons TEXT NOT NULL DEFAULT ''
                )
                """
            )
            self._conn.commit()

    def log(self, entry: RequestLogEntry) -> None:
        with self._lock:
            self._conn.execute(
                "INSERT INTO requests "
                "(ts, model, latency_ms, prompt_tokens, completion_tokens, blocked, cache_hit, blocked_reasons) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    time.time(),
                    entry.model,
                    entry.latency_ms,
                    entry.prompt_tokens,
                    entry.completion_tokens,
                    int(entry.blocked),
                    int(entry.cache_hit),
                    ",".join(entry.blocked_reasons),
                ),
            )
            self._conn.commit()

    def overview(self) -> dict:
        """Aggregate stats across every request ever logged (the real
        numbers behind the Dashboard page's KPI cards).
        """
        with self._lock:
            row = self._conn.execute(
                "SELECT COUNT(*), COALESCE(SUM(blocked), 0), COALESCE(AVG(latency_ms), 0) FROM requests"
            ).fetchone()
            cost_rows = self._conn.execute("SELECT model, prompt_tokens, completion_tokens FROM requests").fetchall()

        total_requests, blocked_requests, avg_latency_ms = row
        total_prompt_tokens = sum(r[1] for r in cost_rows)
        total_completion_tokens = sum(r[2] for r in cost_rows)
        total_cost_usd = sum(estimate_cost_usd(model, pt, ct) for model, pt, ct in cost_rows)

        return {
            "total_requests": total_requests,
            "blocked_requests": blocked_requests,
            "avg_latency_ms": round(avg_latency_ms, 1),
            "total_prompt_tokens": total_prompt_tokens,
            "total_completion_tokens": total_completion_tokens,
            "total_cost_usd": round(total_cost_usd, 6),
        }

    def daily_series(self, days: int = 14) -> list[dict]:
        """One row per UTC calendar day with at least one request, for
        the Monitoring page's trend charts. Days with zero requests are
        omitted rather than padded with fake zeros -- a brand-new
        deployment has a short, honestly-short history, not 14 days of
        invented flat lines.
        """
        cutoff = time.time() - days * 86400
        with self._lock:
            rows = self._conn.execute(
                "SELECT ts, model, latency_ms, prompt_tokens, completion_tokens, blocked "
                "FROM requests WHERE ts >= ? ORDER BY ts",
                (cutoff,),
            ).fetchall()

        buckets: dict[str, dict] = {}
        for ts, model, latency_ms, prompt_tokens, completion_tokens, blocked in rows:
            day = datetime.fromtimestamp(ts, tz=UTC).strftime("%Y-%m-%d")
            bucket = buckets.setdefault(
                day,
                {
                    "requests": 0,
                    "blocked": 0,
                    "latency_sum": 0.0,
                    "prompt_tokens": 0,
                    "completion_tokens": 0,
                    "cost_usd": 0.0,
                },
            )
            bucket["requests"] += 1
            bucket["blocked"] += blocked
            bucket["latency_sum"] += latency_ms
            bucket["prompt_tokens"] += prompt_tokens
            bucket["completion_tokens"] += completion_tokens
            bucket["cost_usd"] += estimate_cost_usd(model, prompt_tokens, completion_tokens)

        return [
            {
                "date": day,
                "requests": b["requests"],
                "blocked": b["blocked"],
                "avg_latency_ms": round(b["latency_sum"] / b["requests"], 1),
                "prompt_tokens": b["prompt_tokens"],
                "completion_tokens": b["completion_tokens"],
                "total_tokens": b["prompt_tokens"] + b["completion_tokens"],
                "cost_usd": round(b["cost_usd"], 6),
            }
            for day, b in sorted(buckets.items())
        ]

    def guardrail_event_counts(self) -> list[dict]:
        """How many logged requests each guardrail check has blocked,
        across this server's whole history -- for the Monitoring page's
        guardrail-activity chart.
        """
        with self._lock:
            rows = self._conn.execute(
                "SELECT blocked_reasons FROM requests WHERE blocked = 1 AND blocked_reasons != ''"
            ).fetchall()
        counts: dict[str, int] = {}
        for (reasons,) in rows:
            for reason in reasons.split(","):
                counts[reason] = counts.get(reason, 0) + 1
        return [{"category": category, "count": count} for category, count in sorted(counts.items())]


@lru_cache
def get_request_log(db_path: str) -> RequestLog:
    """One cached RequestLog (and its one sqlite3 connection) per
    distinct db_path for the process's lifetime -- mirrors
    app.llm_cache.get_llm_cache's cached-singleton shape. Keyed by path
    (a plain string, hashable) so tests pointing at different temp paths
    each get their own isolated log.
    """
    return RequestLog(Path(db_path))
