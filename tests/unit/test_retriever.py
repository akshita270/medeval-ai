from unittest.mock import Mock, patch

from app.retrieval.retriever import dense_search


def test_converts_chroma_results_into_retrieved_passages():
    fake_collection = Mock()
    fake_collection.query.return_value = {
        "ids": [["docA::0001", "docB::0002"]],
        "documents": [["text one", "text two"]],
        "metadatas": [[{"doc_id": "docA", "chunk_index": 1}, {"doc_id": "docB", "chunk_index": 2}]],
        "distances": [[0.1, 0.4]],
    }
    fake_embed_result = Mock(vectors=[[0.1, 0.2, 0.3]])

    with patch("app.retrieval.retriever.embed_texts", return_value=fake_embed_result):
        passages = dense_search("query", fake_collection, "text-embedding-3-small", n_results=2)

    assert len(passages) == 2
    assert passages[0].doc_id == "docA"
    assert passages[0].chunk_index == 1
    assert passages[0].similarity_score == 0.9  # 1 - distance(0.1)
    assert passages[1].similarity_score == 0.6  # 1 - distance(0.4)


def test_embeds_the_query_with_the_requested_model():
    fake_collection = Mock()
    fake_collection.query.return_value = {"ids": [[]], "documents": [[]], "metadatas": [[]], "distances": [[]]}
    fake_embed_result = Mock(vectors=[[0.1]])

    with patch("app.retrieval.retriever.embed_texts", return_value=fake_embed_result) as mock_embed:
        dense_search("my query", fake_collection, "text-embedding-3-small", n_results=5)

    mock_embed.assert_called_once_with(["my query"], "text-embedding-3-small")


def test_passes_n_results_through_to_chroma_query():
    fake_collection = Mock()
    fake_collection.query.return_value = {"ids": [[]], "documents": [[]], "metadatas": [[]], "distances": [[]]}
    fake_embed_result = Mock(vectors=[[0.1]])

    with patch("app.retrieval.retriever.embed_texts", return_value=fake_embed_result):
        dense_search("q", fake_collection, "text-embedding-3-small", n_results=7)

    _, kwargs = fake_collection.query.call_args
    assert kwargs["n_results"] == 7
