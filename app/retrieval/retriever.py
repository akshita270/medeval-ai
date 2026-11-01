from chromadb.api.models.Collection import Collection

from app.embeddings.embedder import embed_texts
from app.schemas import RetrievedPassage


def dense_search(query: str, collection: Collection, embedding_model: str, n_results: int) -> list[RetrievedPassage]:
    """Embed `query` and return its n_results most similar chunks by cosine similarity.

    The caller passes a raw question string, not a vector — embedding the
    query with the exact same model used to embed the stored chunks is
    an invariant retrieval depends on, so that responsibility lives here
    rather than being left to every caller to get right independently.

    This is the shared primitive behind both plain dense retrieval
    (`retrieve`, below) and the dense leg of hybrid retrieval
    (`hybrid_retriever.hybrid_retrieve`) -- one embedding call site, not
    duplicated between the two retrieval strategies.
    """
    query_embedding = embed_texts([query], embedding_model).vectors[0]

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results,
        include=["documents", "metadatas", "distances"],
    )

    passages: list[RetrievedPassage] = []
    for chunk_id, document, metadata, distance in zip(
        results["ids"][0], results["documents"][0], results["metadatas"][0], results["distances"][0]
    ):
        passages.append(
            RetrievedPassage(
                chunk_id=chunk_id,
                doc_id=metadata["doc_id"],
                chunk_index=metadata["chunk_index"],
                text=document,
                similarity_score=1 - distance,
            )
        )
    return passages


def retrieve(query: str, collection: Collection, embedding_model: str, top_k: int) -> list[RetrievedPassage]:
    """Plain dense retrieval: the top_k most similar chunks. Unchanged
    behavior from before hybrid retrieval existed -- this remains the
    "dense-only" baseline for ablation comparisons.
    """
    return dense_search(query, collection, embedding_model, top_k)
