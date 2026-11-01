import re
from dataclasses import dataclass

from chromadb.api.models.Collection import Collection
from rank_bm25 import BM25Okapi

from app.schemas import RetrievedPassage

_TOKEN_PATTERN = re.compile(r"[a-z0-9]+")


def _tokenize(text: str) -> list[str]:
    return _TOKEN_PATTERN.findall(text.lower())


@dataclass
class BM25Index:
    """An in-memory keyword index built from the Chroma collection's own chunks.

    Deliberately no second persisted store: Chroma already holds every
    chunk's text, so this is rebuilt from collection.get() once at
    startup. There is exactly one source of truth for chunk content;
    BM25 is just a different index TYPE over the same data, not a copy
    of it that could drift out of sync.
    """

    bm25: BM25Okapi
    chunk_ids: list[str]
    doc_ids: list[str]
    chunk_indices: list[int]
    texts: list[str]


def build_bm25_index(collection: Collection) -> BM25Index:
    data = collection.get(include=["documents", "metadatas"])
    chunk_ids: list[str] = data["ids"]
    texts: list[str] = data["documents"]
    doc_ids = [m["doc_id"] for m in data["metadatas"]]
    chunk_indices = [m["chunk_index"] for m in data["metadatas"]]

    tokenized_corpus = [_tokenize(t) for t in texts]
    bm25 = BM25Okapi(tokenized_corpus)

    return BM25Index(bm25=bm25, chunk_ids=chunk_ids, doc_ids=doc_ids, chunk_indices=chunk_indices, texts=texts)


def bm25_search(index: BM25Index, query: str, top_n: int) -> list[RetrievedPassage]:
    """Keyword-overlap search over the in-memory BM25 index.

    A chunk with zero token overlap with the query gets a BM25 score of
    0 -- that's expected BM25 behavior, not an error, and such results
    simply contribute minimally once fused with dense results via RRF.
    """
    scores = index.bm25.get_scores(_tokenize(query))
    ranked_positions = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:top_n]

    return [
        RetrievedPassage(
            chunk_id=index.chunk_ids[i],
            doc_id=index.doc_ids[i],
            chunk_index=index.chunk_indices[i],
            text=index.texts[i],
            similarity_score=float(scores[i]),
        )
        for i in ranked_positions
    ]
