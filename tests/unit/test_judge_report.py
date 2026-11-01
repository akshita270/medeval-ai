from evaluation.judge.report import build_report
from evaluation.judge.schema import EvaluationResult, MetricName, MetricScore


def _result(question_id: str, scores: dict[MetricName, float], failed: dict[str, str] | None = None) -> EvaluationResult:
    return EvaluationResult(
        question_id=question_id,
        metric_scores=[
            MetricScore(metric=metric, score=score, reasoning="r", is_llm_judged=True)
            for metric, score in scores.items()
        ],
        failed_metrics=failed or {},
        judge_latency_seconds=5.0,
        generation_latency_seconds=2.0,
        prompt_tokens=100,
        completion_tokens=20,
        estimated_cost_usd=0.001,
    )


def test_mean_score_computed_correctly_per_metric():
    results = [
        _result("q1", {MetricName.ANSWER_CORRECTNESS: 1.0}),
        _result("q2", {MetricName.ANSWER_CORRECTNESS: 0.6}),
    ]
    report = build_report("v1", results)

    summary = next(s for s in report.metric_summaries if s.metric == MetricName.ANSWER_CORRECTNESS)
    assert abs(summary.mean_score - 0.8) < 1e-9
    assert summary.count == 2


def test_metric_present_on_fewer_questions_gets_correct_count_not_total():
    # context_recall only present on 2 of 3 questions (e.g. one was unanswerable)
    results = [
        _result("q1", {MetricName.ANSWER_CORRECTNESS: 1.0, MetricName.CONTEXT_RECALL: 0.8}),
        _result("q2", {MetricName.ANSWER_CORRECTNESS: 0.6, MetricName.CONTEXT_RECALL: 1.0}),
        _result("q3", {MetricName.ANSWER_CORRECTNESS: 1.0}),
    ]
    report = build_report("v1", results)

    recall_summary = next(s for s in report.metric_summaries if s.metric == MetricName.CONTEXT_RECALL)
    correctness_summary = next(s for s in report.metric_summaries if s.metric == MetricName.ANSWER_CORRECTNESS)
    assert recall_summary.count == 2
    assert correctness_summary.count == 3


def test_per_question_detail_is_preserved_not_collapsed():
    results = [_result("q1", {MetricName.ANSWER_CORRECTNESS: 1.0})]
    report = build_report("v1", results)
    assert len(report.results) == 1
    assert report.results[0].question_id == "q1"


def test_failed_metric_calls_are_counted():
    results = [_result("q1", {MetricName.ANSWER_CORRECTNESS: 1.0}, failed={"faithfulness": "timeout"})]
    report = build_report("v1", results)
    assert report.total_failed_metric_calls == 1


def test_total_generation_latency_is_none_if_any_result_lacks_a_measurement():
    results = [
        _result("q1", {MetricName.ANSWER_CORRECTNESS: 1.0}),
        EvaluationResult(
            question_id="q2",
            metric_scores=[],
            judge_latency_seconds=1.0,
            generation_latency_seconds=None,
            prompt_tokens=0,
            completion_tokens=0,
            estimated_cost_usd=0.0,
        ),
    ]
    report = build_report("v1", results)
    assert report.total_generation_latency_seconds is None


def test_total_generation_latency_sums_when_all_results_have_it():
    results = [_result("q1", {MetricName.ANSWER_CORRECTNESS: 1.0}), _result("q2", {MetricName.ANSWER_CORRECTNESS: 1.0})]
    report = build_report("v1", results)
    assert report.total_generation_latency_seconds == 4.0
