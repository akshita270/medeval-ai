from dataclasses import dataclass

from app.llm_client import get_openai_client

# Well under OpenAI's per-request input limits for the embeddings endpoint;
# also keeps any single failed request's retry cost small.
_BATCH_SIZE = 100


@dataclass
class EmbeddingBatchResult:
    vectors: list[list[float]]
    total_tokens: int


def embed_texts(texts: list[str], model: str) -> EmbeddingBatchResult:
    """Embed texts via the OpenAI embeddings API, preserving input order.

    Requests are batched to reduce round trips. Token usage is accumulated
    and returned so callers can log/estimate embedding cost (needed later
    for MLflow experiment tracking and budget monitoring) without a second
    pass over the data. The OpenAI SDK already retries transient errors
    (rate limits, 5xxs) by default, so no retry logic is duplicated here.
    """
    if not texts:
        return EmbeddingBatchResult(vectors=[], total_tokens=0)

    client = get_openai_client()
    vectors: list[list[float]] = []
    total_tokens = 0

    for start in range(0, len(texts), _BATCH_SIZE):
        batch = texts[start : start + _BATCH_SIZE]
        response = client.embeddings.create(input=batch, model=model)
        vectors.extend(item.embedding for item in response.data)
        total_tokens += response.usage.total_tokens

    return EmbeddingBatchResult(vectors=vectors, total_tokens=total_tokens)
