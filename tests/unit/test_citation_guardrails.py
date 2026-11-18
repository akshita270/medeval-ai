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

    def test_allows_an_elided_quote_whose_kept_spans_are_both_real_and_in_order(self):
        # A real, common way to quote a longer passage: skip the
        # unquoted middle with "...". Each kept span is still exact and
        # appears in the chunk in the same order as in the quote.
        citation = CitationDetail(
            doc_id="docA",
            chunk_id="docA::0001",
            quote="SGLT2 inhibitors reduce ... risk in patients with type 2 diabetes",
        )
        result = check_citation_grounding([citation], [PASSAGE])
        assert result.action == GuardrailAction.ALLOW

    def test_allows_an_elided_quote_using_a_real_ellipsis_character(self):
        citation = CitationDetail(doc_id="docA", chunk_id="docA::0001", quote="SGLT2 inhibitors…risk in patients")
        result = check_citation_grounding([citation], [PASSAGE])
        assert result.action == GuardrailAction.ALLOW

    def test_blocks_an_elided_quote_whose_second_span_is_fabricated(self):
        # The first span is real; the second is not -- eliding the
        # middle must not let a fabricated claim ride along for free.
        citation = CitationDetail(
            doc_id="docA", chunk_id="docA::0001", quote="SGLT2 inhibitors reduce ... this part is made up entirely"
        )
        result = check_citation_grounding([citation], [PASSAGE])
        assert result.action == GuardrailAction.BLOCK

    def test_blocks_an_elided_quote_whose_spans_are_real_but_out_of_order(self):
        # Both halves are real text from the chunk, but reversed -- the
        # elision convention preserves reading order, it doesn't permit
        # reassembling the chunk's words into a different claim.
        citation = CitationDetail(
            doc_id="docA",
            chunk_id="docA::0001",
            quote="type 2 diabetes ... SGLT2 inhibitors reduce cardiovascular risk",
        )
        result = check_citation_grounding([citation], [PASSAGE])
        assert result.action == GuardrailAction.BLOCK

    def test_blocks_a_quote_that_is_nothing_but_ellipses(self):
        citation = CitationDetail(doc_id="docA", chunk_id="docA::0001", quote="...")
        result = check_citation_grounding([citation], [PASSAGE])
        assert result.action == GuardrailAction.BLOCK
