from dataclasses import dataclass
from typing import cast

from app.config import Settings, get_settings
from app.llm_cache import get_cache_for_settings, make_cache_key
from app.llm_client import get_openai_client

# Well under OpenAI's per-request input limits for the embeddings endpoint;
# also keeps any single failed request's retry cost small.
_BATCH_SIZE = 100


@dataclass
class EmbeddingBatchResult:
    vectors: list[list[float]]
    total_tokens: int


def embed_texts(texts: list[str], model: str, settings: Settings | None = None) -> EmbeddingBatchResult:
    """Embed texts via the OpenAI embeddings API, preserving input order.

    Requests are batched to reduce round trips. Token usage is accumulated
    and returned so callers can log/estimate embedding cost (needed later
    for MLflow experiment tracking and budget monitoring) without a second
    pass over the data. The OpenAI SDK already retries transient errors
    (rate limits, 5xxs) by default, so no retry logic is duplicated here.

    When caching is enabled (see app/llm_cache.py), each text is looked up
    *individually* -- not the whole batch as one unit -- so re-running
    scripts/build_index.py after changing only a few documents re-embeds
    just the new/changed chunks, and a repeated single-query embedding in
    app/retrieval/retriever.py is free the second time. `settings`
    defaults to get_settings() so existing callers don't need to change.
    """
    if not texts:
        return EmbeddingBatchResult(vectors=[], total_tokens=0)

    settings = settings or get_settings()
    cache = get_cache_for_settings(settings)

    vectors: list[list[float] | None] = [None] * len(texts)
    uncached_indices: list[int] = []
    for i, text in enumerate(texts):
        hit = cache.get(make_cache_key("embed_text", model, text)) if cache is not None else None
        if hit is not None:
            vectors[i] = hit["vector"]
        else:
            uncached_indices.append(i)

    client = get_openai_client()
    total_tokens = 0

    for start in range(0, len(uncached_indices), _BATCH_SIZE):
        batch_indices = uncached_indices[start : start + _BATCH_SIZE]
        batch_texts = [texts[i] for i in batch_indices]
        response = client.embeddings.create(input=batch_texts, model=model)
        total_tokens += response.usage.total_tokens
        for idx, item in zip(batch_indices, response.data, strict=True):
            vectors[idx] = item.embedding
            if cache is not None:
                cache.set(make_cache_key("embed_text", model, texts[idx]), {"vector": item.embedding})

    return EmbeddingBatchResult(vectors=cast(list[list[float]], vectors), total_tokens=total_tokens)
