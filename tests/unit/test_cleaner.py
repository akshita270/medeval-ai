from app.ingestion.cleaner import clean_text


def test_removes_orphaned_citation_brackets():
    text = "treatment of type 2 diabetes (T2D) [–]. These agents reduce glucose."
    cleaned = clean_text(text)
    assert "[–]" not in cleaned
    assert cleaned == "treatment of type 2 diabetes (T2D). These agents reduce glucose."


def test_removes_various_orphaned_bracket_forms():
    for bracket in ["[]", "[,]", "[,,]", "[ ]"]:
        text = f"a claim{bracket} followed by more text."
        cleaned = clean_text(text)
        assert bracket not in cleaned


def test_does_not_touch_brackets_with_real_content():
    text = "see [Table 1] for details."
    cleaned = clean_text(text)
    assert "[Table 1]" in cleaned


def test_collapses_repeated_spaces_and_tabs():
    text = "word1    word2\tword3"
    cleaned = clean_text(text)
    assert cleaned == "word1 word2 word3"


def test_collapses_excess_blank_lines_to_one_paragraph_break():
    text = "paragraph one.\n\n\n\n\nparagraph two."
    cleaned = clean_text(text)
    assert cleaned == "paragraph one.\n\nparagraph two."


def test_strips_leading_and_trailing_whitespace():
    text = "  \n  content here  \n  "
    cleaned = clean_text(text)
    assert cleaned == "content here"
