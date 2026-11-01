"""Run the full evaluation suite: generate an answer for every golden-dataset
question, judge it on all applicable metrics, and save an aggregate report.

Run from the project root:
    python -m scripts.run_evaluation
"""

import time
from pathlib import Path

from app.config import get_settings
from app.generation.generator import generate_answer
from app.retrieval.bm25_index import build_bm25_index
from app.retrieval.pipeline import retrieve_passages
from app.vectorstore.chroma_store import get_collection
from evaluation.golden_dataset.schema import load_golden_dataset
from evaluation.judge.judge_service import evaluate_answer
from evaluation.judge.report import build_report
from evaluation.judge.schema import EvaluationResult
from evaluation.tracking.mlflow_logger import log_evaluation_run


def _strategy_label(settings) -> str:
    """Names the retrieval strategy for the output filename, so an
    ablation run (dense vs hybrid vs hybrid+rerank) never overwrites a
    previous run's results -- each config's report is comparable later.
    """
    base = "hybrid" if settings.use_hybrid_retrieval else "dense"
    return f"{base}_rerank" if settings.use_reranking else base


def run_evaluation(dataset_version: str = "v1", question_ids: list[str] | None = None) -> None:
    settings = get_settings()
    dataset_path = Path(f"evaluation/golden_dataset/{dataset_version}/questions.jsonl")
    questions = load_golden_dataset(dataset_path)

    # A fixed subset (same question_ids reused across every strategy being
    # compared) keeps an ablation run cheap while still being a fair,
    # apples-to-apples comparison -- never a different random sample per run.
    if question_ids is not None:
        wanted = set(question_ids)
        questions = [q for q in questions if q.question_id in wanted]
        missing = wanted - {q.question_id for q in questions}
        if missing:
            raise ValueError(f"question_ids not found in dataset: {missing}")

    print(f"Loaded {len(questions)} questions from {dataset_path}", flush=True)

    collection = get_collection(settings.chroma_persist_dir, settings.chroma_collection_name)
    bm25_index = build_bm25_index(collection)
    strategy = _strategy_label(settings)
    print(f"Retrieval strategy: {strategy}", flush=True)

    results: list[EvaluationResult] = []
    for i, golden in enumerate(questions, start=1):
        print(f"[{i}/{len(questions)}] {golden.question_id}: {golden.question[:70]}", flush=True)
        try:
            generation_start = time.monotonic()
            passages = retrieve_passages(golden.question, collection, settings, bm25_index)
            generated = generate_answer(golden.question, passages, settings)
            generation_latency = time.monotonic() - generation_start

            result = evaluate_answer(golden, generated, settings.judge_model, generation_latency)
            results.append(result)
            print(
                f"    -> {len(result.metric_scores)} metrics scored, "
                f"{len(result.failed_metrics)} failed, ${result.estimated_cost_usd:.5f}",
                flush=True,
            )
        except Exception as e:
            # A failure in retrieve/generate itself (not a single judge metric --
            # those are already isolated inside evaluate_answer) means this
            # question produced nothing to score. Record it as fully failed
            # rather than silently skipping it, so it's still visible in the report.
            print(f"    -> PIPELINE FAILURE for this question: {e}", flush=True)
            results.append(
                EvaluationResult(
                    question_id=golden.question_id,
                    metric_scores=[],
                    failed_metrics={"pipeline": str(e)},
                    judge_latency_seconds=0.0,
                    generation_latency_seconds=0.0,
                    prompt_tokens=0,
                    completion_tokens=0,
                    estimated_cost_usd=0.0,
                )
            )

    report = build_report(dataset_version, results)

    out_dir = Path("evaluation/regression/runs")
    out_dir.mkdir(parents=True, exist_ok=True)
    suffix = f"_sample{len(questions)}" if question_ids is not None else ""
    out_path = out_dir / f"run_{dataset_version}_{strategy}{suffix}.json"
    out_path.write_text(report.model_dump_json(indent=2), encoding="utf-8")

    run_id = log_evaluation_run(report, settings, strategy)

    print(flush=True)
    print("=" * 70, flush=True)
    print(f"Report saved to {out_path}", flush=True)
    print(f"Logged to MLflow run {run_id} (experiment: medeval-ai-rag-evaluation)", flush=True)
    print(f"Total questions: {report.total_questions}", flush=True)
    print(f"Total failed metric calls: {report.total_failed_metric_calls}", flush=True)
    print(f"Total cost: ${report.total_cost_usd:.4f}", flush=True)
    print(f"Total judge latency: {report.total_judge_latency_seconds:.1f}s", flush=True)
    if report.total_generation_latency_seconds is not None and report.total_questions:
        mean_gen_latency = report.total_generation_latency_seconds / report.total_questions
        print(f"Mean generation latency (retrieve+generate, per question): {mean_gen_latency:.2f}s", flush=True)
    else:
        print("Mean generation latency: not measured for this run", flush=True)
    print(flush=True)
    for summary in sorted(report.metric_summaries, key=lambda s: s.metric.value):
        print(f"  {summary.metric.value:22s} mean={summary.mean_score:.3f}  (n={summary.count})", flush=True)


if __name__ == "__main__":
    run_evaluation()
