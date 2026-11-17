"""Read-only proxy for this project's real GitHub Actions run history,
so the frontend's Pipeline page shows real CI status (including real
failures) instead of an invented one. No GitHub token is needed: Actions
run history on a public repo is readable anonymously, just rate-limited
harder than an authenticated call would be.
"""

import httpx

from app.config import Settings


class CiStatusError(Exception):
    pass


def get_recent_ci_runs(settings: Settings, limit: int = 15) -> list[dict]:
    url = f"https://api.github.com/repos/{settings.github_repo}/actions/runs"
    try:
        response = httpx.get(
            url,
            params={"per_page": limit},
            timeout=10.0,
            headers={"Accept": "application/vnd.github+json"},
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        raise CiStatusError(f"Couldn't reach GitHub Actions for {settings.github_repo}: {exc}") from exc

    data = response.json()
    return [
        {
            "id": run["id"],
            "name": run["name"],
            "status": run["status"],
            "conclusion": run["conclusion"],
            "branch": run["head_branch"],
            "commit_sha": run["head_sha"][:7],
            "commit_message": run.get("display_title", ""),
            "triggered_by": run.get("actor", {}).get("login", ""),
            "run_number": run["run_number"],
            "event": run["event"],
            "created_at": run["created_at"],
            "updated_at": run["updated_at"],
            "html_url": run["html_url"],
        }
        for run in data.get("workflow_runs", [])
    ]


def get_ci_run_jobs(settings: Settings, run_id: int) -> list[dict]:
    """Real per-job, per-step breakdown of one workflow run, for the
    Pipeline page's "latest run" step-by-step view.
    """
    url = f"https://api.github.com/repos/{settings.github_repo}/actions/runs/{run_id}/jobs"
    try:
        response = httpx.get(url, timeout=10.0, headers={"Accept": "application/vnd.github+json"})
        response.raise_for_status()
    except httpx.HTTPError as exc:
        raise CiStatusError(f"Couldn't reach GitHub Actions for {settings.github_repo}: {exc}") from exc

    data = response.json()
    return [
        {
            "name": job["name"],
            "status": job["status"],
            "conclusion": job["conclusion"],
            "started_at": job.get("started_at"),
            "completed_at": job.get("completed_at"),
            "steps": [
                {"name": step["name"], "status": step["status"], "conclusion": step["conclusion"]}
                for step in job.get("steps", [])
            ],
        }
        for job in data.get("jobs", [])
    ]
