import tiktoken

from app.schemas import DocumentChunk, RawDocument


def _get_encoding(embedding_model: str) -> tiktoken.Encoding:
    try:
        return tiktoken.encoding_for_model(embedding_model)
    except KeyError:
        # Fallback for models tiktoken doesn't recognise by name yet;
        # cl100k_base is what every current OpenAI embedding/chat model uses.
        return tiktoken.get_encoding("cl100k_base")


def _split_oversized_paragraph(
    paragraph: str, encoding: tiktoken.Encoding, chunk_size: int, chunk_overlap: int
) -> list[str]:
    """Hard-split a single paragraph that alone exceeds chunk_size tokens.

    Paragraph-aware splitting (the main path in chunk_text) assumes no
    single paragraph is larger than a chunk. This is the fallback for
    when that assumption breaks, so we never silently drop content.
    """
    tokens = encoding.encode(paragraph)
    pieces: list[str] = []
    step = max(chunk_size - chunk_overlap, 1)
    start = 0
    while start < len(tokens):
        end = min(start + chunk_size, len(tokens))
        pieces.append(encoding.decode(tokens[start:end]))
        if end == len(tokens):
            break
        start += step
    return pieces


def chunk_text(text: str, chunk_size: int, chunk_overlap: int, encoding: tiktoken.Encoding) -> list[str]:
    """Split cleaned text into token-bounded chunks along paragraph breaks.

    Paragraphs are kept whole and packed greedily up to chunk_size tokens,
    so chunks end at natural sentence/paragraph boundaries rather than
    mid-sentence. chunk_overlap carries the trailing paragraph(s) of one
    chunk into the start of the next, so a passage split across a chunk
    boundary still has surrounding context in at least one chunk.
    """
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]

    def token_count(paras: list[str]) -> int:
        # Measuring the actual "\n\n"-joined text (not summing per-paragraph
        # counts) matters: separators consume tokens too, and BPE merges
        # can differ slightly across a joined boundary versus in isolation.
        # Summing isolated counts under-counts and silently busts the budget.
        return len(encoding.encode("\n\n".join(paras))) if paras else 0

    chunks: list[str] = []
    current: list[str] = []

    def flush() -> None:
        if current:
            chunks.append("\n\n".join(current))

    for paragraph in paragraphs:
        para_token_count = len(encoding.encode(paragraph))

        if para_token_count > chunk_size:
            flush()
            chunks.extend(_split_oversized_paragraph(paragraph, encoding, chunk_size, chunk_overlap))
            current = []
            continue

        if current and token_count(current + [paragraph]) > chunk_size:
            flush()
            overlap: list[str] = []
            for p in reversed(current):
                if token_count([p, *overlap]) > chunk_overlap:
                    break
                overlap.insert(0, p)

            # The incoming paragraph (guaranteed <= chunk_size on its own)
            # still has to fit *with* the carried-over overlap. Trim the
            # oldest overlap paragraphs first until it does, rather than
            # letting the next chunk silently exceed chunk_size.
            while overlap and token_count([*overlap, paragraph]) > chunk_size:
                overlap.pop(0)

            current = overlap

        current.append(paragraph)

    flush()
    return chunks


def chunk_document(
    doc: RawDocument, cleaned_text: str, chunk_size: int, chunk_overlap: int, embedding_model: str
) -> list[DocumentChunk]:
    """Chunk one document's cleaned text into DocumentChunks with stable IDs."""
    encoding = _get_encoding(embedding_model)
    pieces = chunk_text(cleaned_text, chunk_size, chunk_overlap, encoding)

    return [
        DocumentChunk(
            chunk_id=f"{doc.doc_id}::{index:04d}",
            doc_id=doc.doc_id,
            chunk_index=index,
            text=piece,
            token_count=len(encoding.encode(piece)),
        )
        for index, piece in enumerate(pieces)
    ]
