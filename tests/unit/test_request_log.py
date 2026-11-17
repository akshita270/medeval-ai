from app.request_log import RequestLog, RequestLogEntry


def _log(tmp_path):
    return RequestLog(tmp_path / "requests.db")


def test_overview_with_no_requests_is_all_zero(tmp_path):
    log = _log(tmp_path)
    overview = log.overview()
    assert overview == {
        "total_requests": 0,
        "blocked_requests": 0,
        "avg_latency_ms": 0,
        "total_prompt_tokens": 0,
        "total_completion_tokens": 0,
        "total_cost_usd": 0.0,
    }


def test_overview_aggregates_logged_requests(tmp_path):
    log = _log(tmp_path)
    log.log(
        RequestLogEntry(
            "gpt-5-mini", latency_ms=100.0, prompt_tokens=1000, completion_tokens=500, blocked=False, cache_hit=False
        )
    )
    log.log(
        RequestLogEntry(
            "gpt-5-mini", latency_ms=200.0, prompt_tokens=0, completion_tokens=0, blocked=True, cache_hit=False
        )
    )

    overview = log.overview()
    assert overview["total_requests"] == 2
    assert overview["blocked_requests"] == 1
    assert overview["avg_latency_ms"] == 150.0
    assert overview["total_prompt_tokens"] == 1000
    assert overview["total_cost_usd"] > 0


def test_daily_series_buckets_by_day_and_skips_empty_days(tmp_path):
    log = _log(tmp_path)
    log.log(
        RequestLogEntry(
            "gpt-4o-mini", latency_ms=50.0, prompt_tokens=100, completion_tokens=50, blocked=False, cache_hit=False
        )
    )

    series = log.daily_series(days=14)
    assert len(series) == 1
    assert series[0]["requests"] == 1
    assert series[0]["total_tokens"] == 150
    assert series[0]["cost_usd"] > 0


def test_daily_series_excludes_requests_older_than_window(tmp_path, monkeypatch):
    import time

    log = _log(tmp_path)
    old_time = time.time() - 30 * 86400
    monkeypatch.setattr(time, "time", lambda: old_time)
    log.log(
        RequestLogEntry(
            "gpt-5-mini", latency_ms=10.0, prompt_tokens=10, completion_tokens=5, blocked=False, cache_hit=False
        )
    )
    monkeypatch.undo()

    assert log.daily_series(days=14) == []


def test_guardrail_event_counts_tallies_blocked_reasons(tmp_path):
    log = _log(tmp_path)
    log.log(
        RequestLogEntry(
            "gpt-5-mini",
            latency_ms=10.0,
            prompt_tokens=0,
            completion_tokens=0,
            blocked=True,
            cache_hit=False,
            blocked_reasons=("prompt_injection",),
        )
    )
    log.log(
        RequestLogEntry(
            "gpt-5-mini",
            latency_ms=10.0,
            prompt_tokens=0,
            completion_tokens=0,
            blocked=True,
            cache_hit=False,
            blocked_reasons=("prompt_injection", "patient_identifier"),
        )
    )
    log.log(
        RequestLogEntry(
            "gpt-5-mini",
            latency_ms=10.0,
            prompt_tokens=100,
            completion_tokens=50,
            blocked=False,
            cache_hit=False,
        )
    )

    counts = {c["category"]: c["count"] for c in log.guardrail_event_counts()}
    assert counts == {"prompt_injection": 2, "patient_identifier": 1}
