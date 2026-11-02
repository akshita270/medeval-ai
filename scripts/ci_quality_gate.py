"""CI entry point: run a (sampled or full) evaluation, compare against the
approved baseline, apply quality gates, and exit non-zero on failure.

This is what the GitHub Actions PR and release pipelines actually call --
a failing exit code is what makes the corresponding GitHub check fail.

Run from the project root:
    python -m scripts.ci_quality_gate            # small sample (PR pipeline)
    python -m scripts.ci_quality_gate --full      # full dataset (release pipeline)
"""

import argparse
import os
import sys
from pathlib import Path

from app.config import get_settings
from evaluation.judge.schema import EvaluationReport
from evaluation.regression.quality_gates import evaluate_quality_gates
from scripts.run_evaluation import run_evaluation

# A fixed, category-balanced sample (not random) so every PR run compares
# the same questions -- a passing or failing gate must be reproducible,
# not dependent on which questions happened to get picked this time.
_PR_SAMPLE_QUESTION_IDS = [
    "q0001", "q0003", "q0009", "q0011", "q0014",
    "q0017", "q0019", "q0022", "q0024", "q0028",
]  # fmt: skip

_BASELINE_PATH = Path("evaluation/regression/baseline/baseline_v1.json")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--full", action="store_true", help="Run the full golden dataset, not the small CI sample.")
    args = parser.parse_args()

    settings = get_settings()
    if not settings.openai_api_key:
        # "Run ... when credentials are available" -- absence is not a
        # failure, it's an expected state for untrusted/fork PRs that
        # never receive repository secrets (see the workflow's security
        # notes). Skip cleanly rather than erroring.
        print("OPENAI_API_KEY is not set -- skipping evaluation (this is expected for untrusted PRs).")
        return 0

    question_ids = None if args.full else _PR_SAMPLE_QUESTION_IDS
    run_evaluation(dataset_version="v1", question_ids=question_ids)

    strategy = "hybrid" if settings.use_hybrid_retrieval else "dense"
    strategy += "_rerank" if settings.use_reranking else ""
    suffix = "" if args.full else f"_sample{len(question_ids)}"
    candidate_path = Path(f"evaluation/regression/runs/run_v1_{strategy}{suffix}.json")

    baseline = EvaluationReport.model_validate_json(_BASELINE_PATH.read_text())
    candidate = EvaluationReport.model_validate_json(candidate_path.read_text())

    gate_result = evaluate_quality_gates(baseline, candidate, settings)

    summary_lines = ["## Evaluation quality gate", ""]
    summary_lines.append("PASSED" if gate_result.passed else "FAILED")
    summary_lines.append("")
    for check in gate_result.checks:
        mark = "PASS" if check.passed else "FAIL"
        summary_lines.append(f"- [{mark}] **{check.name}**: {check.detail}")
    if gate_result.regressions:
        summary_lines.append("")
        summary_lines.append("### Regressions found")
        for r in gate_result.regressions:
            summary_lines.append(
                f"- `{r.question_id}` / `{r.metric.value}`: "
                f"{r.baseline_score:.2f} -> {r.candidate_score:.2f} ({r.relative_drop_pct:.1%} drop)"
            )

    summary_text = "\n".join(summary_lines)
    print(summary_text)

    # GITHUB_STEP_SUMMARY, when set, renders this markdown directly on the
    # workflow run's summary page -- "produce an evaluation report" without
    # needing a separate artifact upload step for the common case.
    step_summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if step_summary_path:
        with open(step_summary_path, "a", encoding="utf-8") as f:
            f.write(summary_text + "\n")

    if not gate_result.passed:
        print("\nQuality gate FAILED -- see above for which checks and questions failed.")
        return 1

    print("\nQuality gate PASSED.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
