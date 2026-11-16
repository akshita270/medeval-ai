"""A simple in-process, sliding-window rate limiter keyed by client id.

In-memory and per-process by design -- matching this project's "local,
no managed service" approach elsewhere (MLflow's SQLite backend is the
same idea) rather than reaching for Redis for a single-instance demo
app. State resets on restart and is not shared across multiple worker
processes; a real multi-instance deployment would need a shared store
(e.g. Redis) instead.
"""

import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import HTTPException, Request, status


class RateLimiter:
    """Allows at most `max_requests` per client within a rolling
    `window_seconds` window. `max_requests <= 0` makes every check a
    no-op, so tests can disable rate limiting outright instead of
    sharing mutable state across unrelated test cases.
    """

    def __init__(self, max_requests: int, window_seconds: float):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def check(self, client_id: str) -> None:
        """Raises HTTPException(429) if `client_id` is already at the
        limit within the current window; otherwise records this hit and
        lets the request through.
        """
        if self.max_requests <= 0:
            return

        now = time.monotonic()
        with self._lock:
            hits = self._hits[client_id]
            # Drop hits that have aged out of the window before counting
            # -- a deque so this is O(expired), not O(all hits ever seen).
            while hits and now - hits[0] > self.window_seconds:
                hits.popleft()

            if len(hits) >= self.max_requests:
                retry_after = max(1, int(self.window_seconds - (now - hits[0])))
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=(
                        f"Rate limit exceeded: max {self.max_requests} requests "
                        f"per {int(self.window_seconds)}s. Try again later."
                    ),
                    headers={"Retry-After": str(retry_after)},
                )

            hits.append(now)


def enforce_rate_limit(request: Request) -> None:
    """FastAPI dependency: blocks a request once its client exceeds the
    limit configured on `app.state.rate_limiter` (set up in main.py's
    lifespan). Keyed by client IP -- the only identity this app has
    without an auth/API-key layer.
    """
    limiter: RateLimiter | None = getattr(request.app.state, "rate_limiter", None)
    if limiter is None:
        return
    client_id = request.client.host if request.client else "unknown"
    limiter.check(client_id)
