"""Complexity-based model routing for generation: sends a question to a
cheaper, faster model when it looks like a simple, single-source
factual lookup, and reserves the full llm_model for everything else.

Uses a real (cheap) LLM call to judge complexity -- the same Layer-2
shape app/guardrails/classifier.py already uses -- rather than free
text heuristics (question length, trigger words). Heuristics were
tried first and didn't hold up: in this domain, a simple factual
question is often phrased at real length ("approximately what
proportion of patients needing renal replacement therapy have diabetic
retinopathy..."), so "short question" is a poor proxy for "simple
question." A real classifier actually reads the question instead of
guessing from its shape. The call is cached (see app/llm_cache.py), so
a repeated question is never classified twice, and it uses
routing_simple_model itself (already cheap) rather than a third model.

Off by default (use_model_routing=False). This changes which model
answers the question, so a misrouted "hard" question silently loses
answer quality -- validate with scripts/run_evaluation.py (compare a
routed run against an unrouted one on the golden dataset) before
trusting this in production.
"""

import logging
from enum import Enum

from pydantic import BaseModel

from app.config import Settings
from app.llm_cache import cached_call, get_cache_for_settings
from app.llm_client import get_openai_client
from app.schemas import RetrievedPassage

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """You are a routing classifier for a healthcare research assistant. \
Decide whether the user's question can be answered with a simple, single-source factual \
lookup, or whether it requires deeper reasoning, synthesis across multiple sources, \
comparison, or causal explanation -- regardless of how long or short the question is worded.

- simple: a direct factual lookup, answerable from one passage (e.g. a specific statistic, \
a definition, a recommended dose, a single reported finding) -- even if the question itself \
is phrased in a long, detailed way.
- complex: requires comparing options, explaining why or how something happens, synthesizing \
across multiple documents, or multi-step reasoning.

Respond with the category and a one-sentence reason."""


class ComplexityClassification(str, Enum):
    SIMPLE = "simple"
    COMPLEX = "complex"


class ComplexityClassifierResponse(BaseModel):
    """Structured output shape the complexity classifier LLM must return."""

    classification: ComplexityClassification
    reasoning: str


def _call_complexity_classifier_api(question: str, model: str) -> dict:
    """Isolated into its own function so cached_call() can skip it
    entirely on a cache hit. Returns a plain JSON-serializable dict, not
    the ComplexityClassifierResponse object, since that's what the
    cache stores.
    """
    client = get_openai_client()
    response = client.chat.completions.parse(
        model=model,
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": question},
        ],
        response_format=ComplexityClassifierResponse,
    )
    parsed = response.choices[0].message.parsed
    assert parsed is not None  # response_format guarantees this on success
    return {"classification": parsed.classification.value, "reasoning": parsed.reasoning}


def classify_question_complexity(question: str, settings: Settings) -> ComplexityClassification:
    cache = get_cache_for_settings(settings)
    key_parts = ("classify_question_complexity", settings.routing_simple_model, question)
    result, _ = cached_call(
        cache, key_parts, lambda: _call_complexity_classifier_api(question, settings.routing_simple_model)
    )
    return ComplexityClassification(result["classification"])


def choose_generation_model(question: str, passages: list[RetrievedPassage], settings: Settings) -> str:
    """Returns the model generate_answer() should actually call.

    Returns settings.llm_model unchanged when routing is disabled, when
    nothing was retrieved, when the top retrieval match is too weak (a
    free gate, checked before spending the classifier call), or when
    the classifier call itself fails -- a failed cost optimization
    should never turn into a failed (or silently downgraded) request.
    """
    if not settings.use_model_routing:
        return settings.llm_model
    if not passages:
        return settings.llm_model

    top_score = max(p.similarity_score for p in passages)
    if top_score < settings.routing_min_top_similarity_for_simple:
        return settings.llm_model

    try:
        classification = classify_question_complexity(question, settings)
    except Exception:
        logger.warning("Complexity classification failed; falling back to llm_model.", exc_info=True)
        return settings.llm_model

    if classification == ComplexityClassification.SIMPLE:
        return settings.routing_simple_model
    return settings.llm_model
