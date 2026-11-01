from chromadb.api.models.Collection import Collection

from app.retrieval.bm25_index import BM25Index, bm25_search
from app.retrieval.retriever import dense_search
from app.schemas import RetrievedPassage

# Standard constant from Cormack et al. (2009). Dampens the influence of
# exact rank position -- rank 1 vs rank 2 matters less than rank 1 vs
# "absent entirely" once added to k.
_RRF_K = 60


def reciprocal_rank_fusion(rankings: list[list[str]], k: int = _RRF_K) -> dict[str, float]:
    """Combine multiple rankings (lists of chunk_ids, best first) into one fused score per chunk_id.

    score(d) = sum, over each ranking where d appears, of 1 / (k + rank_r(d))
    (rank_r is 1-indexed). A chunk_id absent from a given ranking simply
    contributes 0 from it -- it doesn't need to appear in every list to
    be scored.
    """
    fused_scores: dict[str, float] = {}
    for ranking in rankings:
        for rank, chunk_id in enumerate(ranking, start=1):
            fused_scores[chunk_id] = fused_scores.get(chunk_id, 0.0) + 1.0 / (k + rank)
    return fused_scores


def hybrid_retrieve(
    query: str,
    collection: Collection,
    bm25_index: BM25Index,
    embedding_model: str,
    top_k: int,
    candidate_pool_size: int,
) -> list[RetrievedPassage]:
    """Fuse dense + BM25 candidate pools via RRF, return the top_k fused results.

    Each leg retrieves `candidate_pool_size` candidates -- deliberately
    more than top_k -- before fusion. Fusing two already-truncated
    top-k lists would throw away exactly the signal RRF exists to use:
    a chunk ranked 8th by dense search and 3rd by BM25 should be able to
    surface into the final top-k even though neither method alone put
    it in its own top-k.
    """
    dense_candidates = dense_search(query, collection, embedding_model, candidate_pool_size)
    bm25_candidates = bm25_search(bm25_index, query, candidate_pool_size)

    dense_ranking = [p.chunk_id for p in dense_candidates]
    bm25_ranking = [p.chunk_id for p in bm25_candidates]
    fused_scores = reciprocal_rank_fusion([dense_ranking, bm25_ranking])

    # A chunk_id may come from only one of the two pools; merge metadata
    # from whichever pool(s) produced it, deduped by chunk_id. Document
    # identifiers/metadata stay consistent across both retrieval systems
    # because both read them from the same Chroma collection.
    passages_by_id: dict[str, RetrievedPassage] = {}
    for passage in dense_candidates + bm25_candidates:
        passages_by_id[passage.chunk_id] = passage

    ranked_ids = sorted(fused_scores, key=lambda cid: fused_scores[cid], reverse=True)[:top_k]
    return [
        RetrievedPassage(
            chunk_id=chunk_id,
            doc_id=passages_by_id[chunk_id].doc_id,
            chunk_index=passages_by_id[chunk_id].chunk_index,
            text=passages_by_id[chunk_id].text,
            similarity_score=fused_scores[chunk_id],
        )
        for chunk_id in ranked_ids
    ]
