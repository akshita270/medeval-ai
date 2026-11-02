import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from evaluation.golden_dataset.schema import GoldenQuestion, load_golden_dataset

_VALID_ROW = json.dumps(
    {
        "question_id": "q0001",
        "question": "q?",
        "expected_answer": "a.",
        "supporting_doc_ids": ["d"],
        "supporting_evidence": ["e"],
        "category": "factual",
        "difficulty": "easy",
        "is_answerable": True,
    }
)


def _base_kwargs(**overrides):
    kwargs = dict(
        question_id="q0001",
        question="q?",
        expected_answer="a.",
        supporting_doc_ids=["doc_a"],
        supporting_evidence=["quoted evidence"],
        category="factual",
        difficulty="easy",
        is_answerable=True,
    )
    kwargs.update(overrides)
    return kwargs


def test_valid_answerable_question_passes():
    q = GoldenQuestion(**_base_kwargs())
    assert q.is_answerable is True


def test_valid_unanswerable_question_passes():
    q = GoldenQuestion(**_base_kwargs(supporting_doc_ids=[], supporting_evidence=[], is_answerable=False))
    assert q.is_answerable is False


def test_rejects_answerable_question_with_no_evidence():
    with pytest.raises(ValidationError):
        GoldenQuestion(**_base_kwargs(supporting_doc_ids=[], supporting_evidence=[], is_answerable=True))


def test_rejects_unanswerable_question_that_still_has_evidence():
    with pytest.raises(ValidationError):
        GoldenQuestion(**_base_kwargs(is_answerable=False))


def test_rejects_invalid_category():
    with pytest.raises(ValidationError):
        GoldenQuestion(**_base_kwargs(category="not_a_real_category"))


def test_load_golden_dataset_rejects_duplicate_question_ids(tmp_path: Path):
    path = tmp_path / "questions.jsonl"
    path.write_text(f"{_VALID_ROW}\n{_VALID_ROW}\n", encoding="utf-8")

    with pytest.raises(ValueError, match="duplicate question_id"):
        load_golden_dataset(path)


def test_load_golden_dataset_skips_blank_lines(tmp_path: Path):
    path = tmp_path / "questions.jsonl"
    path.write_text(f"\n{_VALID_ROW}\n\n", encoding="utf-8")

    questions = load_golden_dataset(path)

    assert len(questions) == 1


def test_load_golden_dataset_reports_line_number_on_bad_row(tmp_path: Path):
    path = tmp_path / "questions.jsonl"
    path.write_text("not valid json\n", encoding="utf-8")

    with pytest.raises(ValueError, match=":1:"):
        load_golden_dataset(path)
