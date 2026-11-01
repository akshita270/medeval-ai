"""Build (or rebuild) the persistent Chroma index from data/raw_documents.

This is a deliberate, explicit step — not something the API triggers on
a request — because embedding is an API call with real cost, and the
index only needs to change when the documents or chunking config change.

Run from the project root:
    python -m scripts.build_index
"""

from app.config import get_settings
from app.embeddings.embedder import embed_texts
from app.ingestion.chunker import chunk_document
from app.ingestion.cleaner import clean_text
from app.ingestion.loader import load_documents
from app.schemas import DocumentChunk
from app.vectorstore.chroma_store import add_chunks, get_collection


def build_index() -> None:
    settings = get_settings()

    print(f"Loading documents from {settings.raw_documents_dir}")
    documents = load_documents(settings.raw_documents_dir)
    print(f"Loaded {len(documents)} documents")

    all_chunks: list[DocumentChunk] = []
    for doc in documents:
        cleaned = clean_text(doc.text)
        chunks = chunk_document(doc, cleaned, settings.chunk_size, settings.chunk_overlap, settings.embedding_model)
        all_chunks.extend(chunks)
        print(f"  {doc.doc_id}: {len(chunks)} chunks")

    print(
        f"\nConfig: chunk_size={settings.chunk_size} chunk_overlap={settings.chunk_overlap} "
        f"embedding_model={settings.embedding_model}"
    )
    print(f"Embedding {len(all_chunks)} chunks...")
    embedding_result = embed_texts([c.text for c in all_chunks], settings.embedding_model)
    print(f"Embedded {len(embedding_result.vectors)} chunks, {embedding_result.total_tokens} tokens billed")

    collection = get_collection(settings.chroma_persist_dir, settings.chroma_collection_name)
    add_chunks(collection, all_chunks, embedding_result.vectors)

    print(
        f"\nIndex ready: collection '{settings.chroma_collection_name}' at "
        f"{settings.chroma_persist_dir} now has {collection.count()} chunks"
    )


if __name__ == "__main__":
    build_index()
