from app.config import Settings
from app.guardrails.classifier import check_output_safety, check_semantic_intent
from app.guardrails.input_guardrails import (
    check_personalized_advice_request,
    check_prompt_injection,
    check_topic_relevance,
)
from app.guardrails.output_guardrails import check_personalized_dosing_leak
from app.guardrails.schema import GuardrailAction, GuardrailDecision
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


def run_output_guardrails(question: str, answer: str, settings: Settings) -> GuardrailDecision:
    """Mirrors run_input_guardrails's two-layer, cost-cascading shape:
    Layer 1 (free, regex) first, Layer 2 (one real API call) only if
    Layer 1 found nothing in the generated answer.
    """
    layer1_result = check_personalized_dosing_leak(answer)
    if layer1_result.action == GuardrailAction.BLOCK:
        return GuardrailDecision(action=GuardrailAction.BLOCK, triggered_checks=[layer1_result])

    layer2_result = check_output_safety(question, answer, settings)
    if layer2_result.action == GuardrailAction.BLOCK:
        return GuardrailDecision(action=GuardrailAction.BLOCK, triggered_checks=[layer2_result])

    return GuardrailDecision(action=GuardrailAction.ALLOW, triggered_checks=[])


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
