"""Compares a candidate evaluation run against the approved baseline and
applies configurable quality gates.

This does not prove clinical safety. It proves (or disproves) that a
candidate configuration did not measurably regress against the approved
baseline, on this specific golden dataset, under these specific
thresholds. Treat a passing gate as "no detected regression," never as
a safety certification.
"""

from app.config import Settings
from evaluation.judge.schema import EvaluationReport, MetricName
from evaluation.regression.schema import GateCheck, QualityGateResult, RegressionFinding


def find_regressions(
    baseline: EvaluationReport, candidate: EvaluationReport, max_regression_pct: float
) -> list[RegressionFinding]:
    """Per-question, per-metric comparison -- not aggregate means.

    A question missing from the baseline (e.g. the dataset grew) is not
    a regression candidate; there's nothing to compare it against. A
    baseline score of 0 is skipped to avoid a meaningless division --
    there's no percentage drop below zero.
    """
    baseline_by_question = {r.question_id: r for r in baseline.results}
    findings: list[RegressionFinding] = []

    for candidate_result in candidate.results:
        baseline_result = baseline_by_question.get(candidate_result.question_id)
        if baseline_result is None:
            continue

        baseline_scores = {s.metric: s.score for s in baseline_result.metric_scores}
        for candidate_score in candidate_result.metric_scores:
            baseline_score = baseline_scores.get(candidate_score.metric)
            if baseline_score is None or baseline_score <= 0:
                continue

            relative_drop = (baseline_score - candidate_score.score) / baseline_score
            if relative_drop > max_regression_pct:
                findings.append(
                    RegressionFinding(
                        question_id=candidate_result.question_id,
                        metric=candidate_score.metric,
                        baseline_score=baseline_score,
                        candidate_score=candidate_score.score,
                        relative_drop_pct=relative_drop,
                    )
                )

    return findings


def _mean_for(report: EvaluationReport, metric: MetricName) -> float | None:
    summary = next((s for s in report.metric_summaries if s.metric == metric), None)
    return summary.mean_score if summary else None


def evaluate_quality_gates(
    baseline: EvaluationReport, candidate: EvaluationReport, settings: Settings
) -> QualityGateResult:
    checks: list[GateCheck] = []

    correctness = _mean_for(candidate, MetricName.ANSWER_CORRECTNESS)
    checks.append(
        GateCheck(
            name="min_answer_correctness",
            passed=correctness is not None and correctness >= settings.min_answer_correctness,
            detail=f"candidate mean={correctness} (threshold >= {settings.min_answer_correctness})",
        )
    )

    faithfulness = _mean_for(candidate, MetricName.FAITHFULNESS)
    checks.append(
        GateCheck(
            name="min_faithfulness",
            passed=faithfulness is not None and faithfulness >= settings.min_faithfulness,
            detail=f"candidate mean={faithfulness} (threshold >= {settings.min_faithfulness})",
        )
    )

    # "Unanswerable-question handling": abstention_quality is specifically
    # the metric that scores whether the system correctly declines to
    # fabricate an answer when evidence is insufficient (see its rubric).
    abstention = _mean_for(candidate, MetricName.ABSTENTION_QUALITY)
    checks.append(
        GateCheck(
            name="min_abstention_quality",
            passed=abstention is not None and abstention >= settings.min_abstention_quality,
            detail=f"candidate mean={abstention} (threshold >= {settings.min_abstention_quality})",
        )
    )

    if candidate.total_generation_latency_seconds is not None and candidate.total_questions:
        mean_latency = candidate.total_generation_latency_seconds / candidate.total_questions
        latency_passed = mean_latency <= settings.max_generation_latency_seconds
        latency_detail = f"candidate mean={mean_latency:.2f}s (threshold <= {settings.max_generation_latency_seconds}s)"
    else:
        # Latency was never measured for this run -- that's a gap in the
        # run, not evidence the latency is fine. Fail closed, not open.
        mean_latency = None
        latency_passed = False
        latency_detail = "generation latency was not measured for this run"
    checks.append(GateCheck(name="max_generation_latency_seconds", passed=latency_passed, detail=latency_detail))

    total_metric_attempts = sum(len(r.metric_scores) + len(r.failed_metrics) for r in candidate.results)
    failure_rate = (candidate.total_failed_metric_calls / total_metric_attempts) if total_metric_attempts else 0.0
    checks.append(
        GateCheck(
            name="max_failed_metric_rate",
            passed=failure_rate <= settings.max_failed_metric_rate,
            detail=f"candidate failure_rate={failure_rate:.2%} (threshold <= {settings.max_failed_metric_rate:.0%})",
        )
    )

    regressions = find_regressions(baseline, candidate, settings.max_regression_pct)
    checks.append(
        GateCheck(
            name="max_regression_pct",
            passed=len(regressions) == 0,
            detail=f"{len(regressions)} question/metric pair(s) regressed more than {settings.max_regression_pct:.0%}",
        )
    )

    return QualityGateResult(passed=all(c.passed for c in checks), checks=checks, regressions=regressions)
