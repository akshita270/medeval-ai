from functools import lru_cache
from typing import TYPE_CHECKING

from app.schemas import RetrievedPassage

if TYPE_CHECKING:
    from sentence_transformers import CrossEncoder


@lru_cache
def _get_reranker(model_name: str) -> "CrossEncoder":
    """Cached per model name -- loading a cross-encoder is expensive
    (model weights into memory); we want exactly one load per model per
    process, not one per rerank() call.

    Imports sentence_transformers/torch here rather than at module level:
    reranking is off by default (use_reranking=False), and that import
    alone pulls several hundred MB into every process regardless of
    whether reranking is ever used -- too costly to pay unconditionally
    on a memory-constrained deploy target.
    """
    from sentence_transformers import CrossEncoder

    return CrossEncoder(model_name)


def rerank(query: str, passages: list[RetrievedPassage], top_k: int, model_name: str) -> list[RetrievedPassage]:
    """Re-score (query, passage) pairs with a cross-encoder and return the top_k.

    This runs locally (no API call) after retrieval has already produced
    a candidate list -- it reorders what's already been retrieved, it
    does not retrieve anything new. A passage the retrieval step never
    found in the first place cannot be recovered by reranking.
    """
    if not passages:
        return []

    reranker = _get_reranker(model_name)
    pairs = [(query, p.text) for p in passages]
    scores = reranker.predict(pairs)

    reranked = sorted(zip(passages, scores), key=lambda pair: pair[1], reverse=True)[:top_k]

    return [
        RetrievedPassage(
            chunk_id=passage.chunk_id,
            doc_id=passage.doc_id,
            chunk_index=passage.chunk_index,
            text=passage.text,
            similarity_score=float(score),
        )
        for passage, score in reranked
    ]
