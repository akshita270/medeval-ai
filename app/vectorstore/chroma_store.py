from pathlib import Path

import chromadb
from chromadb.api.models.Collection import Collection

from app.schemas import DocumentChunk


def get_collection(persist_dir: Path, collection_name: str) -> Collection:
    """Open (or create) a persistent Chroma collection.

    `embedding_function=None` matters: without it, Chroma defaults to its
    own embedding model and would silently re-embed anything we don't
    pass a vector for. We always compute embeddings ourselves via
    app.embeddings.embedder (same OpenAI model end to end), so Chroma
    must never be allowed to generate its own.

    The HNSW distance space is set to cosine, matching OpenAI's embeddings
    which are normalized and designed to be compared by cosine similarity
    (Chroma's own default is L2/Euclidean distance).
    """
    client = chromadb.PersistentClient(path=str(persist_dir))
    return client.get_or_create_collection(
        name=collection_name,
        embedding_function=None,
        configuration={"hnsw": {"space": "cosine"}},
    )


def add_chunks(collection: Collection, chunks: list[DocumentChunk], embeddings: list[list[float]]) -> None:
    """Add chunks and their precomputed embeddings to the collection.

    chunk_id is deterministic (see DocumentChunk), so re-running ingestion
    with the same documents/config overwrites the same rows via Chroma's
    upsert-by-id `add` behaviour rather than accumulating duplicates.
    """
    if len(chunks) != len(embeddings):
        raise ValueError(f"Got {len(chunks)} chunks but {len(embeddings)} embeddings")

    collection.add(
        ids=[c.chunk_id for c in chunks],
        embeddings=embeddings,
        documents=[c.text for c in chunks],
        metadatas=[{"doc_id": c.doc_id, "chunk_index": c.chunk_index, "token_count": c.token_count} for c in chunks],
    )
