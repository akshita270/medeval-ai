from unittest.mock import Mock, patch

from app.config import Settings
from app.embeddings.embedder import embed_texts


def _settings(**overrides) -> Settings:
    defaults = dict(
        openai_api_key="test",
        llm_model="gpt-5-mini",
        embedding_model="text-embedding-3-small",
        judge_model="gpt-5-mini",
        prompt_version="v1",
        chunk_size=800,
        chunk_overlap=100,
        retrieval_top_k=5,
    )
    defaults.update(overrides)
    return Settings(**defaults)


class _FakeItem:
    def __init__(self, embedding):
        self.embedding = embedding


class _FakeUsage:
    def __init__(self, total_tokens):
        self.total_tokens = total_tokens


class _FakeEmbeddingResponse:
    def __init__(self, embeddings, total_tokens):
        self.data = [_FakeItem(e) for e in embeddings]
        self.usage = _FakeUsage(total_tokens)


def test_preserves_input_order_and_accumulates_tokens():
    fake_client = Mock()
    fake_client.embeddings.create.return_value = _FakeEmbeddingResponse([[0.1, 0.2], [0.3, 0.4]], total_tokens=10)

    with patch("app.embeddings.embedder.get_openai_client", return_value=fake_client):
        result = embed_texts(["a", "b"], "text-embedding-3-small")

    assert result.vectors == [[0.1, 0.2], [0.3, 0.4]]
    assert result.total_tokens == 10


def test_batches_requests_larger_than_batch_size():
    # _BATCH_SIZE is 100; 150 texts must trigger 2 separate API calls.
    fake_client = Mock()
    fake_client.embeddings.create.side_effect = [
        _FakeEmbeddingResponse([[0.0]] * 100, total_tokens=100),
        _FakeEmbeddingResponse([[0.0]] * 50, total_tokens=50),
    ]

    with patch("app.embeddings.embedder.get_openai_client", return_value=fake_client):
        result = embed_texts(["x"] * 150, "text-embedding-3-small")

    assert fake_client.embeddings.create.call_count == 2
    assert len(result.vectors) == 150
    assert result.total_tokens == 150


def test_empty_input_makes_no_api_call():
    fake_client = Mock()

    with patch("app.embeddings.embedder.get_openai_client", return_value=fake_client):
        result = embed_texts([], "text-embedding-3-small")

    assert result.vectors == []
    assert result.total_tokens == 0
    fake_client.embeddings.create.assert_not_called()


def test_passes_requested_model_to_the_api():
    fake_client = Mock()
    fake_client.embeddings.create.return_value = _FakeEmbeddingResponse([[0.1]], total_tokens=1)

    with patch("app.embeddings.embedder.get_openai_client", return_value=fake_client):
        embed_texts(["a"], "some-other-model")

    _, kwargs = fake_client.embeddings.create.call_args
    assert kwargs["model"] == "some-other-model"


class TestEmbeddingCaching:
    def test_repeated_identical_text_hits_cache_and_skips_the_api(self, tmp_path):
        settings = _settings(llm_cache_enabled=True, llm_cache_db_path=tmp_path / "cache.db")
        fake_client = Mock()
        fake_client.embeddings.create.return_value = _FakeEmbeddingResponse([[0.1, 0.2]], total_tokens=5)

        with patch("app.embeddings.embedder.get_openai_client", return_value=fake_client):
            first = embed_texts(["same text"], "text-embedding-3-small", settings)
            second = embed_texts(["same text"], "text-embedding-3-small", settings)

        fake_client.embeddings.create.assert_called_once()
        assert first.vectors == second.vectors == [[0.1, 0.2]]
        assert first.total_tokens == 5
        assert second.total_tokens == 0  # nothing was actually billed the second time

    def test_only_the_uncached_texts_in_a_batch_are_re_embedded(self, tmp_path):
        settings = _settings(llm_cache_enabled=True, llm_cache_db_path=tmp_path / "cache.db")
        fake_client = Mock()
        fake_client.embeddings.create.return_value = _FakeEmbeddingResponse([[0.1], [0.2]], total_tokens=10)

        with patch("app.embeddings.embedder.get_openai_client", return_value=fake_client):
            embed_texts(["a", "b"], "text-embedding-3-small", settings)

        fake_client.embeddings.create.reset_mock()
        fake_client.embeddings.create.return_value = _FakeEmbeddingResponse([[0.3]], total_tokens=3)

        with patch("app.embeddings.embedder.get_openai_client", return_value=fake_client):
            # "a" and "b" are cached from the run above; only "c" is new.
            result = embed_texts(["a", "b", "c"], "text-embedding-3-small", settings)

        fake_client.embeddings.create.assert_called_once()
        call_kwargs = fake_client.embeddings.create.call_args.kwargs
        assert call_kwargs["input"] == ["c"]
        assert result.vectors == [[0.1], [0.2], [0.3]]  # order preserved

    def test_caching_disabled_never_hits_the_cache(self, tmp_path):
        settings = _settings(llm_cache_db_path=tmp_path / "cache.db")  # llm_cache_enabled defaults to False
        fake_client = Mock()
        fake_client.embeddings.create.return_value = _FakeEmbeddingResponse([[0.1]], total_tokens=1)

        with patch("app.embeddings.embedder.get_openai_client", return_value=fake_client):
            embed_texts(["same text"], "text-embedding-3-small", settings)
            embed_texts(["same text"], "text-embedding-3-small", settings)

        assert fake_client.embeddings.create.call_count == 2
