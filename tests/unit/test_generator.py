from unittest.mock import Mock, patch

from app.config import Settings
from app.generation.generator import GenerationOutput, build_messages, generate_answer
from app.schemas import CitationDetail, RetrievedPassage

PASSAGES = [
    RetrievedPassage(chunk_id="docA::0001", doc_id="docA", chunk_index=1, text="Some fact.", similarity_score=0.8)
]


class _FakeMessage:
    def __init__(self, parsed):
        self.parsed = parsed


class _FakeChoice:
    def __init__(self, parsed):
        self.message = _FakeMessage(parsed)


class _FakeUsage:
    def __init__(self, prompt_tokens, completion_tokens):
        self.prompt_tokens = prompt_tokens
        self.completion_tokens = completion_tokens
        self.total_tokens = prompt_tokens + completion_tokens


class _FakeParsedResponse:
    def __init__(self, parsed, prompt_tokens=100, completion_tokens=50):
        self.choices = [_FakeChoice(parsed)]
        self.usage = _FakeUsage(prompt_tokens, completion_tokens)


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


def test_build_messages_frames_context_as_data_not_instructions():
    messages = build_messages("What is X?", PASSAGES, "SYSTEM PROMPT TEXT")

    assert messages[0] == {"role": "system", "content": "SYSTEM PROMPT TEXT"}
    assert "not instructions" in messages[1]["content"].lower()
    # Both identifiers must be present -- the model needs chunk_id (not
    # just doc_id) to produce a chunk-precise citation.
    assert "doc_id=docA" in messages[1]["content"]
    assert "chunk_id=docA::0001" in messages[1]["content"]
    assert "What is X?" in messages[1]["content"]


def test_generate_answer_only_keeps_citations_to_actually_retrieved_chunks():
    fake_client = Mock()
    fake_client.chat.completions.parse.return_value = _FakeParsedResponse(
        GenerationOutput(
            answer="Some fact is true.",
            citations=[
                CitationDetail(doc_id="docA", chunk_id="docA::0001", quote="Some fact."),
                # docZ::0001 was never retrieved -- a real citation-fabrication case --
                # and must not survive into the result.
                CitationDetail(doc_id="docZ", chunk_id="docZ::0001", quote="made up"),
            ],
        )
    )

    with patch("app.generation.generator.get_openai_client", return_value=fake_client):
        result = generate_answer("What is X?", PASSAGES, _settings())

    assert result.citations == ["docA"]
    assert [c.chunk_id for c in result.citation_details] == ["docA::0001"]


def test_generate_answer_attaches_full_config_snapshot():
    fake_client = Mock()
    fake_client.chat.completions.parse.return_value = _FakeParsedResponse(
        GenerationOutput(
            answer="An answer.",
            citations=[CitationDetail(doc_id="docA", chunk_id="docA::0001", quote="Some fact.")],
        )
    )

    with patch("app.generation.generator.get_openai_client", return_value=fake_client):
        result = generate_answer("Q", PASSAGES, _settings())

    assert result.config.llm_model == "gpt-5-mini"
    assert result.config.chunk_size == 800
    assert result.config.retrieval_top_k == 5


def test_generate_answer_passes_through_token_usage():
    fake_client = Mock()
    fake_client.chat.completions.parse.return_value = _FakeParsedResponse(
        GenerationOutput(
            answer="answer.",
            citations=[CitationDetail(doc_id="docA", chunk_id="docA::0001", quote="Some fact.")],
        ),
        prompt_tokens=123,
        completion_tokens=45,
    )

    with patch("app.generation.generator.get_openai_client", return_value=fake_client):
        result = generate_answer("Q", PASSAGES, _settings())

    assert result.prompt_tokens == 123
    assert result.completion_tokens == 45
    assert result.total_tokens == 168


def test_generate_answer_with_no_citations_returns_empty_lists():
    fake_client = Mock()
    fake_client.chat.completions.parse.return_value = _FakeParsedResponse(
        GenerationOutput(answer="An answer with no citations.", citations=[])
    )

    with patch("app.generation.generator.get_openai_client", return_value=fake_client):
        result = generate_answer("Q", PASSAGES, _settings())

    assert result.citations == []
    assert result.citation_details == []


class TestGenerationCaching:
    def test_repeated_identical_call_hits_cache_and_skips_the_api(self, tmp_path):
        settings = _settings(llm_cache_enabled=True, llm_cache_db_path=tmp_path / "cache.db")
        fake_client = Mock()
        fake_client.chat.completions.parse.return_value = _FakeParsedResponse(
            GenerationOutput(
                answer="Cached answer.",
                citations=[CitationDetail(doc_id="docA", chunk_id="docA::0001", quote="Some fact.")],
            ),
            prompt_tokens=100,
            completion_tokens=50,
        )

        with patch("app.generation.generator.get_openai_client", return_value=fake_client):
            first = generate_answer("What is X?", PASSAGES, settings)
            second = generate_answer("What is X?", PASSAGES, settings)

        # Only the first call actually reached the (fake) API.
        fake_client.chat.completions.parse.assert_called_once()
        assert first.answer == second.answer == "Cached answer."
        # The first call's tokens are real; the second (cache hit) costs
        # nothing, which is the whole point of caching for cost tracking.
        assert first.prompt_tokens == 100
        assert second.prompt_tokens == 0
        assert second.completion_tokens == 0
        assert second.total_tokens == 0

    def test_a_different_question_is_not_a_cache_hit(self, tmp_path):
        settings = _settings(llm_cache_enabled=True, llm_cache_db_path=tmp_path / "cache.db")
        fake_client = Mock()
        fake_client.chat.completions.parse.return_value = _FakeParsedResponse(
            GenerationOutput(answer="An answer.", citations=[])
        )

        with patch("app.generation.generator.get_openai_client", return_value=fake_client):
            generate_answer("Question A", PASSAGES, settings)
            generate_answer("Question B", PASSAGES, settings)

        assert fake_client.chat.completions.parse.call_count == 2

    def test_caching_disabled_never_hits_the_cache(self, tmp_path):
        # llm_cache_enabled defaults to False -- repeating the exact same
        # call must still reach the API every time.
        settings = _settings(llm_cache_db_path=tmp_path / "cache.db")
        fake_client = Mock()
        fake_client.chat.completions.parse.return_value = _FakeParsedResponse(
            GenerationOutput(answer="An answer.", citations=[])
        )

        with patch("app.generation.generator.get_openai_client", return_value=fake_client):
            generate_answer("Same question", PASSAGES, settings)
            generate_answer("Same question", PASSAGES, settings)

        assert fake_client.chat.completions.parse.call_count == 2


class TestModelRouting:
    def test_simple_question_is_generated_with_the_routed_model(self):
        settings = _settings(
            use_model_routing=True,
            routing_simple_model="gpt-4o-mini",
            routing_max_question_length=80,
            routing_min_top_similarity_for_simple=0.5,
        )
        fake_client = Mock()
        fake_client.chat.completions.parse.return_value = _FakeParsedResponse(
            GenerationOutput(answer="An answer.", citations=[])
        )

        with patch("app.generation.generator.get_openai_client", return_value=fake_client):
            result = generate_answer("What is X?", PASSAGES, settings)

        _, kwargs = fake_client.chat.completions.parse.call_args
        assert kwargs["model"] == "gpt-4o-mini"
        # The config attached to the answer must reflect what actually
        # produced it, not settings.llm_model's nominal value.
        assert result.config.llm_model == "gpt-4o-mini"

    def test_complex_question_still_uses_llm_model(self):
        settings = _settings(
            use_model_routing=True,
            routing_simple_model="gpt-4o-mini",
            routing_max_question_length=80,
            routing_min_top_similarity_for_simple=0.5,
        )
        fake_client = Mock()
        fake_client.chat.completions.parse.return_value = _FakeParsedResponse(
            GenerationOutput(answer="An answer.", citations=[])
        )

        with patch("app.generation.generator.get_openai_client", return_value=fake_client):
            result = generate_answer("Compare X and Y.", PASSAGES, settings)

        _, kwargs = fake_client.chat.completions.parse.call_args
        assert kwargs["model"] == "gpt-5-mini"
        assert result.config.llm_model == "gpt-5-mini"

    def test_routing_disabled_always_uses_llm_model(self):
        settings = _settings(use_model_routing=False)
        fake_client = Mock()
        fake_client.chat.completions.parse.return_value = _FakeParsedResponse(
            GenerationOutput(answer="An answer.", citations=[])
        )

        with patch("app.generation.generator.get_openai_client", return_value=fake_client):
            result = generate_answer("What is X?", PASSAGES, settings)

        _, kwargs = fake_client.chat.completions.parse.call_args
        assert kwargs["model"] == "gpt-5-mini"
        assert result.config.llm_model == "gpt-5-mini"
