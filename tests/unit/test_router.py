from unittest.mock import Mock, patch

from app.config import Settings
from app.generation.router import (
    ComplexityClassification,
    ComplexityClassifierResponse,
    choose_generation_model,
    classify_question_complexity,
)
from app.schemas import RetrievedPassage


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
        use_model_routing=True,
        routing_simple_model="gpt-4o-mini",
        routing_min_top_similarity_for_simple=0.5,
    )
    defaults.update(overrides)
    return Settings(**defaults)


def _passage(similarity_score: float) -> RetrievedPassage:
    return RetrievedPassage(
        chunk_id="c1", doc_id="doc1", chunk_index=0, text="some text", similarity_score=similarity_score
    )


class _FakeMessage:
    def __init__(self, parsed):
        self.parsed = parsed


class _FakeChoice:
    def __init__(self, parsed):
        self.message = _FakeMessage(parsed)


class _FakeParsedResponse:
    def __init__(self, parsed):
        self.choices = [_FakeChoice(parsed)]


def _mock_client(classification: ComplexityClassification, reasoning: str = "test reason"):
    client = Mock()
    client.chat.completions.parse.return_value = _FakeParsedResponse(
        ComplexityClassifierResponse(classification=classification, reasoning=reasoning)
    )
    return client


class TestClassifyQuestionComplexity:
    def test_simple_classification(self):
        with patch(
            "app.generation.router.get_openai_client",
            return_value=_mock_client(ComplexityClassification.SIMPLE),
        ):
            result = classify_question_complexity("What is the recommended dose of metformin?", _settings())
        assert result == ComplexityClassification.SIMPLE

    def test_complex_classification(self):
        with patch(
            "app.generation.router.get_openai_client",
            return_value=_mock_client(ComplexityClassification.COMPLEX),
        ):
            result = classify_question_complexity("Compare metformin and insulin for T2D.", _settings())
        assert result == ComplexityClassification.COMPLEX

    def test_repeated_identical_question_hits_cache(self, tmp_path):
        settings = _settings(llm_cache_enabled=True, llm_cache_db_path=tmp_path / "cache.db")
        fake_client = _mock_client(ComplexityClassification.SIMPLE)

        with patch("app.generation.router.get_openai_client", return_value=fake_client):
            classify_question_complexity("What is X?", settings)
            classify_question_complexity("What is X?", settings)

        fake_client.chat.completions.parse.assert_called_once()


class TestChooseGenerationModel:
    def test_routing_disabled_never_calls_the_classifier(self):
        settings = _settings(use_model_routing=False)
        with patch("app.generation.router.get_openai_client") as mock_get_client:
            model = choose_generation_model("What is X?", [_passage(0.9)], settings)
        assert model == "gpt-5-mini"
        mock_get_client.assert_not_called()

    def test_no_passages_never_calls_the_classifier(self):
        settings = _settings()
        with patch("app.generation.router.get_openai_client") as mock_get_client:
            model = choose_generation_model("What is X?", [], settings)
        assert model == "gpt-5-mini"
        mock_get_client.assert_not_called()

    def test_weak_retrieval_never_calls_the_classifier(self):
        # Free gate checked before spending the classifier call.
        settings = _settings()
        with patch("app.generation.router.get_openai_client") as mock_get_client:
            model = choose_generation_model("What is X?", [_passage(0.1)], settings)
        assert model == "gpt-5-mini"
        mock_get_client.assert_not_called()

    def test_simple_classification_routes_to_the_simple_model(self):
        settings = _settings()
        with patch(
            "app.generation.router.get_openai_client",
            return_value=_mock_client(ComplexityClassification.SIMPLE),
        ):
            model = choose_generation_model(
                "Approximately what proportion of patients needing renal replacement therapy have "
                "diabetic retinopathy?",
                [_passage(0.9)],
                settings,
            )
        assert model == "gpt-4o-mini"

    def test_complex_classification_stays_on_llm_model(self):
        settings = _settings()
        with patch(
            "app.generation.router.get_openai_client",
            return_value=_mock_client(ComplexityClassification.COMPLEX),
        ):
            model = choose_generation_model("Compare metformin and insulin for T2D.", [_passage(0.9)], settings)
        assert model == "gpt-5-mini"

    def test_classifier_failure_falls_back_to_llm_model(self):
        # A failed cost optimization must never fail (or silently
        # downgrade) the actual request.
        settings = _settings()
        broken_client = Mock()
        broken_client.chat.completions.parse.side_effect = RuntimeError("network error")

        with patch("app.generation.router.get_openai_client", return_value=broken_client):
            model = choose_generation_model("What is X?", [_passage(0.9)], settings)
        assert model == "gpt-5-mini"
