"""Run the adversarial guardrail test suite against the live pipeline.

This makes real API calls -- a Layer 2 semantic-classifier call for most
cases, plus a real generation call for any case the input guardrails
correctly let through -- so it costs real money and should not be run
casually. At current pricing this is roughly a cent or two for the full
19-case v1 dataset, but confirm before running.

Run from the project root:
    python -m scripts.run_adversarial_tests
"""

from pathlib import Path

from app.config import get_settings
from app.retrieval.bm25_index import build_bm25_index
from app.vectorstore.chroma_store import get_collection
from evaluation.guardrails.runner import run_adversarial_suite
from evaluation.guardrails.schema import load_adversarial_dataset


def main(dataset_version: str = "v1") -> int:
    settings = get_settings()
    dataset_path = Path(f"evaluation/guardrails/{dataset_version}/adversarial_cases.jsonl")
    cases = load_adversarial_dataset(dataset_path)
    print(f"Loaded {len(cases)} adversarial cases from {dataset_path}", flush=True)

    collection = get_collection(settings.chroma_persist_dir, settings.chroma_collection_name)
    bm25_index = build_bm25_index(collection)

    report = run_adversarial_suite(cases, collection, bm25_index, settings, dataset_version)

    out_dir = Path("evaluation/guardrails/runs")
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"adversarial_run_{dataset_version}.json"
    out_path.write_text(report.model_dump_json(indent=2), encoding="utf-8")

    print(flush=True)
    print("=" * 70, flush=True)
    for result in report.results:
        status = "PASS" if result.passed else "FAIL"
        blocked_by = ",".join(result.blocked_by) if result.blocked_by else "-"
        print(
            f"[{status}] {result.case_id} ({result.category}): "
            f"expected_blocked={result.expected_blocked} actual_blocked={result.actual_blocked} "
            f"blocked_by={blocked_by}",
            flush=True,
        )
    print(flush=True)
    print(f"Report saved to {out_path}", flush=True)
    print(f"Passed: {report.total_passed}/{report.total_cases} ({report.pass_rate:.0%})", flush=True)

    return 0 if report.total_failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
