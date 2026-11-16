"""Guardrail: verifies each citation the model made is actually grounded
in the real text of the chunk it names.

generate_answer() already filters out any citation pointing at a
chunk_id that wasn't retrieved (a structural fabrication). This check
catches the subtler failure: a citation naming a *real, retrieved*
chunk, but with a `quote` that chunk doesn't actually contain -- which
looks grounded but isn't. Mirrors the same idea Phase 2's golden dataset
uses for `supporting_evidence` (a hand-written evidence quote is
programmatically verified as a real substring of the source document),
applied here to the model's own citations, live, on every answer.
"""

import re

from app.guardrails.schema import GuardrailAction, GuardrailCheckResult
from app.schemas import CitationDetail, RetrievedPassage


def _normalize(text: str) -> str:
    """Collapses whitespace and lowercases so a real verbatim quote still
    matches despite a stray newline or case difference. Not a fuzzy or
    semantic match -- just tolerant of formatting noise, not paraphrase.
    """
    return re.sub(r"\s+", " ", text).strip().lower()


def check_citation_grounding(citations: list[CitationDetail], passages: list[RetrievedPassage]) -> GuardrailCheckResult:
    """BLOCKs on the first citation whose quote isn't a verbatim
    substring of the chunk it names. An empty `citations` list (e.g. an
    abstention answer) trivially ALLOWs -- there's nothing to check.
    """
    passages_by_chunk_id = {p.chunk_id: p for p in passages}

    for citation in citations:
        passage = passages_by_chunk_id.get(citation.chunk_id)
        if passage is None:
            # Shouldn't happen -- generate_answer() already filters to
            # retrieved chunk_ids -- but a defense-in-depth check should
            # never assume an earlier filter always ran correctly.
            return GuardrailCheckResult(
                check_name="citation_grounding",
                action=GuardrailAction.BLOCK,
                reason=f"Citation references chunk_id {citation.chunk_id!r}, which was not retrieved.",
            )

        if _normalize(citation.quote) not in _normalize(passage.text):
            return GuardrailCheckResult(
                check_name="citation_grounding",
                action=GuardrailAction.BLOCK,
                reason=(
                    f"Quote for chunk {citation.chunk_id!r} is not a verbatim substring of that "
                    "chunk's text -- the citation may be misquoted or fabricated."
                ),
            )

    return GuardrailCheckResult(check_name="citation_grounding", action=GuardrailAction.ALLOW)
