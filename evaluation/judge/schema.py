from enum import Enum

from pydantic import BaseModel, Field


class MetricName(str, Enum):
    ANSWER_CORRECTNESS = "answer_correctness"
    FAITHFULNESS = "faithfulness"
    ANSWER_RELEVANCE = "answer_relevance"
    CONTEXT_PRECISION = "context_precision"
    CONTEXT_RECALL = "context_recall"
    ABSTENTION_QUALITY = "abstention_quality"


class MetricScore(BaseModel):
    """One metric's result for one evaluation case.

    `is_llm_judged` is explicit, not inferred, so a report can always
    separate "the model's subjective opinion" from "a fact we computed" --
    the brief is specific that these must not be conflated. `reasoning`
    is required (not optional) because a score with no justification is
    not auditable, and this whole phase exists to make judge behavior
    inspectable rather than a black box.
    """

    metric: MetricName
    score: float = Field(ge=0.0, le=1.0)
    reasoning: str
    is_llm_judged: bool


class EvaluationResult(BaseModel):
    """The full evaluation outcome for one golden-dataset question.

    Up to 6 separate judge calls happen per question (one per metric, by
    design -- see the per-metric input table), so "one error field" can't
    represent reality: metric A can fail while B through F succeed.
    `metric_scores` holds only the ones that succeeded; `failed_metrics`
    maps metric name -> error message for the rest, so a partial
    evaluation run is visible as partial, not silently incomplete.
    """

    question_id: str
    metric_scores: list[MetricScore]
    failed_metrics: dict[str, str] = Field(default_factory=dict)
    judge_latency_seconds: float
    generation_latency_seconds: float | None = None  # None = not measured (e.g. historical run predating this field)
    prompt_tokens: int
    completion_tokens: int
    estimated_cost_usd: float


class MetricSummary(BaseModel):
    """One metric's aggregate across an evaluation run.

    `count` matters as much as `mean_score`: context_recall is skipped
    for unanswerable questions (see judge_service.evaluate_answer), so
    different metrics can legitimately be averaged over different
    numbers of questions. A mean without its count is misleading --
    e.g. "context_recall: 0.9" means something different over 3
    questions than over 25.
    """

    metric: MetricName
    mean_score: float
    count: int


class EvaluationReport(BaseModel):
    """A full evaluation run: per-metric summaries, cost/latency totals,
    and every individual EvaluationResult preserved underneath.

    The brief requires reports to identify *which questions* failed --
    an average alone can't do that, so `results` is never dropped in
    favor of just the summary; aggregation only ever adds to the detail,
    never replaces it.
    """

    dataset_version: str
    total_questions: int
    metric_summaries: list[MetricSummary]
    total_failed_metric_calls: int
    total_cost_usd: float
    total_judge_latency_seconds: float
    total_generation_latency_seconds: float | None = None  # None if any underlying result lacks a real measurement
    total_prompt_tokens: int
    total_completion_tokens: int
    results: list[EvaluationResult]
