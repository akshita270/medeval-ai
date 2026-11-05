from unittest.mock import patch

from app.guardrails.schema import GuardrailAction, GuardrailCheckResult, GuardrailDecision
from app.schemas import GeneratedAnswer, GenerationConfig
from evaluation.guardrails.runner import run_adversarial_case, run_adversarial_suite
from evaluation.guardrails.schema import AdversarialCase

_ALLOW = GuardrailDecision(action=GuardrailAction.ALLOW, triggered_checks=[])


def _block_decision(check_name: str) -> GuardrailDecision:
    return GuardrailDecision(
        action=GuardrailAction.BLOCK,
        triggered_checks=[GuardrailCheckResult(check_name=check_name, action=GuardrailAction.BLOCK)],
    )


def _case(**overrides) -> AdversarialCase:
    kwargs = dict(
        case_id="a01",
        question="some question",
        category="prompt_injection",
        expected_blocked=True,
        notes="",
    )
    kwargs.update(overrides)
    return AdversarialCase(**kwargs)


def _fake_generated_answer() -> GeneratedAnswer:
    config = GenerationConfig(
        llm_model="gpt-5-mini",
        embedding_model="text-embedding-3-small",
        prompt_version="v1",
        chunk_size=800,
        chunk_overlap=100,
        retrieval_top_k=5,
    )
    return GeneratedAnswer(
        query="some question",
        answer="a generated answer",
        citations=[],
        retrieved_passages=[],
        config=config,
        prompt_tokens=10,
        completion_tokens=5,
        total_tokens=15,
    )


class TestRunAdversarialCase:
    def test_input_block_short_circuits_before_generation(self):
        # Cost control, mirrors run_input_guardrails's own short-circuit:
        # never generate (or call output guardrails) for a request the
        # input guardrails already blocked.
        case = _case(expected_blocked=True)
        with (
            patch("evaluation.guardrails.runner.retrieve_passages", return_value=[]),
            patch(
                "evaluation.guardrails.runner.run_input_guardrails", return_value=_block_decision("prompt_injection")
            ),
            patch("evaluation.guardrails.runner.generate_answer") as mock_generate,
        ):
            result = run_adversarial_case(case, collection=None, bm25_index=None, settings=None)

        mock_generate.assert_not_called()
        assert result.actual_blocked is True
        assert result.blocked_by == ["prompt_injection"]
        assert result.passed is True

    def test_output_block_after_input_allows(self):
        case = _case(case_id="a14", category="output_leak_temptation", expected_blocked=False)
        with (
            patch("evaluation.guardrails.runner.retrieve_passages", return_value=[]),
            patch("evaluation.guardrails.runner.run_input_guardrails", return_value=_ALLOW),
            patch("evaluation.guardrails.runner.generate_answer", return_value=_fake_generated_answer()),
            patch(
                "evaluation.guardrails.runner.run_output_guardrails",
                return_value=_block_decision("personalized_advice_leak"),
            ),
        ):
            result = run_adversarial_case(case, collection=None, bm25_index=None, settings=None)

        assert result.actual_blocked is True
        assert result.blocked_by == ["personalized_advice_leak"]
        # expected_blocked was False -- this is the documented "finding,
        # not a suite bug" case, but it's still correctly scored as a fail.
        assert result.passed is False

    def test_fully_passes_through_when_nothing_blocks(self):
        case = _case(case_id="a16", category="baseline_legitimate", expected_blocked=False)
        with (
            patch("evaluation.guardrails.runner.retrieve_passages", return_value=[]),
            patch("evaluation.guardrails.runner.run_input_guardrails", return_value=_ALLOW),
            patch("evaluation.guardrails.runner.generate_answer", return_value=_fake_generated_answer()),
            patch("evaluation.guardrails.runner.run_output_guardrails", return_value=_ALLOW),
        ):
            result = run_adversarial_case(case, collection=None, bm25_index=None, settings=None)

        assert result.actual_blocked is False
        assert result.blocked_by is None
        assert result.passed is True

    def test_mismatch_between_expected_and_actual_fails(self):
        # expected_blocked=True but nothing actually blocks it.
        case = _case(case_id="a05", category="personalized_advice", expected_blocked=True)
        with (
            patch("evaluation.guardrails.runner.retrieve_passages", return_value=[]),
            patch("evaluation.guardrails.runner.run_input_guardrails", return_value=_ALLOW),
            patch("evaluation.guardrails.runner.generate_answer", return_value=_fake_generated_answer()),
            patch("evaluation.guardrails.runner.run_output_guardrails", return_value=_ALLOW),
        ):
            result = run_adversarial_case(case, collection=None, bm25_index=None, settings=None)

        assert result.passed is False


class TestRunAdversarialSuite:
    def test_aggregates_pass_fail_counts(self):
        cases = [
            _case(case_id="a01", expected_blocked=True),
            _case(case_id="a16", category="baseline_legitimate", expected_blocked=False),
        ]
        with (
            patch("evaluation.guardrails.runner.retrieve_passages", return_value=[]),
            patch(
                "evaluation.guardrails.runner.run_input_guardrails", return_value=_block_decision("prompt_injection")
            ),
            patch("evaluation.guardrails.runner.generate_answer") as mock_generate,
        ):
            report = run_adversarial_suite(cases, collection=None, bm25_index=None, settings=None)

        # Both cases hit the input-block path here (a16's expected_blocked
        # is False, so it will actually fail against a mocked BLOCK
        # decision -- that's fine, this test only checks aggregation math).
        mock_generate.assert_not_called()
        assert report.total_cases == 2
        assert report.total_passed + report.total_failed == 2
        assert report.total_passed == 1  # a01 passes (expected True, got True); a16 fails (expected False, got True)
