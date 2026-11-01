"""Deterministic (non-LLM) checks.

These compute facts, not opinions -- no API call, no subjectivity, no
cost. Keeping them in their own module (separate from judge_service.py,
which holds the LLM-judged metrics) is a direct implementation of the
brief's requirement to "separate deterministic checks from LLM-based
judgments": nothing in this file ever calls an LLM.
"""

from app.schemas import GeneratedAnswer

# USD per 1 million tokens, (input, output). Verified against OpenAI's
# published pricing as of this writing -- update if pricing changes, and
# add an entry here before using a new model, rather than guessing.
_PRICING_PER_MILLION_TOKENS: dict[str, tuple[float, float]] = {
    "gpt-5-mini": (0.25, 2.00),
    "gpt-4o-mini": (0.15, 0.60),
}


def estimate_cost_usd(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    """Estimate USD cost for one chat completion call.

    Raises on an unrecognized model rather than silently returning 0 --
    a cost report that's quietly wrong is worse than one that fails loudly.
    """
    if model not in _PRICING_PER_MILLION_TOKENS:
        raise ValueError(f"No pricing entry for model '{model}' -- add one to _PRICING_PER_MILLION_TOKENS")
    input_price, output_price = _PRICING_PER_MILLION_TOKENS[model]
    return (prompt_tokens * input_price + completion_tokens * output_price) / 1_000_000


def citations_are_valid(answer: GeneratedAnswer) -> bool:
    """Did the model only cite documents it was actually given?

    A citation pointing at a doc_id absent from retrieved_passages would
    mean the model invented a source -- a hard failure a cheap set
    comparison catches without needing an LLM to notice.
    """
    retrieved_doc_ids = {p.doc_id for p in answer.retrieved_passages}
    return all(citation in retrieved_doc_ids for citation in answer.citations)


_ABSTENTION_PHRASES = (
    "do not contain sufficient information",
    "does not contain sufficient information",
    "insufficient information",
    "cannot be answered",
    "not contain enough information",
    "do not provide sufficient",
)


def looks_like_abstention(answer_text: str) -> bool:
    """Cheap keyword heuristic for "did the model attempt to abstain?"

    This is NOT the Abstention Quality metric -- it's a fast, free,
    deterministic pre-check (e.g. for sanity-checking a batch run before
    spending judge-LLM calls on it). Whether an abstention was the
    *correct* and *well-reasoned* choice is a judgment call that belongs
    to the LLM-judged abstention_quality metric in judge_service.py.
    """
    lowered = answer_text.lower()
    return any(phrase in lowered for phrase in _ABSTENTION_PHRASES)
