import pytest

from app.schemas import GeneratedAnswer, GenerationConfig, RetrievedPassage
from evaluation.judge.metrics import citations_are_valid, estimate_cost_usd, looks_like_abstention

CONFIG = GenerationConfig(
    llm_model="gpt-5-mini",
    embedding_model="text-embedding-3-small",
    prompt_version="v1",
    chunk_size=800,
    chunk_overlap=100,
    retrieval_top_k=5,
)
PASSAGES = [
    RetrievedPassage(chunk_id="docA::0001", doc_id="docA", chunk_index=1, text="...", similarity_score=0.8),
    RetrievedPassage(chunk_id="docB::0002", doc_id="docB", chunk_index=2, text="...", similarity_score=0.6),
]


def _answer(citations: list[str]) -> GeneratedAnswer:
    return GeneratedAnswer(
        query="q",
        answer="a",
        citations=citations,
        retrieved_passages=PASSAGES,
        config=CONFIG,
        prompt_tokens=10,
        completion_tokens=5,
        total_tokens=15,
    )


def test_citation_to_a_retrieved_doc_is_valid():
    assert citations_are_valid(_answer(["docA"])) is True


def test_citation_to_a_doc_never_retrieved_is_invalid():
    assert citations_are_valid(_answer(["docZ"])) is False


def test_no_citations_is_trivially_valid():
    assert citations_are_valid(_answer([])) is True


@pytest.mark.parametrize(
    "text",
    [
        "The retrieved documents do not contain sufficient information to answer this.",
        "This cannot be answered from the available evidence.",
    ],
)
def test_abstention_phrases_are_detected(text):
    assert looks_like_abstention(text) is True


def test_a_substantive_answer_is_not_flagged_as_abstention():
    assert looks_like_abstention("SGLT2 inhibitors lower glucose by inhibiting renal reabsorption.") is False


def test_cost_estimate_matches_hand_computed_value():
    cost = estimate_cost_usd("gpt-5-mini", prompt_tokens=1_000_000, completion_tokens=1_000_000)
    assert abs(cost - 2.25) < 1e-9  # $0.25 input + $2.00 output per 1M tokens


def test_unknown_model_raises_instead_of_returning_zero():
    with pytest.raises(ValueError, match="No pricing entry"):
        estimate_cost_usd("not-a-real-model", 100, 100)
