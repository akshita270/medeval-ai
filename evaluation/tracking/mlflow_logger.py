"""Logs one evaluation run to a local MLflow tracking store.

This is a thin logging layer called only from scripts/run_evaluation.py --
it never sits in the request path and never requires a managed MLflow
service. Everything lives in ./mlruns on disk (gitignored, since it's a
generated artifact store, not source).
"""

import subprocess
from pathlib import Path

import mlflow

from app.config import Settings
from evaluation.guardrails.report import AdversarialReport
from evaluation.judge.schema import EvaluationReport

_PROMPTS_DIR = Path(__file__).parent.parent.parent / "app" / "generation" / "prompts"

_EXPERIMENT_NAME = "medeval-ai-rag-evaluation"
# Its own experiment, separate from the RAG-quality one above -- this
# measures guardrail behavior (did the pipeline block what it should
# have?), not answer quality, and mixing the two would make neither
# trend clearly comparable over time.
_ADVERSARIAL_EXPERIMENT_NAME = "medeval-ai-guardrails"


def _get_git_commit() -> str:
    try:
        return subprocess.check_output(["git", "rev-parse", "HEAD"], text=True, stderr=subprocess.DEVNULL).strip()
    except subprocess.CalledProcessError:
        # No commits yet, or not a git repo at all -- a real, expected
        # state early in a project, not something to crash the run over.
        return "uncommitted"


def _log_prompt_artifact(prompt_version: str) -> None:
    """Logs the actual system-prompt text for this run, not just its
    version label. `prompt_version` (e.g. "v1") only proves the wording
    didn't change if someone remembers to bump it whenever they edit the
    prompt file -- storing the real text here means a run is always
    provably tied to the exact wording that produced it, version-bump
    discipline or not.
    """
    prompt_path = _PROMPTS_DIR / f"{prompt_version}.txt"
    try:
        prompt_text = prompt_path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return
    mlflow.log_text(prompt_text, f"prompts/{prompt_version}.txt")


def log_evaluation_run(report: EvaluationReport, settings: Settings, strategy_label: str) -> str:
    """Log one EvaluationReport as one MLflow run. Returns the run_id."""
    # As of MLflow 3.x, the pure filesystem backend ("file:./mlruns") is in
    # maintenance mode and refuses new writes by default. A local SQLite
    # file is still fully local (no managed service, no network) and is
    # MLflow's own current recommendation -- not a workaround.
    mlflow.set_tracking_uri("sqlite:///mlflow.db")
    mlflow.set_experiment(_EXPERIMENT_NAME)

    with mlflow.start_run(run_name=f"{report.dataset_version}_{strategy_label}") as run:
        mlflow.log_params(
            {
                "dataset_version": report.dataset_version,
                "llm_model": settings.llm_model,
                "embedding_model": settings.embedding_model,
                "judge_model": settings.judge_model,
                "prompt_version": settings.prompt_version,
                "chunk_size": settings.chunk_size,
                "chunk_overlap": settings.chunk_overlap,
                "retrieval_top_k": settings.retrieval_top_k,
                "retrieval_strategy": strategy_label,
                "use_hybrid_retrieval": settings.use_hybrid_retrieval,
                "use_reranking": settings.use_reranking,
                "use_model_routing": settings.use_model_routing,
                "routing_simple_model": settings.routing_simple_model if settings.use_model_routing else "",
                "git_commit": _get_git_commit(),
            }
        )
        _log_prompt_artifact(settings.prompt_version)

        for summary in report.metric_summaries:
            mlflow.log_metric(summary.metric.value, summary.mean_score)
            mlflow.log_metric(f"{summary.metric.value}_count", summary.count)

        if settings.use_model_routing and report.total_questions:
            # The actual signal for validating routing: what fraction of
            # questions got sent to the cheap model, read back together
            # with the metric means above -- did quality hold up at this
            # routing rate, not just "routing was on."
            routed_count = sum(1 for r in report.results if r.generation_model == settings.routing_simple_model)
            mlflow.log_metric("pct_routed_to_simple_model", routed_count / report.total_questions)

        mlflow.log_metric("total_questions", report.total_questions)
        mlflow.log_metric("total_failed_metric_calls", report.total_failed_metric_calls)
        mlflow.log_metric("total_cost_usd", report.total_cost_usd)
        mlflow.log_metric("total_judge_latency_seconds", report.total_judge_latency_seconds)
        if report.total_generation_latency_seconds is not None:
            mlflow.log_metric("total_generation_latency_seconds", report.total_generation_latency_seconds)
            if report.total_questions:
                mlflow.log_metric(
                    "mean_generation_latency_seconds",
                    report.total_generation_latency_seconds / report.total_questions,
                )
        mlflow.log_metric("total_prompt_tokens", report.total_prompt_tokens)
        mlflow.log_metric("total_completion_tokens", report.total_completion_tokens)

        # Full per-question detail, plus specifically the failed/low-scoring
        # questions pulled out on their own -- the brief wants failed-question
        # examples saved as artifacts, not just buried in the full report.
        mlflow.log_dict(report.model_dump(mode="json"), "full_report.json")

        flagged = [
            r.model_dump(mode="json")
            for r in report.results
            if r.failed_metrics or any(s.score < 0.5 for s in r.metric_scores)
        ]
        mlflow.log_dict({"flagged_questions": flagged}, "flagged_questions.json")

        return run.info.run_id


def log_adversarial_run(report: AdversarialReport, settings: Settings) -> str:
    """Log one AdversarialReport (the guardrail/adversarial test suite's
    result) as one MLflow run, so guardrail behavior is tracked and
    comparable over time the same way RAG-quality evaluations already
    are -- not just written to a JSON file and forgotten.
    """
    mlflow.set_tracking_uri("sqlite:///mlflow.db")
    mlflow.set_experiment(_ADVERSARIAL_EXPERIMENT_NAME)

    with mlflow.start_run(run_name=f"adversarial_{report.dataset_version}") as run:
        mlflow.log_params(
            {
                "dataset_version": report.dataset_version,
                "llm_model": settings.llm_model,
                "guardrail_model": settings.guardrail_model,
                "prompt_version": settings.prompt_version,
                "min_topic_relevance_score": settings.min_topic_relevance_score,
                "rate_limit_requests_per_minute": settings.rate_limit_requests_per_minute,
                "git_commit": _get_git_commit(),
            }
        )
        _log_prompt_artifact(settings.prompt_version)

        mlflow.log_metric("total_cases", report.total_cases)
        mlflow.log_metric("total_passed", report.total_passed)
        mlflow.log_metric("total_failed", report.total_failed)
        mlflow.log_metric("pass_rate", report.pass_rate)

        # Per-category pass rate too, so a regression in (say) prompt-
        # injection detection specifically is visible on its own, not
        # just averaged away inside the overall pass rate.
        by_category: dict[str, list] = {}
        for result in report.results:
            by_category.setdefault(result.category, []).append(result)
        for category, results in by_category.items():
            passed = sum(1 for r in results if r.passed)
            mlflow.log_metric(f"pass_rate_{category}", passed / len(results))

        mlflow.log_dict(report.model_dump(mode="json"), "adversarial_report.json")

        failed = [r.model_dump(mode="json") for r in report.results if not r.passed]
        mlflow.log_dict({"failed_cases": failed}, "failed_cases.json")

        return run.info.run_id
