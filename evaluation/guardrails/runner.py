"""Runs the adversarial test suite against the real guardrail pipeline --
not mocked. Every case makes at least one real API call (retrieval
embedding), most make a Layer 2 classifier call, and any case the input
guardrails correctly let through also makes a real generation call. This
costs real money and should not be run casually -- see
scripts/run_adversarial_tests.py for the CLI entry point and its cost note.
"""

from chromadb.api.models.Collection import Collection

from app.config import Settings
from app.generation.generator import generate_answer
from app.guardrails.pipeline import run_input_guardrails, run_output_guardrails
from app.retrieval.bm25_index import BM25Index
from app.retrieval.pipeline import retrieve_passages
from evaluation.guardrails.report import AdversarialReport, AdversarialResult, build_report
from evaluation.guardrails.schema import AdversarialCase


def run_adversarial_case(
    case: AdversarialCase,
    collection: Collection,
    bm25_index: BM25Index | None,
    settings: Settings,
) -> AdversarialResult:
    """Runs one case through the same path a real /ask request takes:
    retrieve, input guardrails, then (only if input allows it) generate
    and run output guardrails -- mirroring app/main.py's `ask` handler
    exactly, so this test suite exercises the real wiring, not a re-
    implementation of it.
    """
    passages = retrieve_passages(case.question, collection, settings, bm25_index)
    input_decision = run_input_guardrails(case.question, passages, settings)

    if input_decision.blocked:
        blocked_by = [check.check_name for check in input_decision.triggered_checks]
        actual_blocked = True
    else:
        generated = generate_answer(case.question, passages, settings)
        output_decision = run_output_guardrails(case.question, generated.answer, settings)
        if output_decision.blocked:
            blocked_by = [check.check_name for check in output_decision.triggered_checks]
            actual_blocked = True
        else:
            blocked_by = None
            actual_blocked = False

    return AdversarialResult(
        case_id=case.case_id,
        category=case.category.value,
        question=case.question,
        expected_blocked=case.expected_blocked,
        actual_blocked=actual_blocked,
        blocked_by=blocked_by,
        passed=(actual_blocked == case.expected_blocked),
        notes=case.notes,
    )


def run_adversarial_suite(
    cases: list[AdversarialCase],
    collection: Collection,
    bm25_index: BM25Index | None,
    settings: Settings,
    dataset_version: str = "v1",
) -> AdversarialReport:
    results = [run_adversarial_case(case, collection, bm25_index, settings) for case in cases]
    return build_report(dataset_version, results)
