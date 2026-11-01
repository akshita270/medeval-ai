from unittest.mock import Mock, patch

from app.embeddings.embedder import embed_texts


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
