import tiktoken

from app.ingestion.chunker import chunk_text

ENCODING = tiktoken.get_encoding("cl100k_base")


def test_single_short_paragraph_is_one_chunk():
    chunks = chunk_text("A short paragraph.", chunk_size=800, chunk_overlap=100, encoding=ENCODING)
    assert chunks == ["A short paragraph."]


def test_never_exceeds_chunk_size_even_with_many_small_paragraphs():
    """Regression test for a real bug: summing per-paragraph token counts
    undercounts the joined text (separators cost tokens too), which once
    let chunks silently exceed the budget by up to ~20%.
    """
    paragraphs = [f"This is paragraph number {i} with some filler words to add length." for i in range(60)]
    text = "\n\n".join(paragraphs)

    chunks = chunk_text(text, chunk_size=100, chunk_overlap=20, encoding=ENCODING)

    assert len(chunks) > 1
    for chunk in chunks:
        assert len(ENCODING.encode(chunk)) <= 100


def test_oversized_single_paragraph_is_hard_split():
    huge_paragraph = " ".join(f"word{i}" for i in range(2000))
    chunks = chunk_text(huge_paragraph, chunk_size=100, chunk_overlap=20, encoding=ENCODING)

    assert len(chunks) > 1
    for chunk in chunks:
        assert len(ENCODING.encode(chunk)) <= 100


def test_no_content_is_dropped_across_chunks():
    paragraphs = [f"Paragraph {i}: unique marker UMARK{i}." for i in range(30)]
    text = "\n\n".join(paragraphs)
    chunks = chunk_text(text, chunk_size=80, chunk_overlap=10, encoding=ENCODING)

    combined = " ".join(chunks)
    for i in range(30):
        assert f"UMARK{i}" in combined


def test_overlap_carries_trailing_paragraph_into_next_chunk():
    # Three paragraphs of 8 tokens each (verified via tiktoken, not guessed):
    # chunk_size=20 fits exactly 2 of them; chunk_overlap=10 fits exactly 1
    # for carry-over. This forces chunks[0]=[P1,P2], chunks[1]=[P2,P3].
    paragraphs = [
        "Alpha paragraph with several words in it.",
        "Beta paragraph with several words in it.",
        "Gamma paragraph with several words in it.",
    ]
    text = "\n\n".join(paragraphs)
    chunks = chunk_text(text, chunk_size=20, chunk_overlap=10, encoding=ENCODING)

    assert len(chunks) == 2
    # The last paragraph of chunk 0 should reappear at the start of chunk 1
    # (whole-paragraph overlap, not a token slice).
    first_chunk_last_para = chunks[0].split("\n\n")[-1]
    assert first_chunk_last_para in chunks[1]
