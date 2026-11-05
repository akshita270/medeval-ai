import re

from app.guardrails.schema import GuardrailAction, GuardrailCheckResult

# Heuristic, same caveat as input_guardrails.py: catches the LLM slipping
# into second-person imperative advice or a diagnosis directed at the
# reader. Deliberately does NOT match general educational statements like
# "the recommended starting dose of metformin is 500mg" (a fact about the
# drug, not advice to "you") -- only phrasing that addresses the reader
# personally.
_PERSONALIZED_ADVICE_LEAK_PATTERNS = [
    re.compile(p, re.IGNORECASE)
    for p in [
        r"\byou should take\b",
        r"\bi recommend (that )?you take\b",
        r"\byou (can|should|could) (start|stop|increase|decrease) (taking|your)\b",
        r"\bfor you,? the (right|correct|appropriate) dose\b",
        r"\byou (have|are suffering from|may have) (type ?2 )?diabetes\b",
    ]
]


def check_personalized_dosing_leak(answer: str) -> GuardrailCheckResult:
    for pattern in _PERSONALIZED_ADVICE_LEAK_PATTERNS:
        if pattern.search(answer):
            return GuardrailCheckResult(
                check_name="personalized_advice_leak",
                action=GuardrailAction.BLOCK,
                reason=f"Matched personalized-advice-leak pattern in output: {pattern.pattern!r}",
            )
    return GuardrailCheckResult(check_name="personalized_advice_leak", action=GuardrailAction.ALLOW)
