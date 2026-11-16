from unittest.mock import Mock, patch

from app.config import Settings
from app.guardrails.classifier import (
    ClassifierResponse,
    GuardrailClassification,
    OutputClassification,
    OutputClassifierResponse,
    check_output_safety,
    check_semantic_intent,
)
from app.guardrails.schema import GuardrailAction


def _settings(**overrides) -> Settings:
    defaults = dict(
        openai_api_key="test",
        llm_model="gpt-5-mini",
        embedding_model="text-embedding-3-small",
        judge_model="gpt-5-mini",
        guardrail_model="gpt-5-mini",
        prompt_version="v1",
        chunk_size=800,
        chunk_overlap=100,
        retrieval_top_k=5,
    )
    defaults.update(overrides)
    return Settings(**defaults)


class _FakeMessage:
    def __init__(self, parsed):
        self.parsed = parsed


class _FakeChoice:
    def __init__(self, parsed):
        self.message = _FakeMessage(parsed)


class _FakeParsedResponse:
    def __init__(self, parsed):
        self.choices = [_FakeChoice(parsed)]


def _mock_client(classification: GuardrailClassification, reasoning: str = "test reason"):
    client = Mock()
    client.chat.completions.parse.return_value = _FakeParsedResponse(
        ClassifierResponse(classification=classification, reasoning=reasoning)
    )
    return client


def _mock_output_client(classification: OutputClassification, reasoning: str = "test reason"):
    client = Mock()
    client.chat.completions.parse.return_value = _FakeParsedResponse(
        OutputClassifierResponse(classification=classification, reasoning=reasoning)
    )
    return client


class TestCheckSemanticIntent:
    def test_safe_classification_allows(self):
        with patch(
            "app.guardrails.classifier.get_openai_client",
            return_value=_mock_client(GuardrailClassification.SAFE),
        ):
            result = check_semantic_intent("What is the mechanism of SGLT2 inhibitors?", _settings())
        assert result.action == GuardrailAction.ALLOW

    def test_prompt_injection_classification_maps_to_layer1_check_name(self):
        with patch(
            "app.guardrails.classifier.get_openai_client",
            return_value=_mock_client(GuardrailClassification.PROMPT_INJECTION),
        ):
            result = check_semantic_intent("some paraphrased jailbreak attempt", _settings())
        assert result.action == GuardrailAction.BLOCK
        assert result.check_name == "prompt_injection"

    def test_personalized_advice_classification_maps_to_layer1_check_name(self):
        with patch(
            "app.guardrails.classifier.get_openai_client",
            return_value=_mock_client(GuardrailClassification.PERSONALIZED_MEDICAL_ADVICE),
        ):
            result = check_semantic_intent("indirect personal dosing question", _settings())
        assert result.action == GuardrailAction.BLOCK
        assert result.check_name == "personalized_advice_request"

    def test_harmful_request_classification_has_its_own_check_name(self):
        with patch(
            "app.guardrails.classifier.get_openai_client",
            return_value=_mock_client(GuardrailClassification.HARMFUL_REQUEST),
        ):
            result = check_semantic_intent("some harmful request", _settings())
        assert result.action == GuardrailAction.BLOCK
        assert result.check_name == "harmful_request"

    def test_reasoning_is_included_in_block_reason(self):
        with patch(
            "app.guardrails.classifier.get_openai_client",
            return_value=_mock_client(GuardrailClassification.OFF_TOPIC, reasoning="unrelated to diabetes"),
        ):
            result = check_semantic_intent("what's the weather today?", _settings())
        assert "unrelated to diabetes" in result.reason


class TestCheckOutputSafety:
    def test_safe_classification_allows(self):
        with patch(
            "app.guardrails.classifier.get_openai_client",
            return_value=_mock_output_client(OutputClassification.SAFE),
        ):
            result = check_output_safety(
                "What is the starting dose of metformin?",
                "The recommended starting dose of metformin is 500mg twice daily [docA].",
                _settings(),
            )
        assert result.action == GuardrailAction.ALLOW

    def test_leak_classification_blocks_with_shared_check_name(self):
        # Shares its check_name with the Layer 1 output check so
        # pipeline.py's blocked-message lookup doesn't need a second
        # copy of the wording.
        with patch(
            "app.guardrails.classifier.get_openai_client",
            return_value=_mock_output_client(OutputClassification.PERSONALIZED_ADVICE_LEAK),
        ):
            result = check_output_safety(
                "What is the starting dose of metformin?",
                "a subtly personalized recommendation that regex missed",
                _settings(),
            )
        assert result.action == GuardrailAction.BLOCK
        assert result.check_name == "personalized_advice_leak"


class TestClassifierCaching:
    def test_check_semantic_intent_repeated_call_hits_cache(self, tmp_path):
        settings = _settings(llm_cache_enabled=True, llm_cache_db_path=tmp_path / "cache.db")
        fake_client = _mock_client(GuardrailClassification.SAFE)

        with patch("app.guardrails.classifier.get_openai_client", return_value=fake_client):
            check_semantic_intent("What is the mechanism of SGLT2 inhibitors?", settings)
            check_semantic_intent("What is the mechanism of SGLT2 inhibitors?", settings)

        fake_client.chat.completions.parse.assert_called_once()

    def test_check_output_safety_repeated_call_hits_cache(self, tmp_path):
        settings = _settings(llm_cache_enabled=True, llm_cache_db_path=tmp_path / "cache.db")
        fake_client = _mock_output_client(OutputClassification.SAFE)

        with patch("app.guardrails.classifier.get_openai_client", return_value=fake_client):
            check_output_safety("Q", "An educational answer.", settings)
            check_output_safety("Q", "An educational answer.", settings)

        fake_client.chat.completions.parse.assert_called_once()

    def test_a_different_question_is_not_a_cache_hit(self, tmp_path):
        settings = _settings(llm_cache_enabled=True, llm_cache_db_path=tmp_path / "cache.db")
        fake_client = _mock_client(GuardrailClassification.SAFE)

        with patch("app.guardrails.classifier.get_openai_client", return_value=fake_client):
            check_semantic_intent("Question A", settings)
            check_semantic_intent("Question B", settings)

        assert fake_client.chat.completions.parse.call_count == 2

    def test_caching_disabled_never_hits_the_cache(self, tmp_path):
        settings = _settings(llm_cache_db_path=tmp_path / "cache.db")  # llm_cache_enabled defaults to False
        fake_client = _mock_client(GuardrailClassification.SAFE)

        with patch("app.guardrails.classifier.get_openai_client", return_value=fake_client):
            check_semantic_intent("Same question", settings)
            check_semantic_intent("Same question", settings)

        assert fake_client.chat.completions.parse.call_count == 2
