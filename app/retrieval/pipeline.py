from chromadb.api.models.Collection import Collection

from app.config import Settings
from app.retrieval.bm25_index import BM25Index
from app.retrieval.hybrid_retriever import hybrid_retrieve
from app.retrieval.reranker import rerank
from app.retrieval.retriever import dense_search
from app.schemas import RetrievedPassage


def retrieve_passages(
    query: str,
    collection: Collection,
    settings: Settings,
    bm25_index: BM25Index | None,
) -> list[RetrievedPassage]:
    """The single retrieval entry point: picks dense vs hybrid, and
    whether to rerank, from config -- so switching retrieval strategy
    for an ablation run is a config flip, not a code change.

    When reranking is on, the upstream step (dense or hybrid) returns a
    full `retrieval_candidate_pool_size` candidate pool instead of just
    top_k, since reranking needs real candidates to reorder -- asking it
    to re-sort an already-truncated top_k list would defeat the point.
    """
    if settings.use_hybrid_retrieval and bm25_index is None:
        raise ValueError("use_hybrid_retrieval is True but no bm25_index was built")

    n_results = settings.retrieval_candidate_pool_size if settings.use_reranking else settings.retrieval_top_k

    if settings.use_hybrid_retrieval:
        candidates = hybrid_retrieve(
            query, collection, bm25_index, settings.embedding_model, n_results, settings.retrieval_candidate_pool_size
        )
    else:
        candidates = dense_search(query, collection, settings.embedding_model, n_results)

    if settings.use_reranking:
        return rerank(query, candidates, settings.retrieval_top_k, settings.reranker_model)
    return candidates
