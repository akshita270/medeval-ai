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

from app.schemas import CitationDetail, RetrievedPassage


def _normalize(text: str) -> str:
    """Collapses whitespace and lowercases so a real verbatim quote still
    matches despite a stray newline or case difference. Not a fuzzy or
    semantic match -- just tolerant of formatting noise, not paraphrase.
    """
    return re.sub(r"\s+", " ", text).strip().lower()


_ELLIPSIS_PATTERN = re.compile(r"\s*(?:\.\.\.|…)\s*")


def _is_grounded(quote: str, chunk_text: str) -> bool:
    """A quote is grounded if it's a verbatim substring of the chunk --
    OR if it's several verbatim substrings joined by "..."/"…" (a real,
    common convention for eliding the unquoted middle of a longer
    passage), each one appearing in the chunk in the same left-to-right
    order as in the quote. This is still a verbatim check, not a fuzzy
    one: every word kept must be exact, and nothing fabricated between
    the kept spans survives -- only genuinely elided text is tolerated.
    """
    segments = [s for s in _ELLIPSIS_PATTERN.split(quote) if s.strip()]
    if not segments:
        return False  # a quote that's nothing but ellipses has no real content to ground

    search_from = 0
    for segment in segments:
        position = chunk_text.find(_normalize(segment), search_from)
        if position == -1:
            return False
        search_from = position + len(_normalize(segment))
    return True


def filter_grounded_citations(
    citations: list[CitationDetail], passages: list[RetrievedPassage]
) -> tuple[list[CitationDetail], list[str]]:
    """Splits citations into the ones actually grounded in the chunk they
    name (see _is_grounded) and the ones that aren't, instead of failing
    the whole answer over a single bad quote. One ungrounded citation
    doesn't mean the rest of the answer is untrustworthy -- it means that
    one claim's "proof" can't be verified, so only that citation should be
    dropped. Returns (kept_citations, reasons_for_each_dropped_citation).
    """
    passages_by_chunk_id = {p.chunk_id: p for p in passages}
    kept: list[CitationDetail] = []
    dropped_reasons: list[str] = []

    for citation in citations:
        passage = passages_by_chunk_id.get(citation.chunk_id)
        if passage is None:
            # Shouldn't happen -- generate_answer() already filters to
            # retrieved chunk_ids -- but a defense-in-depth check should
            # never assume an earlier filter always ran correctly.
            dropped_reasons.append(f"Citation references chunk_id {citation.chunk_id!r}, which was not retrieved.")
            continue

        if not _is_grounded(citation.quote, _normalize(passage.text)):
            dropped_reasons.append(
                f"Quote for chunk {citation.chunk_id!r} is not a verbatim substring (or verbatim "
                "spans joined by an elision) of that chunk's text -- the citation may be "
                "misquoted or fabricated."
            )
            continue

        kept.append(citation)

    return kept, dropped_reasons
