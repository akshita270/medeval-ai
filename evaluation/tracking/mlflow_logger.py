"""Logs one evaluation run to a local MLflow tracking store.

This is a thin logging layer called only from scripts/run_evaluation.py --
it never sits in the request path and never requires a managed MLflow
service. Everything lives in ./mlruns on disk (gitignored, since it's a
generated artifact store, not source).
"""

import subprocess

import mlflow

from app.config import Settings
from evaluation.judge.schema import EvaluationReport

_EXPERIMENT_NAME = "medeval-ai-rag-evaluation"


def _get_git_commit() -> str:
    try:
        return subprocess.check_output(["git", "rev-parse", "HEAD"], text=True, stderr=subprocess.DEVNULL).strip()
    except subprocess.CalledProcessError:
        # No commits yet, or not a git repo at all -- a real, expected
        # state early in a project, not something to crash the run over.
        return "uncommitted"


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
                "git_commit": _get_git_commit(),
            }
        )

        for summary in report.metric_summaries:
            mlflow.log_metric(summary.metric.value, summary.mean_score)
            mlflow.log_metric(f"{summary.metric.value}_count", summary.count)

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
