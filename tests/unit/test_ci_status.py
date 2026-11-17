from unittest.mock import Mock, patch

import httpx
import pytest

from app.ci_status import CiStatusError, get_ci_run_jobs, get_recent_ci_runs
from app.config import Settings


def _settings(**overrides):
    defaults = dict(openai_api_key="test", github_repo="someone/somerepo")
    defaults.update(overrides)
    return Settings(**defaults)


def test_get_recent_ci_runs_parses_github_response():
    fake_response = Mock()
    fake_response.raise_for_status = Mock()
    fake_response.json.return_value = {
        "workflow_runs": [
            {
                "id": 1,
                "name": "PR Checks",
                "status": "completed",
                "conclusion": "success",
                "head_branch": "main",
                "head_sha": "abcdef1234567890",
                "display_title": "Fix the thing",
                "actor": {"login": "someone"},
                "run_number": 42,
                "event": "push",
                "created_at": "2026-01-01T00:00:00Z",
                "updated_at": "2026-01-01T00:05:00Z",
                "html_url": "https://github.com/someone/somerepo/actions/runs/1",
            }
        ]
    }

    with patch("app.ci_status.httpx.get", return_value=fake_response) as mock_get:
        runs = get_recent_ci_runs(_settings(), limit=5)

    assert mock_get.call_args.args[0] == "https://api.github.com/repos/someone/somerepo/actions/runs"
    assert len(runs) == 1
    assert runs[0]["conclusion"] == "success"
    assert runs[0]["run_number"] == 42
    assert runs[0]["commit_sha"] == "abcdef1"
    assert runs[0]["triggered_by"] == "someone"


def test_get_recent_ci_runs_raises_a_clear_error_on_network_failure():
    with patch("app.ci_status.httpx.get", side_effect=httpx.ConnectError("boom")):
        with pytest.raises(CiStatusError):
            get_recent_ci_runs(_settings())


def test_get_ci_run_jobs_parses_job_and_step_detail():
    fake_response = Mock()
    fake_response.raise_for_status = Mock()
    fake_response.json.return_value = {
        "jobs": [
            {
                "name": "Lint and test",
                "status": "completed",
                "conclusion": "success",
                "started_at": "2026-01-01T00:00:00Z",
                "completed_at": "2026-01-01T00:02:00Z",
                "steps": [{"name": "Run ruff", "status": "completed", "conclusion": "success"}],
            }
        ]
    }

    with patch("app.ci_status.httpx.get", return_value=fake_response) as mock_get:
        jobs = get_ci_run_jobs(_settings(), run_id=1)

    assert mock_get.call_args.args[0] == "https://api.github.com/repos/someone/somerepo/actions/runs/1/jobs"
    assert jobs[0]["name"] == "Lint and test"
    assert jobs[0]["steps"][0]["name"] == "Run ruff"


def test_get_ci_run_jobs_raises_a_clear_error_on_network_failure():
    with patch("app.ci_status.httpx.get", side_effect=httpx.ConnectError("boom")):
        with pytest.raises(CiStatusError):
            get_ci_run_jobs(_settings(), run_id=1)
