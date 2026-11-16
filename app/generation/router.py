"""Complexity-based model routing for generation: sends a question to a
cheaper, faster model when it looks like a simple, single-source
factual lookup, and reserves the full llm_model for everything else.

Entirely free -- no extra API call. Routing decisions come only from
signals already available for free: the question text itself, and the
retrieval scores retrieve_passages() already computed before
generate_answer() is ever called.

Off by default (use_model_routing=False). Unlike guardrail_model's
cheap-model swap (a 5-way classification task, safe to swap outright),
this changes which model answers the question -- a misrouted "hard"
question silently loses answer quality. Validate with
scripts/run_evaluation.py (compare a routed run against an unrouted one
on the golden dataset) before trusting this in production.
"""

import re

from app.config import Settings
from app.schemas import RetrievedPassage

# Signals that a question needs multi-source reasoning, not a single
# factual lookup -- comparison, causal/explanatory, and multi-part
# phrasing. Deliberately conservative: a false "complex" verdict only
# costs a bit more money (routed to the full model anyway); a false
# "simple" verdict costs answer quality, so any one of these is enough
# to rule out the cheap model.
_COMPLEX_SIGNAL_PATTERNS = [
    re.compile(p, re.IGNORECASE)
    for p in [
        r"\bcompare\b",
        r"\bdifference between\b",
        r"\brelationship between\b",
        r"\bversus\b|\bvs\.?\b",
        r"\bwhy\b",
        r"\bexplain\b",
        r"\band\b.*\?.*\band\b",  # multiple question-ish clauses joined by "and"
    ]
]


def is_simple_question(question: str, passages: list[RetrievedPassage], settings: Settings) -> bool:
    """True if `question` looks safe to route to the cheaper model.

    All three free signals must agree for a "simple" verdict:
    1. Short question -- long questions tend to pack in more sub-asks.
    2. No complexity-signal phrasing (comparison/causal/multi-part).
    3. Retrieval is confident and concentrated: the top passage's score
       meets the threshold, meaning this looks like a single-source
       lookup rather than something needing synthesis across sources.
    """
    if len(question) > settings.routing_max_question_length:
        return False

    if any(pattern.search(question) for pattern in _COMPLEX_SIGNAL_PATTERNS):
        return False

    if not passages:
        return False

    top_score = max(p.similarity_score for p in passages)
    return top_score >= settings.routing_min_top_similarity_for_simple


def choose_generation_model(question: str, passages: list[RetrievedPassage], settings: Settings) -> str:
    """Returns the model generate_answer() should actually call.

    Returns settings.llm_model unchanged when routing is disabled -- the
    ablation-toggle default -- so this function is a pure passthrough
    unless use_model_routing is explicitly turned on.
    """
    if not settings.use_model_routing:
        return settings.llm_model
    if is_simple_question(question, passages, settings):
        return settings.routing_simple_model
    return settings.llm_model
