"""Aggregates per-question EvaluationResults into an EvaluationReport.

Pure aggregation, no LLM calls, no judgment of its own -- this only
computes means and sums over results judge_service.py already produced.
"""

from evaluation.judge.schema import EvaluationReport, EvaluationResult, MetricName, MetricSummary


def build_report(dataset_version: str, results: list[EvaluationResult]) -> EvaluationReport:
    scores_by_metric: dict[MetricName, list[float]] = {}
    for result in results:
        for metric_score in result.metric_scores:
            scores_by_metric.setdefault(metric_score.metric, []).append(metric_score.score)

    metric_summaries = [
        MetricSummary(metric=metric, mean_score=sum(scores) / len(scores), count=len(scores))
        for metric, scores in scores_by_metric.items()
    ]

    # None (not 0) if any underlying result lacks a real measurement --
    # silently treating "unmeasured" as "zero seconds" would understate
    # the total rather than honestly flagging the gap.
    generation_latencies = [r.generation_latency_seconds for r in results]
    total_generation_latency = None if any(g is None for g in generation_latencies) else sum(generation_latencies)

    return EvaluationReport(
        dataset_version=dataset_version,
        total_questions=len(results),
        metric_summaries=metric_summaries,
        total_failed_metric_calls=sum(len(r.failed_metrics) for r in results),
        total_cost_usd=sum(r.estimated_cost_usd for r in results),
        total_judge_latency_seconds=sum(r.judge_latency_seconds for r in results),
        total_generation_latency_seconds=total_generation_latency,
        total_prompt_tokens=sum(r.prompt_tokens for r in results),
        total_completion_tokens=sum(r.completion_tokens for r in results),
        results=results,
    )
