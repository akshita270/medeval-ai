"""The independent LLM-as-a-judge.

Each metric gets its own call with its own minimal prompt (only the
inputs that metric's rubric says it needs -- see the per-metric input
table in the Phase 3 design) and its own rubric text. This file never
imports app.generation or app.retrieval and never reuses a generation
prompt or conversation -- the judge's independence from the chatbot it
is grading is structural, not just a label.
"""

import time
from pathlib import Path

from pydantic import BaseModel, Field

from app.llm_client import get_openai_client
from app.schemas import GeneratedAnswer
from evaluation.golden_dataset.schema import GoldenQuestion
from evaluation.judge.metrics import estimate_cost_usd
from evaluation.judge.schema import EvaluationResult, MetricName, MetricScore

_RUBRICS_DIR = Path(__file__).parent / "rubrics"


class _JudgeResponse(BaseModel):
    """Structured output shape the judge LLM must return for every metric call."""

    score: float = Field(ge=0.0, le=1.0)
    reasoning: str


def _load_rubric(metric: MetricName) -> str:
    return (_RUBRICS_DIR / f"{metric.value}.txt").read_text(encoding="utf-8")


def _call_judge(metric: MetricName, user_content: str, judge_model: str) -> tuple[MetricScore, int, int]:
    """One judge call for one metric. Returns the score plus token usage."""
    client = get_openai_client()
    response = client.chat.completions.parse(
        model=judge_model,
        messages=[
            {"role": "system", "content": _load_rubric(metric)},
            {"role": "user", "content": user_content},
        ],
        response_format=_JudgeResponse,
    )
    parsed = response.choices[0].message.parsed
    assert parsed is not None  # response_format guarantees this on success

    score = MetricScore(metric=metric, score=parsed.score, reasoning=parsed.reasoning, is_llm_judged=True)
    return score, response.usage.prompt_tokens, response.usage.completion_tokens


def judge_answer_correctness(question: str, generated_answer: str, expected_answer: str, judge_model: str):
    content = f"Question: {question}\n\nGenerated answer: {generated_answer}\n\nExpected answer: {expected_answer}"
    return _call_judge(MetricName.ANSWER_CORRECTNESS, content, judge_model)


def judge_faithfulness(generated_answer: str, retrieved_context: str, judge_model: str):
    content = f"Generated answer: {generated_answer}\n\nRetrieved context:\n{retrieved_context}"
    return _call_judge(MetricName.FAITHFULNESS, content, judge_model)


def judge_answer_relevance(question: str, generated_answer: str, judge_model: str):
    content = f"Question: {question}\n\nGenerated answer: {generated_answer}"
    return _call_judge(MetricName.ANSWER_RELEVANCE, content, judge_model)


def judge_context_precision(question: str, retrieved_context: str, judge_model: str):
    content = f"Question: {question}\n\nRetrieved passages, in retrieved order:\n{retrieved_context}"
    return _call_judge(MetricName.CONTEXT_PRECISION, content, judge_model)


def judge_context_recall(supporting_evidence: str, retrieved_context: str, judge_model: str):
    content = f"Golden dataset supporting evidence:\n{supporting_evidence}\n\nRetrieved passages:\n{retrieved_context}"
    return _call_judge(MetricName.CONTEXT_RECALL, content, judge_model)


def judge_abstention_quality(question: str, generated_answer: str, is_answerable: bool, judge_model: str):
    content = (
        f"Question: {question}\n\nGenerated answer: {generated_answer}\n\nGround truth: is_answerable={is_answerable}"
    )
    return _call_judge(MetricName.ABSTENTION_QUALITY, content, judge_model)


def evaluate_answer(
    golden: GoldenQuestion,
    generated: GeneratedAnswer,
    judge_model: str,
    generation_latency_seconds: float = 0.0,
) -> EvaluationResult:
    """Run every applicable metric for one question and assemble the result.

    Each metric call is independently wrapped: one metric raising (a
    malformed response, a transient API error after the SDK's own
    retries are exhausted, etc.) is recorded in `failed_metrics` and the
    remaining metrics still run -- a single bad call should not void an
    otherwise-successful evaluation.

    `generation_latency_seconds` is passed in, not measured here -- it's
    the caller's retrieve+generate wall-clock time (what an end user of
    /ask actually experiences), which is a different thing entirely from
    this function's own judge_latency_seconds below (offline evaluation
    overhead nobody but this test suite ever pays).
    """
    start = time.monotonic()

    context_text = "\n\n".join(f"[{p.doc_id}] {p.text}" for p in generated.retrieved_passages)

    calls: dict[MetricName, callable] = {
        MetricName.ANSWER_CORRECTNESS: lambda: judge_answer_correctness(
            golden.question, generated.answer, golden.expected_answer, judge_model
        ),
        MetricName.FAITHFULNESS: lambda: judge_faithfulness(generated.answer, context_text, judge_model),
        MetricName.ANSWER_RELEVANCE: lambda: judge_answer_relevance(golden.question, generated.answer, judge_model),
        MetricName.CONTEXT_PRECISION: lambda: judge_context_precision(golden.question, context_text, judge_model),
        MetricName.ABSTENTION_QUALITY: lambda: judge_abstention_quality(
            golden.question, generated.answer, golden.is_answerable, judge_model
        ),
    }
    # Context Recall only applies when the golden dataset actually has
    # reference evidence to check against (see the rubric's own note).
    if golden.is_answerable and golden.supporting_evidence:
        evidence_text = "\n".join(golden.supporting_evidence)
        calls[MetricName.CONTEXT_RECALL] = lambda: judge_context_recall(evidence_text, context_text, judge_model)

    metric_scores: list[MetricScore] = []
    failed_metrics: dict[str, str] = {}
    total_prompt_tokens = 0
    total_completion_tokens = 0

    for metric, call in calls.items():
        try:
            score, prompt_tokens, completion_tokens = call()
            metric_scores.append(score)
            total_prompt_tokens += prompt_tokens
            total_completion_tokens += completion_tokens
        except Exception as e:
            failed_metrics[metric.value] = str(e)

    return EvaluationResult(
        question_id=golden.question_id,
        metric_scores=metric_scores,
        failed_metrics=failed_metrics,
        judge_latency_seconds=time.monotonic() - start,
        generation_latency_seconds=generation_latency_seconds,
        prompt_tokens=total_prompt_tokens,
        completion_tokens=total_completion_tokens,
        estimated_cost_usd=estimate_cost_usd(judge_model, total_prompt_tokens, total_completion_tokens),
    )
