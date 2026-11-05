from enum import Enum

from pydantic import BaseModel


class GuardrailAction(str, Enum):
    ALLOW = "allow"
    BLOCK = "block"


class GuardrailCheckResult(BaseModel):
    """Outcome of one specific guardrail check.

    `action` reflects only this check -- a caller combines several
    checks' results into one `GuardrailDecision`, never relies on a
    single check in isolation.
    """

    check_name: str
    action: GuardrailAction
    reason: str | None = None


class GuardrailDecision(BaseModel):
    """The combined outcome of every input (or output) guardrail check
    run for one request -- what the API layer actually acts on.
    """

    action: GuardrailAction
    triggered_checks: list[GuardrailCheckResult]

    @property
    def blocked(self) -> bool:
        return self.action == GuardrailAction.BLOCK
