from app.guardrails.citation_guardrails import check_citation_grounding
from app.guardrails.schema import GuardrailAction
from app.schemas import CitationDetail, RetrievedPassage

PASSAGE = RetrievedPassage(
    chunk_id="docA::0001",
    doc_id="docA",
    chunk_index=1,
    text="SGLT2 inhibitors reduce cardiovascular risk in patients with type 2 diabetes.",
    similarity_score=0.8,
)


class TestCheckCitationGrounding:
    def test_allows_empty_citations(self):
        # An abstention answer with no citations -- nothing to check.
        result = check_citation_grounding([], [PASSAGE])
        assert result.action == GuardrailAction.ALLOW

    def test_allows_exact_verbatim_quote(self):
        citation = CitationDetail(
            doc_id="docA", chunk_id="docA::0001", quote="SGLT2 inhibitors reduce cardiovascular risk"
        )
        result = check_citation_grounding([citation], [PASSAGE])
        assert result.action == GuardrailAction.ALLOW

    def test_allows_quote_despite_case_and_whitespace_differences(self):
        # Tolerant of formatting noise (case, stray whitespace), not a
        # fuzzy/semantic match -- still must be the real words in order.
        citation = CitationDetail(
            doc_id="docA", chunk_id="docA::0001", quote="sglt2 inhibitors   reduce cardiovascular risk"
        )
        result = check_citation_grounding([citation], [PASSAGE])
        assert result.action == GuardrailAction.ALLOW

    def test_blocks_quote_not_present_in_chunk_text(self):
        citation = CitationDetail(
            doc_id="docA", chunk_id="docA::0001", quote="this exact sentence does not appear anywhere"
        )
        result = check_citation_grounding([citation], [PASSAGE])
        assert result.action == GuardrailAction.BLOCK
        assert result.check_name == "citation_grounding"

    def test_blocks_citation_to_chunk_id_not_in_passages(self):
        # Defense-in-depth: should never happen (generator.py already
        # filters these out), but the guardrail itself must not assume
        # that filter always ran.
        citation = CitationDetail(doc_id="docZ", chunk_id="docZ::9999", quote="anything")
        result = check_citation_grounding([citation], [PASSAGE])
        assert result.action == GuardrailAction.BLOCK
        assert result.check_name == "citation_grounding"

    def test_blocks_on_first_bad_citation_even_with_a_good_one_present(self):
        good = CitationDetail(doc_id="docA", chunk_id="docA::0001", quote="SGLT2 inhibitors reduce")
        bad = CitationDetail(doc_id="docA", chunk_id="docA::0001", quote="fabricated text not in the source")
        result = check_citation_grounding([good, bad], [PASSAGE])
        assert result.action == GuardrailAction.BLOCK
