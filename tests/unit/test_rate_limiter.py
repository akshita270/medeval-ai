from unittest.mock import Mock

import pytest
from fastapi import HTTPException

from app.rate_limiter import RateLimiter, enforce_rate_limit


class TestRateLimiter:
    def test_allows_requests_under_the_limit(self):
        limiter = RateLimiter(max_requests=3, window_seconds=60)
        limiter.check("client-a")
        limiter.check("client-a")
        limiter.check("client-a")  # 3rd request still within the limit

    def test_blocks_the_request_that_exceeds_the_limit(self):
        limiter = RateLimiter(max_requests=2, window_seconds=60)
        limiter.check("client-a")
        limiter.check("client-a")
        with pytest.raises(HTTPException) as exc_info:
            limiter.check("client-a")
        assert exc_info.value.status_code == 429
        assert "Retry-After" in exc_info.value.headers

    def test_tracks_each_client_independently(self):
        limiter = RateLimiter(max_requests=1, window_seconds=60)
        limiter.check("client-a")
        limiter.check("client-b")  # different client, own budget -- must not raise

    def test_zero_max_requests_disables_the_limiter(self):
        limiter = RateLimiter(max_requests=0, window_seconds=60)
        for _ in range(100):
            limiter.check("client-a")  # never raises

    def test_a_hit_outside_the_window_is_forgotten(self):
        limiter = RateLimiter(max_requests=1, window_seconds=60)
        limiter.check("client-a")
        # Simulate time passing by manually aging the recorded hit past
        # the window, instead of sleeping in a test.
        limiter._hits["client-a"][0] -= 61
        limiter.check("client-a")  # must not raise -- the old hit expired


class TestEnforceRateLimitDependency:
    def _request(self, limiter: RateLimiter | None, client_host: str = "1.2.3.4"):
        request = Mock()
        request.app.state.rate_limiter = limiter
        request.client.host = client_host
        return request

    def test_no_limiter_configured_is_a_no_op(self):
        request = Mock()
        request.app.state = Mock(spec=[])  # no rate_limiter attribute at all, e.g. before lifespan ran
        enforce_rate_limit(request)  # must not raise

    def test_delegates_to_the_configured_limiter(self):
        limiter = RateLimiter(max_requests=1, window_seconds=60)
        request = self._request(limiter)
        enforce_rate_limit(request)  # 1st call: allowed
        with pytest.raises(HTTPException):
            enforce_rate_limit(request)  # 2nd call: blocked

    def test_falls_back_to_unknown_when_client_is_absent(self):
        limiter = RateLimiter(max_requests=1, window_seconds=60)
        request = Mock()
        request.app.state.rate_limiter = limiter
        request.client = None
        enforce_rate_limit(request)  # must not raise -- "unknown" is a valid bucket key
