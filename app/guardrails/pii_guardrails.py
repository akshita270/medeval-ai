"""Guardrail: blocks likely real patient-identifying information, on
either the input (a user pasting it into a question) or the output (the
model echoing it back).

This project uses no real patient data anywhere (see README) -- this
check is defense-in-depth against a *user* introducing real identifiers,
not a response to the corpus or model ever producing them on their own.
Same free, regex-based, Layer-1 shape as input_guardrails.py /
output_guardrails.py; shared between both call sites since the patterns
below don't depend on which side the text comes from.
"""

import re

from app.guardrails.schema import GuardrailAction, GuardrailCheckResult

# Deliberately format-based (ID/date/contact shapes), not name-based --
# matching on names would false-positive on ordinary research text
# (author names, drug/condition names) far too often to be usable.
# Catches the shapes real patient records are identified by, not every
# way a person could be referred to -- a deliberate, accepted tradeoff
# of false negatives (a name alone slips through) for not flagging
# normal medical research questions.
_PATIENT_IDENTIFIER_PATTERNS = [
    re.compile(p, re.IGNORECASE)
    for p in [
        r"\b\d{3}-\d{2}-\d{4}\b",  # SSN, e.g. 123-45-6789
        r"\b(mrn|medical record number|patient id|patient number)[:#]?\s*\d{4,}\b",
        r"\bdob[:\s]*\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b",  # "DOB: 04/12/1980"
        r"\bdate of birth[:\s]*\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b",
        r"\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b",  # phone number
        r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b",  # email address
    ]
]


def check_patient_identifier(text: str) -> GuardrailCheckResult:
    """Flags `text` if it contains what looks like a real patient
    identifier (SSN, MRN, date of birth, phone number, or email). Used
    on both the input guardrail (block a question containing one) and
    the output guardrail (block an answer that echoes one back).
    """
    for pattern in _PATIENT_IDENTIFIER_PATTERNS:
        if pattern.search(text):
            return GuardrailCheckResult(
                check_name="patient_identifier",
                action=GuardrailAction.BLOCK,
                reason=f"Matched a likely patient-identifier pattern: {pattern.pattern!r}",
            )
    return GuardrailCheckResult(check_name="patient_identifier", action=GuardrailAction.ALLOW)
