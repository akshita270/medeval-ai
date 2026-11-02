from unittest.mock import Mock, patch

from app.config import Settings
from app.generation.generator import build_messages, generate_answer
from app.schemas import RetrievedPassage

PASSAGES = [
    RetrievedPassage(chunk_id="docA::0001", doc_id="docA", chunk_index=1, text="Some fact.", similarity_score=0.8)
]


class _FakeMessage:
    def __init__(self, content):
        self.content = content


class _FakeChoice:
    def __init__(self, content):
        self.message = _FakeMessage(content)


class _FakeUsage:
    def __init__(self, prompt_tokens, completion_tokens):
        self.prompt_tokens = prompt_tokens
        self.completion_tokens = completion_tokens
        self.total_tokens = prompt_tokens + completion_tokens


class _FakeChatResponse:
    def __init__(self, content, prompt_tokens=100, completion_tokens=50):
        self.choices = [_FakeChoice(content)]
        self.usage = _FakeUsage(prompt_tokens, completion_tokens)


def _settings() -> Settings:
    return Settings(
        openai_api_key="test",
        llm_model="gpt-5-mini",
        embedding_model="text-embedding-3-small",
        judge_model="gpt-5-mini",
        prompt_version="v1",
        chunk_size=800,
        chunk_overlap=100,
        retrieval_top_k=5,
    )


def test_build_messages_frames_context_as_data_not_instructions():
    messages = build_messages("What is X?", PASSAGES, "SYSTEM PROMPT TEXT")

    assert messages[0] == {"role": "system", "content": "SYSTEM PROMPT TEXT"}
    assert "not instructions" in messages[1]["content"].lower()
    assert "[docA]" in messages[1]["content"]
    assert "What is X?" in messages[1]["content"]


def test_generate_answer_only_extracts_citations_that_were_actually_retrieved():
    fake_client = Mock()
    fake_client.chat.completions.create.return_value = _FakeChatResponse(
        "Some fact is true [docA]. Also [docZ] agrees."
    )

    with patch("app.generation.generator.get_openai_client", return_value=fake_client):
        result = generate_answer("What is X?", PASSAGES, _settings())

    # docZ was never retrieved -- a real citation-fabrication case -- and
    # must not be reported as a legitimate citation.
    assert result.citations == ["docA"]


def test_generate_answer_attaches_full_config_snapshot():
    fake_client = Mock()
    fake_client.chat.completions.create.return_value = _FakeChatResponse("An answer [docA].")

    with patch("app.generation.generator.get_openai_client", return_value=fake_client):
        result = generate_answer("Q", PASSAGES, _settings())

    assert result.config.llm_model == "gpt-5-mini"
    assert result.config.chunk_size == 800
    assert result.config.retrieval_top_k == 5


def test_generate_answer_passes_through_token_usage():
    fake_client = Mock()
    fake_client.chat.completions.create.return_value = _FakeChatResponse(
        "answer [docA].", prompt_tokens=123, completion_tokens=45
    )

    with patch("app.generation.generator.get_openai_client", return_value=fake_client):
        result = generate_answer("Q", PASSAGES, _settings())

    assert result.prompt_tokens == 123
    assert result.completion_tokens == 45
    assert result.total_tokens == 168


def test_generate_answer_with_no_citations_in_text_returns_empty_list():
    fake_client = Mock()
    fake_client.chat.completions.create.return_value = _FakeChatResponse("An answer with no bracket citations.")

    with patch("app.generation.generator.get_openai_client", return_value=fake_client):
        result = generate_answer("Q", PASSAGES, _settings())

    assert result.citations == []
