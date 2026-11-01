from app.config import Settings
from evaluation.judge.report import build_report
from evaluation.judge.schema import EvaluationResult, MetricName, MetricScore
from evaluation.regression.quality_gates import evaluate_quality_gates, find_regressions


def _settings(**overrides) -> Settings:
    defaults = dict(
        openai_api_key="test",
        llm_model="gpt-5-mini",
        embedding_model="text-embedding-3-small",
        judge_model="gpt-5-mini",
        prompt_version="v1",
        chunk_size=800,
        chunk_overlap=100,
        retrieval_top_k=5,
    )
    defaults.update(overrides)
    return Settings(**defaults)


def _result(question_id: str, scores: dict[MetricName, float], generation_latency=2.0) -> EvaluationResult:
    return EvaluationResult(
        question_id=question_id,
        metric_scores=[
            MetricScore(metric=metric, score=score, reasoning="r", is_llm_judged=True)
            for metric, score in scores.items()
        ],
        judge_latency_seconds=5.0,
        generation_latency_seconds=generation_latency,
        prompt_tokens=100,
        completion_tokens=20,
        estimated_cost_usd=0.001,
    )


def test_identical_baseline_and_candidate_has_zero_regressions():
    results = [_result("q1", {MetricName.ANSWER_CORRECTNESS: 0.9})]
    report = build_report("v1", results)
    assert find_regressions(report, report, max_regression_pct=0.10) == []


def test_detects_a_real_regression_above_threshold():
    baseline = build_report("v1", [_result("q1", {MetricName.ANSWER_CORRECTNESS: 1.0})])
    candidate = build_report("v1", [_result("q1", {MetricName.ANSWER_CORRECTNESS: 0.5})])

    findings = find_regressions(baseline, candidate, max_regression_pct=0.10)

    assert len(findings) == 1
    assert findings[0].question_id == "q1"
    assert findings[0].metric == MetricName.ANSWER_CORRECTNESS


def test_drop_within_threshold_is_not_flagged():
    baseline = build_report("v1", [_result("q1", {MetricName.ANSWER_CORRECTNESS: 1.0})])
    candidate = build_report("v1", [_result("q1", {MetricName.ANSWER_CORRECTNESS: 0.95})])  # 5% drop

    findings = find_regressions(baseline, candidate, max_regression_pct=0.10)

    assert findings == []


def test_question_missing_from_baseline_is_not_a_regression():
    baseline = build_report("v1", [_result("q1", {MetricName.ANSWER_CORRECTNESS: 1.0})])
    candidate = build_report("v1", [_result("q2", {MetricName.ANSWER_CORRECTNESS: 0.1})])

    assert find_regressions(baseline, candidate, max_regression_pct=0.10) == []


def test_overall_gate_passes_when_every_check_passes():
    results = [_result("q1", {MetricName.ANSWER_CORRECTNESS: 0.9, MetricName.FAITHFULNESS: 0.9, MetricName.ABSTENTION_QUALITY: 0.9})]
    report = build_report("v1", results)
    settings = _settings(
        min_answer_correctness=0.75, min_faithfulness=0.85, min_abstention_quality=0.75,
        max_generation_latency_seconds=10.0, max_failed_metric_rate=0.05, max_regression_pct=0.10,
    )

    result = evaluate_quality_gates(report, report, settings)

    assert result.passed is True


def test_overall_gate_fails_if_correctness_below_minimum():
    results = [_result("q1", {MetricName.ANSWER_CORRECTNESS: 0.5, MetricName.FAITHFULNESS: 0.9, MetricName.ABSTENTION_QUALITY: 0.9})]
    report = build_report("v1", results)
    settings = _settings(min_answer_correctness=0.75, min_faithfulness=0.85, min_abstention_quality=0.75)

    result = evaluate_quality_gates(report, report, settings)

    assert result.passed is False
    correctness_check = next(c for c in result.checks if c.name == "min_answer_correctness")
    assert correctness_check.passed is False


def test_latency_gate_fails_closed_when_unmeasured():
    results = [_result("q1", {MetricName.ANSWER_CORRECTNESS: 1.0}, generation_latency=None)]
    report = build_report("v1", results)
    settings = _settings(min_answer_correctness=0.0, min_faithfulness=0.0, min_abstention_quality=0.0)

    result = evaluate_quality_gates(report, report, settings)

    latency_check = next(c for c in result.checks if c.name == "max_generation_latency_seconds")
    assert latency_check.passed is False
    assert result.passed is False


def test_latency_gate_passes_on_fast_measured_latency():
    results = [_result("q1", {MetricName.ANSWER_CORRECTNESS: 1.0}, generation_latency=2.0)]
    report = build_report("v1", results)
    settings = _settings(max_generation_latency_seconds=10.0, min_answer_correctness=0.0, min_faithfulness=0.0, min_abstention_quality=0.0)

    result = evaluate_quality_gates(report, report, settings)

    latency_check = next(c for c in result.checks if c.name == "max_generation_latency_seconds")
    assert latency_check.passed is True


def test_latency_gate_fails_on_slow_measured_latency():
    results = [_result("q1", {MetricName.ANSWER_CORRECTNESS: 1.0}, generation_latency=15.0)]
    report = build_report("v1", results)
    settings = _settings(max_generation_latency_seconds=10.0, min_answer_correctness=0.0, min_faithfulness=0.0, min_abstention_quality=0.0)

    result = evaluate_quality_gates(report, report, settings)

    latency_check = next(c for c in result.checks if c.name == "max_generation_latency_seconds")
    assert latency_check.passed is False
