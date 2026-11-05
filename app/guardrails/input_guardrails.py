import re

from app.guardrails.schema import GuardrailAction, GuardrailCheckResult
from app.schemas import RetrievedPassage

# Heuristic, not exhaustive -- a regex list catches the common/lazy attempts
# cheaply (no API call) but is not a complete defense on its own. It's the
# first, fastest layer; a semantic (LLM-based) check is the second layer for
# what phrasing like this misses.
_INJECTION_PATTERNS = [
    re.compile(p, re.IGNORECASE)
    for p in [
        r"ignore (all |any )?(previous|prior|above|the) instructions",
        r"disregard (all |any )?(previous|prior|above|the) (instructions|rules)",
        r"you are now",
        r"act as (a|an)\b",
        r"pretend (you are|to be)",
        r"new instructions\s*:",
        r"system prompt",
        r"reveal (your|the) (system )?prompt",
        r"\bDAN\b",
        r"jailbreak",
        r"bypass (your|the) (rules|restrictions|guidelines|safety)",
    ]
]

# Also heuristic -- aimed at the common phrasing of "what should *I personally*
# do," not every mention of dosing. A genuine research question like "what is
# the recommended starting dose of metformin" should NOT match this; a
# personal one like "what dose should I take" should.
_PERSONALIZED_ADVICE_PATTERNS = [
    re.compile(p, re.IGNORECASE)
    for p in [
        r"\b(should|can|could) i (take|use|stop|start)\b",
        r"what dose should i\b",
        r"how much should i\b",
        r"is it safe for me\b",
        r"i have (type ?2 )?diabetes.*(what|should)",
        r"my (doctor|dose|dosage|medication)\b.*\b(should|change|switch)",
    ]
]


def check_prompt_injection(question: str) -> GuardrailCheckResult:
    for pattern in _INJECTION_PATTERNS:
        if pattern.search(question):
            return GuardrailCheckResult(
                check_name="prompt_injection",
                action=GuardrailAction.BLOCK,
                reason=f"Matched injection pattern: {pattern.pattern!r}",
            )
    return GuardrailCheckResult(check_name="prompt_injection", action=GuardrailAction.ALLOW)


def check_personalized_advice_request(question: str) -> GuardrailCheckResult:
    for pattern in _PERSONALIZED_ADVICE_PATTERNS:
        if pattern.search(question):
            return GuardrailCheckResult(
                check_name="personalized_advice_request",
                action=GuardrailAction.BLOCK,
                reason=f"Matched personalized-advice pattern: {pattern.pattern!r}",
            )
    return GuardrailCheckResult(check_name="personalized_advice_request", action=GuardrailAction.ALLOW)


def check_topic_relevance(passages: list[RetrievedPassage], min_score: float) -> GuardrailCheckResult:
    """Flags a question as out-of-scope using the similarity scores
    retrieval already computed -- no separate embedding call. If even the
    best-matching chunk is a poor match, the question likely isn't about
    anything in this document collection.

    `min_score` is an initial estimate, not yet calibrated against real
    off-topic questions (same situation the regression/latency thresholds
    started in before being fixed with real measurements -- see
    app/config.py).
    """
    best_score = max((p.similarity_score for p in passages), default=0.0)
    if best_score < min_score:
        return GuardrailCheckResult(
            check_name="topic_relevance",
            action=GuardrailAction.BLOCK,
            reason=f"Best retrieved passage similarity ({best_score:.3f}) is below threshold ({min_score}).",
        )
    return GuardrailCheckResult(check_name="topic_relevance", action=GuardrailAction.ALLOW)
