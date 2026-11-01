import re

# Citation brackets left behind after reference numbers are stripped upstream,
# e.g. "(T2D) [–]." or "bodyweight [,]." — punctuation-only, zero information.
_ORPHANED_CITATION_BRACKETS = re.compile(r"\[[\s,;–—-]*\]")

_SPACE_BEFORE_PUNCTUATION = re.compile(r" +([.,;:])")
_REPEATED_SPACES_OR_TABS = re.compile(r"[ \t]+")
_EXCESS_BLANK_LINES = re.compile(r"\n{3,}")


def clean_text(text: str) -> str:
    """Strip extraction artifacts from loaded document text.

    This removes noise introduced by the loading/extraction step
    (orphaned citation brackets, irregular whitespace) without altering
    the substance of what the source document actually says — the
    cleaned text must still be something a citation can point back to.
    """
    text = _ORPHANED_CITATION_BRACKETS.sub("", text)
    text = _SPACE_BEFORE_PUNCTUATION.sub(r"\1", text)

    lines = [_REPEATED_SPACES_OR_TABS.sub(" ", line).strip() for line in text.split("\n")]
    text = "\n".join(lines)

    text = _EXCESS_BLANK_LINES.sub("\n\n", text)
    return text.strip()
