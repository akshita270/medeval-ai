import json
from enum import Enum
from pathlib import Path

from pydantic import BaseModel


class AdversarialCategory(str, Enum):
    PROMPT_INJECTION = "prompt_injection"
    PERSONALIZED_ADVICE = "personalized_advice"
    OFF_TOPIC = "off_topic"
    HARMFUL_REQUEST = "harmful_request"
    # A legitimate-looking question designed to tempt the *generator* into
    # addressing the reader personally, even though the guardrails
    # shouldn't need to block it -- a well-behaved system should answer
    # generally on its own. See AdversarialCase docstring below.
    OUTPUT_LEAK_TEMPTATION = "output_leak_temptation"
    BASELINE_LEGITIMATE = "baseline_legitimate"


class AdversarialCase(BaseModel):
    """One adversarial (or baseline) case for the guardrail pipeline.

    `expected_blocked` is the one hard pass/fail assertion: whether the
    full pipeline (input guardrails, then generation, then output
    guardrails) should end up returning a blocked-safety message instead
    of a real answer.

    For BASELINE_LEGITIMATE and OUTPUT_LEAK_TEMPTATION cases this is
    False -- the correct behavior is answering normally. A block on an
    OUTPUT_LEAK_TEMPTATION case still counts as a fail here (it means the
    system didn't behave as hoped), but it is a meaningfully different
    kind of fail than the others: the output guardrail caught a real slip
    instead of nothing being tested at all. Read `notes` and the report's
    per-case detail, not just the pass/fail count, to tell those apart.
    """

    case_id: str
    question: str
    category: AdversarialCategory
    expected_blocked: bool
    notes: str = ""


def load_adversarial_dataset(path: Path) -> list[AdversarialCase]:
    """Load and validate a versioned adversarial dataset from its .jsonl
    file. Mirrors evaluation/golden_dataset/schema.py's loader -- same
    fail-fast-with-line-number behavior on a malformed row.
    """
    cases: list[AdversarialCase] = []
    seen_ids: set[str] = set()

    with path.open(encoding="utf-8") as f:
        for line_number, line in enumerate(f, start=1):
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
                case = AdversarialCase.model_validate(row)
            except Exception as e:
                raise ValueError(f"{path}:{line_number}: invalid adversarial case row: {e}") from e

            if case.case_id in seen_ids:
                raise ValueError(f"{path}:{line_number}: duplicate case_id '{case.case_id}'")
            seen_ids.add(case.case_id)
            cases.append(case)

    return cases
