from unittest.mock import patch

from app.guardrails.output_guardrails import check_personalized_dosing_leak
from app.guardrails.pipeline import redact_blocked_answer, run_output_guardrails
from app.guardrails.schema import GuardrailAction, GuardrailCheckResult, GuardrailDecision
from app.schemas import CitationDetail, GeneratedAnswer, GenerationConfig, RetrievedPassage


def _config() -> GenerationConfig:
    return GenerationConfig(
        llm_model="gpt-5-mini",
        embedding_model="text-embedding-3-small",
        prompt_version="v1",
        chunk_size=800,
        chunk_overlap=100,
        retrieval_top_k=5,
    )


def _generated_answer(
    answer_text: str,
    citation_details: list[CitationDetail] | None = None,
    passages: list[RetrievedPassage] | None = None,
) -> GeneratedAnswer:
    if passages is None:
        passages = [
            RetrievedPassage(
                chunk_id="docA::0001", doc_id="docA", chunk_index=0, text="some text", similarity_score=0.8
            )
        ]
    if citation_details is None:
        citation_details = [CitationDetail(doc_id="docA", chunk_id="docA::0001", quote="some text")]
    return GeneratedAnswer(
        query="What is the starting dose of metformin?",
        answer=answer_text,
        citations=[c.doc_id for c in citation_details],
        citation_details=citation_details,
        retrieved_passages=passages,
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
        generated = _generated_answer("The recommended starting dose of metformin is 500mg twice daily.")
        with patch(
            "app.guardrails.pipeline.check_output_safety",
            return_value=GuardrailCheckResult(check_name="output_semantic_safety", action=GuardrailAction.ALLOW),
        ) as mock_layer2:
            decision = run_output_guardrails(
                "What is the starting dose of metformin?",
                generated,
                settings=None,  # not used by the mocked Layer 2; Layer 1 needs no settings either
            )
        assert not decision.blocked
        mock_layer2.assert_called_once()

    def test_layer2_not_called_when_layer1_already_blocked(self):
        generated = _generated_answer("You should take 500mg of metformin twice daily.")
        with patch("app.guardrails.pipeline.check_output_safety") as mock_layer2:
            decision = run_output_guardrails("What is the starting dose of metformin?", generated, settings=None)
        assert decision.blocked
        mock_layer2.assert_not_called()

    def test_layer2_block_is_reflected_in_decision(self):
        generated = _generated_answer("a subtly personalized recommendation that regex missed")
        with patch(
            "app.guardrails.pipeline.check_output_safety",
            return_value=GuardrailCheckResult(
                check_name="personalized_advice_leak", action=GuardrailAction.BLOCK, reason="flagged by classifier"
            ),
        ):
            decision = run_output_guardrails("What is the starting dose of metformin?", generated, settings=None)
        assert decision.blocked
        assert decision.triggered_checks[0].check_name == "personalized_advice_leak"

    def test_blocks_on_citation_grounding_failure_before_layer2(self):
        # A citation naming a real, retrieved chunk but quoting text that
        # chunk doesn't actually contain -- a misquoted/fabricated
        # citation -- must block without ever reaching Layer 2.
        generated = _generated_answer(
            "Metformin reduces HbA1c significantly.",
            citation_details=[CitationDetail(doc_id="docA", chunk_id="docA::0001", quote="not in the chunk at all")],
        )
        with patch("app.guardrails.pipeline.check_output_safety") as mock_layer2:
            decision = run_output_guardrails("Q", generated, settings=None)
        assert decision.blocked
        assert decision.triggered_checks[0].check_name == "citation_grounding"
        mock_layer2.assert_not_called()

    def test_blocks_on_patient_identifier_in_answer(self):
        generated = _generated_answer("Contact the patient at jane.doe@example.com for follow-up.")
        with patch("app.guardrails.pipeline.check_output_safety") as mock_layer2:
            decision = run_output_guardrails("Q", generated, settings=None)
        assert decision.blocked
        assert decision.triggered_checks[0].check_name == "patient_identifier"
        mock_layer2.assert_not_called()


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
