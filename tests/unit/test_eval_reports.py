import pytest

from app.eval_reports import EvalRunNotFoundError, get_eval_run, list_eval_runs


def test_list_eval_runs_returns_the_real_runs_on_disk():
    runs = list_eval_runs()
    assert len(runs) >= 1
    for run in runs:
        assert run["total_questions"] > 0
        assert 0.0 <= run["overall_score"] <= 1.0
        assert run["metric_summaries"]
        # "" is valid -- a historical run predating EvaluationResult.generation_model.
        assert isinstance(run["generation_model"], str)


def test_baseline_run_is_labeled_as_baseline():
    runs = list_eval_runs()
    baseline = next((r for r in runs if r["run_id"] == "baseline"), None)
    assert baseline is not None
    assert baseline["is_baseline"] is True
    assert baseline["label"] == "Approved baseline"


def test_get_eval_run_returns_full_detail_for_a_real_run():
    run_id = list_eval_runs()[0]["run_id"]
    report = get_eval_run(run_id)
    assert report["results"]
    assert report["results"][0]["question_id"]
    assert report["results"][0]["question"]
    assert report["results"][0]["expected_answer"]


def test_get_eval_run_rejects_unknown_id():
    with pytest.raises(EvalRunNotFoundError):
        get_eval_run("does-not-exist")


def test_get_eval_run_rejects_path_traversal_attempt():
    # The whole point of resolving run_id against a fresh directory scan
    # (not building a path directly from it) is that this never reaches disk.
    with pytest.raises(EvalRunNotFoundError):
        get_eval_run("../../etc/passwd")
