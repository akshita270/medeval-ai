from pathlib import Path

from pydantic import BaseModel


class RawDocument(BaseModel):
    """One source file, loaded but not yet cleaned or chunked.

    `doc_id` is derived from the filename (not a database row) so it stays
    stable across re-ingestion runs and can be cited back to the user as
    a source identifier.
    """

    doc_id: str
    file_path: Path
    file_type: str  # "txt" | "pdf"
    text: str


class DocumentChunk(BaseModel):
    """One chunk of a cleaned document, ready for embedding.

    `chunk_id` is deterministic (doc_id + index) so re-running ingestion
    with the same config reproduces the same IDs — required for the
    vector store to be rebuildable rather than accumulating duplicates.
    """

    chunk_id: str
    doc_id: str
    chunk_index: int
    text: str
    token_count: int


class RetrievedPassage(BaseModel):
    """One chunk returned by a retrieval method, with its relevance score.

    `similarity_score` always means "higher is better," but its scale
    depends on how the passage was retrieved: 1 - cosine_distance for
    plain dense search, an RRF-fused score for hybrid retrieval, or a
    cross-encoder logit after reranking. It is only comparable to other
    scores produced by the same retrieval method, never across methods.
    """

    chunk_id: str
    doc_id: str
    chunk_index: int
    text: str
    similarity_score: float


class GenerationConfig(BaseModel):
    """The exact configuration used to produce one answer.

    Attached to every GeneratedAnswer so an answer is reproducible and
    comparable later — this is what the regression-testing and MLflow
    phases will diff between a baseline and a candidate run.
    """

    llm_model: str
    embedding_model: str
    prompt_version: str
    chunk_size: int
    chunk_overlap: int
    retrieval_top_k: int


class GeneratedAnswer(BaseModel):
    """The full output of one question, including everything needed to
    judge or audit it later: the answer, which doc_ids it actually cited
    (extracted from the answer text itself, not just "whatever was
    retrieved"), the passages it was grounded in, the config that produced
    it, and token usage for cost tracking.
    """

    query: str
    answer: str
    citations: list[str]
    retrieved_passages: list[RetrievedPassage]
    config: GenerationConfig
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    # None for a normal generated answer. When a guardrail blocked the
    # request instead, this names which check(s) triggered, and `answer`
    # holds the blocked-request message rather than a generated one --
    # no LLM call was made, hence token counts of 0 above.
    blocked_by: list[str] | None = None
