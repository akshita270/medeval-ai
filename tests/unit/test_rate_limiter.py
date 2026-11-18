from unittest.mock import Mock

import pytest
from fastapi import HTTPException

from app.rate_limiter import RateLimiter, _client_ip, enforce_rate_limit


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
    def _request(self, limiter: RateLimiter | None, client_host: str = "1.2.3.4", headers: dict | None = None):
        request = Mock()
        request.app.state.rate_limiter = limiter
        request.client.host = client_host
        request.headers = headers or {}
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
        request.headers = {}
        enforce_rate_limit(request)  # must not raise -- "unknown" is a valid bucket key


class TestClientIp:
    def _request(self, client_host: str | None = "1.2.3.4", headers: dict | None = None):
        request = Mock()
        if client_host is None:
            request.client = None
        else:
            request.client.host = client_host
        request.headers = headers or {}
        return request

    def test_uses_direct_client_host_when_no_forwarded_header(self):
        request = self._request(client_host="9.9.9.9")
        assert _client_ip(request) == "9.9.9.9"

    def test_prefers_x_forwarded_for_over_the_proxy_s_own_ip(self):
        # request.client.host would be the proxy's own IP here -- the real
        # caller is only recoverable from the header it set.
        request = self._request(client_host="10.0.0.1", headers={"x-forwarded-for": "203.0.113.5"})
        assert _client_ip(request) == "203.0.113.5"

    def test_uses_the_left_most_entry_of_a_multi_hop_forwarded_chain(self):
        request = self._request(headers={"x-forwarded-for": "203.0.113.5, 10.0.0.1, 10.0.0.2"})
        assert _client_ip(request) == "203.0.113.5"

    def test_falls_back_to_unknown_when_neither_is_available(self):
        request = self._request(client_host=None)
        assert _client_ip(request) == "unknown"
