from pydantic import BaseModel

from evaluation.judge.schema import MetricName


class RegressionFinding(BaseModel):
    """One specific question/metric that regressed from baseline to candidate.

    This is what "identify which questions failed, which metrics
    deteriorated, and the evidence" (the brief's own wording) actually
    requires -- an aggregate mean comparison alone can't name a question.
    """

    question_id: str
    metric: MetricName
    baseline_score: float
    candidate_score: float
    relative_drop_pct: float


class GateCheck(BaseModel):
    name: str
    passed: bool
    detail: str


class QualityGateResult(BaseModel):
    """The full regression-testing verdict for a candidate configuration.

    `passed` is true only if every individual check passed -- a single
    critical violation fails the whole gate, per the brief ("A candidate
    should fail if it violates critical quality requirements"). This
    does not and cannot certify clinical safety; it only says the
    candidate did not measurably regress against the approved baseline
    on this golden dataset, under these configured thresholds.
    """

    passed: bool
    checks: list[GateCheck]
    regressions: list[RegressionFinding]
