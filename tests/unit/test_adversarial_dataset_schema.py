import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from evaluation.guardrails.schema import AdversarialCase, load_adversarial_dataset

_VALID_ROW = json.dumps(
    {
        "case_id": "a01",
        "question": "q?",
        "category": "prompt_injection",
        "expected_blocked": True,
        "notes": "n",
    }
)

_REAL_DATASET_PATH = Path("evaluation/guardrails/v1/adversarial_cases.jsonl")


def _base_kwargs(**overrides):
    kwargs = dict(
        case_id="a01",
        question="q?",
        category="prompt_injection",
        expected_blocked=True,
        notes="n",
    )
    kwargs.update(overrides)
    return kwargs


def test_valid_case_passes():
    case = AdversarialCase(**_base_kwargs())
    assert case.expected_blocked is True


def test_rejects_invalid_category():
    with pytest.raises(ValidationError):
        AdversarialCase(**_base_kwargs(category="not_a_real_category"))


def test_load_adversarial_dataset_rejects_duplicate_case_ids(tmp_path: Path):
    path = tmp_path / "cases.jsonl"
    path.write_text(f"{_VALID_ROW}\n{_VALID_ROW}\n", encoding="utf-8")

    with pytest.raises(ValueError, match="duplicate case_id"):
        load_adversarial_dataset(path)


def test_load_adversarial_dataset_skips_blank_lines(tmp_path: Path):
    path = tmp_path / "cases.jsonl"
    path.write_text(f"\n{_VALID_ROW}\n\n", encoding="utf-8")

    cases = load_adversarial_dataset(path)

    assert len(cases) == 1


def test_load_adversarial_dataset_reports_line_number_on_bad_row(tmp_path: Path):
    path = tmp_path / "cases.jsonl"
    path.write_text("not valid json\n", encoding="utf-8")

    with pytest.raises(ValueError, match=":1:"):
        load_adversarial_dataset(path)


def test_real_v1_dataset_loads_and_validates():
    # The actual shipped dataset, not a fixture -- catches a bad edit to
    # the real file, not just a bug in the loader.
    cases = load_adversarial_dataset(_REAL_DATASET_PATH)
    assert len(cases) == 19


def test_real_v1_dataset_covers_every_category():
    cases = load_adversarial_dataset(_REAL_DATASET_PATH)
    categories = {case.category.value for case in cases}
    assert categories == {
        "prompt_injection",
        "personalized_advice",
        "off_topic",
        "harmful_request",
        "output_leak_temptation",
        "baseline_legitimate",
    }


def test_real_v1_dataset_baseline_and_output_leak_cases_expect_unblocked():
    cases = load_adversarial_dataset(_REAL_DATASET_PATH)
    for case in cases:
        if case.category.value in ("baseline_legitimate", "output_leak_temptation"):
            assert case.expected_blocked is False, f"{case.case_id} should expect_blocked=False"
