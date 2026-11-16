from app.config import Settings
from app.generation.router import choose_generation_model, is_simple_question
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
        routing_max_question_length=80,
        routing_min_top_similarity_for_simple=0.5,
    )
    defaults.update(overrides)
    return Settings(**defaults)


def _passage(similarity_score: float) -> RetrievedPassage:
    return RetrievedPassage(
        chunk_id="c1", doc_id="doc1", chunk_index=0, text="some text", similarity_score=similarity_score
    )


class TestIsSimpleQuestion:
    def test_short_confident_question_is_simple(self):
        settings = _settings()
        result = is_simple_question("What is metformin?", [_passage(0.8)], settings)
        assert result is True

    def test_long_question_is_not_simple(self):
        settings = _settings(routing_max_question_length=10)
        result = is_simple_question("What is metformin?", [_passage(0.8)], settings)  # 19 chars > 10
        assert result is False

    def test_comparison_phrasing_is_not_simple(self):
        settings = _settings()
        result = is_simple_question("Compare metformin and insulin for T2D.", [_passage(0.8)], settings)
        assert result is False

    def test_why_question_is_not_simple(self):
        settings = _settings()
        result = is_simple_question("Why does metformin reduce HbA1c?", [_passage(0.8)], settings)
        assert result is False

    def test_difference_between_phrasing_is_not_simple(self):
        settings = _settings()
        result = is_simple_question(
            "What is the difference between metformin and sulfonylureas?", [_passage(0.8)], settings
        )
        assert result is False

    def test_weak_retrieval_match_is_not_simple(self):
        settings = _settings()
        result = is_simple_question("What is metformin?", [_passage(0.2)], settings)
        assert result is False

    def test_no_passages_is_not_simple(self):
        settings = _settings()
        result = is_simple_question("What is metformin?", [], settings)
        assert result is False

    def test_uses_the_best_passage_score_not_the_first(self):
        settings = _settings()
        # Order shouldn't matter -- only whether *any* passage is confident.
        result = is_simple_question("What is metformin?", [_passage(0.1), _passage(0.9)], settings)
        assert result is True


class TestChooseGenerationModel:
    def test_routing_disabled_always_returns_llm_model(self):
        settings = _settings(use_model_routing=False)
        model = choose_generation_model("What is metformin?", [_passage(0.9)], settings)
        assert model == "gpt-5-mini"

    def test_simple_question_routes_to_the_simple_model(self):
        settings = _settings()
        model = choose_generation_model("What is metformin?", [_passage(0.9)], settings)
        assert model == "gpt-4o-mini"

    def test_complex_question_stays_on_llm_model(self):
        settings = _settings()
        model = choose_generation_model("Compare metformin and insulin for T2D.", [_passage(0.9)], settings)
        assert model == "gpt-5-mini"
