from unittest.mock import Mock, patch

from app.schemas import GeneratedAnswer, GenerationConfig, RetrievedPassage
from evaluation.golden_dataset.schema import GoldenQuestion
from evaluation.judge.judge_service import _JudgeResponse, evaluate_answer

PASSAGES = [
    RetrievedPassage(chunk_id="docA::0001", doc_id="docA", chunk_index=1, text="Some fact.", similarity_score=0.8)
]
CONFIG = GenerationConfig(
    llm_model="gpt-5-mini",
    embedding_model="text-embedding-3-small",
    prompt_version="v1",
    chunk_size=800,
    chunk_overlap=100,
    retrieval_top_k=5,
)


class _FakeMessage:
    def __init__(self, parsed):
        self.parsed = parsed


class _FakeChoice:
    def __init__(self, parsed):
        self.message = _FakeMessage(parsed)


class _FakeUsage:
    def __init__(self, prompt_tokens=50, completion_tokens=20):
        self.prompt_tokens = prompt_tokens
        self.completion_tokens = completion_tokens


class _FakeParsedResponse:
    def __init__(self, parsed, prompt_tokens=50, completion_tokens=20):
        self.choices = [_FakeChoice(parsed)]
        self.usage = _FakeUsage(prompt_tokens, completion_tokens)


def _answerable_golden() -> GoldenQuestion:
    return GoldenQuestion(
        question_id="q0001",
        question="What is X?",
        expected_answer="X is Y.",
        supporting_doc_ids=["docA"],
        supporting_evidence=["evidence text"],
        category="factual",
        difficulty="easy",
        is_answerable=True,
    )


def _unanswerable_golden() -> GoldenQuestion:
    return GoldenQuestion(
        question_id="q0002",
        question="What is Z?",
        expected_answer="Cannot be answered from the available evidence.",
        supporting_doc_ids=[],
        supporting_evidence=[],
        category="insufficient_evidence",
        difficulty="easy",
        is_answerable=False,
    )


def _generated_answer(answer: str = "X is Y [docA].") -> GeneratedAnswer:
    return GeneratedAnswer(
        query="What is X?",
        answer=answer,
        citations=["docA"],
        retrieved_passages=PASSAGES,
        config=CONFIG,
        prompt_tokens=10,
        completion_tokens=5,
        total_tokens=15,
    )


def test_evaluate_answer_runs_all_six_metrics_for_an_answerable_question_with_evidence():
    fake_client = Mock()
    fake_client.chat.completions.parse.return_value = _FakeParsedResponse(_JudgeResponse(score=1.0, reasoning="ok"))

    with patch("evaluation.judge.judge_service.get_openai_client", return_value=fake_client):
        result = evaluate_answer(_answerable_golden(), _generated_answer(), "gpt-5-mini")

    scored = {s.metric.value for s in result.metric_scores}
    assert scored == {
        "answer_correctness",
        "faithfulness",
        "answer_relevance",
        "context_precision",
        "context_recall",
        "abstention_quality",
    }
    assert result.failed_metrics == {}


def test_evaluate_answer_skips_context_recall_for_unanswerable_questions():
    fake_client = Mock()
    fake_client.chat.completions.parse.return_value = _FakeParsedResponse(_JudgeResponse(score=1.0, reasoning="ok"))

    with patch("evaluation.judge.judge_service.get_openai_client", return_value=fake_client):
        result = evaluate_answer(
            _unanswerable_golden(), _generated_answer("Cannot be answered from the available evidence."), "gpt-5-mini"
        )

    scored = {s.metric.value for s in result.metric_scores}
    assert "context_recall" not in scored
    assert "abstention_quality" in scored


def test_evaluate_answer_isolates_one_failing_metric_from_the_rest():
    """A single bad judge call (malformed response, API error) must not
    void the whole evaluation -- it should land in failed_metrics while
    every other metric still completes.
    """

    def fake_parse(*, model, messages, response_format):
        system_prompt = messages[0]["content"]
        if "METRIC: Faithfulness" in system_prompt:
            raise RuntimeError("simulated API failure")
        return _FakeParsedResponse(_JudgeResponse(score=0.9, reasoning="fine"))

    fake_client = Mock()
    fake_client.chat.completions.parse.side_effect = fake_parse

    with patch("evaluation.judge.judge_service.get_openai_client", return_value=fake_client):
        result = evaluate_answer(_answerable_golden(), _generated_answer(), "gpt-5-mini")

    assert "faithfulness" in result.failed_metrics
    scored = {s.metric.value for s in result.metric_scores}
    assert "faithfulness" not in scored
    assert "answer_correctness" in scored  # the other 5 metrics still ran


def test_evaluate_answer_accumulates_token_usage_across_metric_calls():
    fake_client = Mock()
    fake_client.chat.completions.parse.return_value = _FakeParsedResponse(
        _JudgeResponse(score=1.0, reasoning="ok"), prompt_tokens=10, completion_tokens=5
    )

    with patch("evaluation.judge.judge_service.get_openai_client", return_value=fake_client):
        result = evaluate_answer(_answerable_golden(), _generated_answer(), "gpt-5-mini")

    # 6 metrics run for this answerable question with evidence; 10/5 tokens each.
    assert result.prompt_tokens == 60
    assert result.completion_tokens == 30


def test_evaluate_answer_records_the_passed_in_generation_latency():
    fake_client = Mock()
    fake_client.chat.completions.parse.return_value = _FakeParsedResponse(_JudgeResponse(score=1.0, reasoning="ok"))

    with patch("evaluation.judge.judge_service.get_openai_client", return_value=fake_client):
        result = evaluate_answer(
            _answerable_golden(), _generated_answer(), "gpt-5-mini", generation_latency_seconds=4.2
        )

    assert result.generation_latency_seconds == 4.2
