from unittest.mock import patch

from app.guardrails.output_guardrails import check_personalized_dosing_leak
from app.guardrails.pipeline import redact_blocked_answer, run_output_guardrails
from app.guardrails.schema import GuardrailAction, GuardrailCheckResult, GuardrailDecision
from app.schemas import GeneratedAnswer, GenerationConfig, RetrievedPassage


def _config() -> GenerationConfig:
    return GenerationConfig(
        llm_model="gpt-5-mini",
        embedding_model="text-embedding-3-small",
        prompt_version="v1",
        chunk_size=800,
        chunk_overlap=100,
        retrieval_top_k=5,
    )


def _generated_answer(answer_text: str) -> GeneratedAnswer:
    return GeneratedAnswer(
        query="What is the starting dose of metformin?",
        answer=answer_text,
        citations=["docA"],
        retrieved_passages=[
            RetrievedPassage(chunk_id="c1", doc_id="docA", chunk_index=0, text="some text", similarity_score=0.8)
        ],
        config=_config(),
        prompt_tokens=100,
        completion_tokens=50,
        total_tokens=150,
    )


class TestCheckPersonalizedDosingLeak:
    def test_allows_general_educational_fact(self):
        result = check_personalized_dosing_leak(
            "The recommended starting dose of metformin is 500mg twice daily, taken with meals [docA]."
        )
        assert result.action == GuardrailAction.ALLOW

    def test_blocks_second_person_dosing_instruction(self):
        result = check_personalized_dosing_leak("You should take 500mg of metformin twice daily.")
        assert result.action == GuardrailAction.BLOCK
        assert result.check_name == "personalized_advice_leak"

    def test_blocks_direct_recommendation_phrasing(self):
        result = check_personalized_dosing_leak("I recommend that you take metformin with your evening meal.")
        assert result.action == GuardrailAction.BLOCK

    def test_blocks_implied_diagnosis(self):
        result = check_personalized_dosing_leak("Based on your symptoms, you have type 2 diabetes.")
        assert result.action == GuardrailAction.BLOCK


class TestRunOutputGuardrails:
    def test_allows_clean_answer(self):
        # Layer 1 passes, so Layer 2 (a real API call) would run next --
        # mocked so the unit suite never calls the live API.
        with patch(
            "app.guardrails.pipeline.check_output_safety",
            return_value=GuardrailCheckResult(check_name="output_semantic_safety", action=GuardrailAction.ALLOW),
        ) as mock_layer2:
            decision = run_output_guardrails(
                "What is the starting dose of metformin?",
                "The recommended starting dose of metformin is 500mg twice daily [docA].",
                settings=None,  # not used by the mocked Layer 2; Layer 1 needs no settings either
            )
        assert not decision.blocked
        mock_layer2.assert_called_once()

    def test_layer2_not_called_when_layer1_already_blocked(self):
        with patch("app.guardrails.pipeline.check_output_safety") as mock_layer2:
            decision = run_output_guardrails(
                "What is the starting dose of metformin?",
                "You should take 500mg of metformin twice daily.",
                settings=None,
            )
        assert decision.blocked
        mock_layer2.assert_not_called()

    def test_layer2_block_is_reflected_in_decision(self):
        with patch(
            "app.guardrails.pipeline.check_output_safety",
            return_value=GuardrailCheckResult(
                check_name="personalized_advice_leak", action=GuardrailAction.BLOCK, reason="flagged by classifier"
            ),
        ):
            decision = run_output_guardrails(
                "What is the starting dose of metformin?",
                "a subtly personalized recommendation that regex missed",
                settings=None,
            )
        assert decision.blocked
        assert decision.triggered_checks[0].check_name == "personalized_advice_leak"


class TestRedactBlockedAnswer:
    def test_keeps_audit_fields_but_replaces_answer_text(self):
        generated = _generated_answer("You should take 500mg of metformin twice daily.")
        decision = GuardrailDecision(
            action=GuardrailAction.BLOCK,
            triggered_checks=[
                GuardrailCheckResult(check_name="personalized_advice_leak", action=GuardrailAction.BLOCK)
            ],
        )
        redacted = redact_blocked_answer(generated, decision)

        assert redacted.blocked_by == ["personalized_advice_leak"]
        assert "metformin" not in redacted.answer or "should" not in redacted.answer.lower()
        # Audit trail is preserved -- generation cost was already spent.
        assert redacted.total_tokens == 150
        assert redacted.citations == ["docA"]
        assert len(redacted.retrieved_passages) == 1
