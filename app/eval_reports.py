"""Read-only access to the evaluation run reports already written to disk
by scripts/run_evaluation.py (see evaluation/judge/schema.py for the
EvaluationReport shape), so the frontend's Evaluation Lab and Experiments
pages can show real past runs instead of invented ones.

Deliberately read-only: there is no endpoint here that triggers a new
run. Doing that from a public, unauthenticated API would let anyone on
the internet spend this project's OpenAI budget with no limit.
"""

from pathlib import Path

from evaluation.golden_dataset.schema import load_golden_dataset
from evaluation.judge.schema import EvaluationReport

_RUNS_DIR = Path("evaluation/regression/runs")
_BASELINE_PATH = Path("evaluation/regression/baseline/baseline_v1.json")


class EvalRunNotFoundError(Exception):
    pass


def _friendly_label(stem: str, is_baseline: bool, retrieval_config) -> str:
    """Includes the real retrieval_top_k from the report itself (not
    guessed from the filename) -- two runs can share the same "dense"/
    "hybrid" filename pattern while using a different top_k (that's
    exactly what happened with the baseline vs. the top_k=8 ablation
    run, both named "dense"), so the label must show it explicitly or a
    viewer has no way to tell the configs apart.
    """
    parts = []
    if is_baseline:
        parts.append("Approved baseline")
    else:
        if "hybrid" in stem:
            parts.append("Hybrid retrieval")
        elif "dense" in stem:
            parts.append("Dense retrieval")
        if "rerank" in stem:
            parts.append("+ reranking")
        if "routed" in stem:
            parts.append("+ model routing")
    label = " ".join(parts) if parts else stem
    # Several frontend components derive a "short name" via
    # `label.split(" (")[0]` (charts, comparison view) -- top_k must land
    # before the first "(" or those short names collapse back to e.g.
    # "Dense retrieval" for both a top_k=5 and a top_k=8 run, silently
    # reintroducing the exact ambiguity this field exists to remove.
    if retrieval_config is not None and retrieval_config.retrieval_top_k is not None:
        label = f"{label}, top_k={retrieval_config.retrieval_top_k}"
    return f"{label} (10-question sample)" if "sample10" in stem else f"{label} (full 30-question set)"


def _discover_runs() -> dict[str, Path]:
    """run_id -> file path, for every run file that actually exists on
    disk right now. Rebuilt on every call (cheap -- a handful of small
    JSON files) so a run added or removed shows up without a restart,
    and so get_eval_run() only ever opens a path this scan itself found
    -- never one built from unsanitized user input.
    """
    runs: dict[str, Path] = {}
    if _BASELINE_PATH.exists():
        runs["baseline"] = _BASELINE_PATH
    if _RUNS_DIR.is_dir():
        for path in sorted(_RUNS_DIR.glob("*.json")):
            runs[path.stem] = path
    return runs


def _summarize(run_id: str, path: Path) -> dict:
    report = EvaluationReport.model_validate_json(path.read_text())
    overall_score = (
        sum(m.mean_score for m in report.metric_summaries) / len(report.metric_summaries)
        if report.metric_summaries
        else 0.0
    )
    return {
        "run_id": run_id,
        "label": _friendly_label(run_id, is_baseline=run_id == "baseline", retrieval_config=report.retrieval_config),
        "is_baseline": run_id == "baseline",
        "retrieval_config": report.retrieval_config.model_dump() if report.retrieval_config else None,
        "total_questions": report.total_questions,
        "overall_score": round(overall_score, 4),
        "metric_summaries": [m.model_dump() for m in report.metric_summaries],
        "total_cost_usd": report.total_cost_usd,
        "total_prompt_tokens": report.total_prompt_tokens,
        "total_completion_tokens": report.total_completion_tokens,
        "total_generation_latency_seconds": report.total_generation_latency_seconds,
        # Generation is one model per run in practice (model routing picks per-question,
        # but every sample run on disk so far used a single model throughout) -- the first
        # result's model is a reasonable real label without fetching full run detail.
        "generation_model": report.results[0].generation_model if report.results else "",
        "generated_at": path.stat().st_mtime,
    }


def list_eval_runs() -> list[dict]:
    """Every real run on disk, newest first."""
    runs = _discover_runs()
    summaries = [_summarize(run_id, path) for run_id, path in runs.items()]
    return sorted(summaries, key=lambda r: r["generated_at"], reverse=True)


def get_eval_run(run_id: str) -> dict:
    """Full per-question detail for one run, with each result's real
    question text joined in from the golden dataset (EvaluationResult
    itself only stores question_id, not the question). Raises
    EvalRunNotFoundError for any run_id not found in this instant's
    directory scan -- the only way a path ever reaches disk here, which
    is what rules out path traversal from a caller-supplied run_id.
    """
    runs = _discover_runs()
    path = runs.get(run_id)
    if path is None:
        raise EvalRunNotFoundError(run_id)

    report = EvaluationReport.model_validate_json(path.read_text())
    dataset_path = Path(f"evaluation/golden_dataset/{report.dataset_version}/questions.jsonl")
    golden_questions = {q.question_id: q for q in load_golden_dataset(dataset_path)} if dataset_path.exists() else {}

    report_dict = report.model_dump()
    for result in report_dict["results"]:
        golden = golden_questions.get(result["question_id"])
        result["question"] = golden.question if golden else ""
        result["expected_answer"] = golden.expected_answer if golden else ""
    return report_dict
