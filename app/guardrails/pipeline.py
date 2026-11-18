from app.config import Settings
from app.guardrails.citation_guardrails import filter_grounded_citations
from app.guardrails.classifier import check_output_safety, check_semantic_intent
from app.guardrails.input_guardrails import (
    check_personalized_advice_request,
    check_prompt_injection,
    check_topic_relevance,
)
from app.guardrails.output_guardrails import check_personalized_dosing_leak
from app.guardrails.pii_guardrails import check_patient_identifier
from app.guardrails.schema import GuardrailAction, GuardrailCheckResult, GuardrailDecision
from app.schemas import GeneratedAnswer, GenerationConfig, RetrievedPassage

# Shown to the user in place of a generated answer when a check blocks the
# request -- keyed by check_name so main.py doesn't need its own copy of
# this wording. Shared between Layer 1 (regex) and Layer 2 (semantic
# classifier) checks that flag the same category -- see
# classifier._CLASSIFICATION_TO_CHECK_NAME.
_BLOCKED_MESSAGES = {
    "prompt_injection": (
        "This request appears to attempt to override this assistant's instructions and has been blocked."
    ),
    "personalized_advice_request": (
        "I can't provide personalized medical advice, including specific dosing "
        "recommendations for an individual. Please consult a qualified healthcare "
        "professional about your own care."
    ),
    "topic_relevance": (
        "This question doesn't appear to relate to the documents in this collection "
        "(Type 2 diabetes research), so I can't answer it from the available evidence."
    ),
    "harmful_request": ("This request appears to seek information that could cause harm, and has been blocked."),
    "personalized_advice_leak": (
        "This answer would have given personalized medical advice, which this assistant "
        "doesn't provide -- please consult a qualified healthcare professional about your "
        "own care."
    ),
    "patient_identifier": (
        "This request appears to contain real patient-identifying information (such as an ID, "
        "date of birth, or contact detail). Please remove any personal identifiers and ask a "
        "general research question instead."
    ),
    "citation_grounding": (
        "This answer cited a source in a way that couldn't be verified against the retrieved "
        "documents, so it has been blocked rather than shown with an unverified citation."
    ),
}


def run_input_guardrails(question: str, passages: list[RetrievedPassage], settings: Settings) -> GuardrailDecision:
    """Runs Layer 1 (free, regex) first, then Layer 2 (one real API call)
    only if Layer 1 found nothing -- never pay for a semantic check on a
    request already blocked for free.
    """
    layer1_results = [
        check_prompt_injection(question),
        check_personalized_advice_request(question),
        check_topic_relevance(passages, settings.min_topic_relevance_score),
        check_patient_identifier(question),
    ]
    triggered = [r for r in layer1_results if r.action == GuardrailAction.BLOCK]
    if triggered:
        return GuardrailDecision(action=GuardrailAction.BLOCK, triggered_checks=triggered)

    layer2_result = check_semantic_intent(question, settings)
    if layer2_result.action == GuardrailAction.BLOCK:
        return GuardrailDecision(action=GuardrailAction.BLOCK, triggered_checks=[layer2_result])

    return GuardrailDecision(action=GuardrailAction.ALLOW, triggered_checks=[])


def build_blocked_answer(query: str, decision: GuardrailDecision, settings: Settings) -> GeneratedAnswer:
    """Builds a GeneratedAnswer-shaped response for a blocked request, so
    the API's response contract stays the same whether or not generation
    actually ran. `blocked_by` is how a caller tells the two apart.
    """
    messages = [_BLOCKED_MESSAGES[check.check_name] for check in decision.triggered_checks]
    config = GenerationConfig(
        llm_model=settings.llm_model,
        embedding_model=settings.embedding_model,
        prompt_version=settings.prompt_version,
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        retrieval_top_k=settings.retrieval_top_k,
    )
    return GeneratedAnswer(
        query=query,
        answer=" ".join(messages),
        citations=[],
        retrieved_passages=[],
        config=config,
        prompt_tokens=0,
        completion_tokens=0,
        total_tokens=0,
        blocked_by=[check.check_name for check in decision.triggered_checks],
    )


def run_output_guardrails(
    question: str, generated: GeneratedAnswer, settings: Settings
) -> tuple[GuardrailDecision, GeneratedAnswer]:
    """Mirrors run_input_guardrails's two-layer, cost-cascading shape:
    Layer 1 (free, deterministic checks) first, Layer 2 (one real API
    call) only if Layer 1 found nothing in the generated answer.

    citation_grounding is handled differently from every other check
    here: instead of blocking the whole answer over one bad quote, it
    drops only the citation(s) that can't be verified and lets the rest
    of the answer through -- one misquoted citation doesn't mean every
    other claim in the answer is untrustworthy. The (possibly trimmed)
    GeneratedAnswer is returned alongside the decision so the caller
    shows what was actually verified, not what the model originally
    claimed. Only if *every* citation the model made turns out
    ungrounded does this still block -- there'd be nothing verified left
    to show.
    """
    grounded_citations, dropped_reasons = filter_grounded_citations(
        generated.citation_details, generated.retrieved_passages
    )

    if generated.citation_details and not grounded_citations:
        result = GuardrailCheckResult(
            check_name="citation_grounding",
            action=GuardrailAction.BLOCK,
            reason=" ".join(dropped_reasons),
        )
        return GuardrailDecision(action=GuardrailAction.BLOCK, triggered_checks=[result]), generated

    if dropped_reasons:
        doc_ids: list[str] = []
        for citation in grounded_citations:
            if citation.doc_id not in doc_ids:
                doc_ids.append(citation.doc_id)
        generated = generated.model_copy(update={"citation_details": grounded_citations, "citations": doc_ids})

    layer1_results = [
        check_patient_identifier(generated.answer),
        check_personalized_dosing_leak(generated.answer),
    ]
    triggered = [r for r in layer1_results if r.action == GuardrailAction.BLOCK]
    if triggered:
        return GuardrailDecision(action=GuardrailAction.BLOCK, triggered_checks=triggered), generated

    layer2_result = check_output_safety(question, generated.answer, settings)
    if layer2_result.action == GuardrailAction.BLOCK:
        return GuardrailDecision(action=GuardrailAction.BLOCK, triggered_checks=[layer2_result]), generated

    return GuardrailDecision(action=GuardrailAction.ALLOW, triggered_checks=[]), generated


def redact_blocked_answer(generated: GeneratedAnswer, decision: GuardrailDecision) -> GeneratedAnswer:
    """Replaces a generated answer's visible text with a safety message
    when an output guardrail blocks it, but keeps everything else
    (passages, citations, token usage) for audit -- unlike an input
    block, generation already ran and that cost was already incurred;
    only what's shown to the user changes.
    """
    messages = [_BLOCKED_MESSAGES[check.check_name] for check in decision.triggered_checks]
    return generated.model_copy(
        update={
            "answer": " ".join(messages),
            "blocked_by": [check.check_name for check in decision.triggered_checks],
        }
    )
