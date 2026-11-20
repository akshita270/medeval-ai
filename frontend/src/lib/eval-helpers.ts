import type { EvalResult, EvalRunDetail, EvalRunSummary } from "./api";

// Matches MIN_ANSWER_CORRECTNESS in .env.example -- a question "passes"
// here if its own average judge score across metrics clears this bar.
// This is a simple per-question summary for the UI, not a replay of
// scripts/ci_quality_gate.py's actual per-metric gate logic.
export const PASS_THRESHOLD = 0.75;

export function resultAverageScore(result: EvalResult): number {
  if (result.metric_scores.length === 0) return 0;
  return result.metric_scores.reduce((sum, s) => sum + s.score, 0) / result.metric_scores.length;
}

export function resultStatus(result: EvalResult): "passed" | "failed" {
  return resultAverageScore(result) >= PASS_THRESHOLD ? "passed" : "failed";
}

export function metricScore(result: EvalResult, metric: string): number | null {
  const found = result.metric_scores.find((s) => s.metric === metric);
  return found ? found.score : null;
}

export function runMetricMean(run: EvalRunSummary, metric: string): number | null {
  const found = run.metric_summaries.find((s) => s.metric === metric);
  return found ? found.mean_score : null;
}

// Prefers the real retrieval_config the backend now persists per run
// (evaluation/judge/schema.py's RetrievalConfig) over guessing from the
// filename -- two runs can share the same "dense"/"hybrid" filename
// pattern while differing in retrieval_top_k (exactly what happened
// with the baseline vs. a top_k=8 ablation, both named "dense"), so the
// filename alone can't be trusted to tell them apart. Falls back to the
// filename-guess only for a historical run saved before retrieval_config
// existed (run.retrieval_config is null).
export function parseRunConfig(run: EvalRunSummary): {
  retrieval: string;
  reranking: boolean;
  routed: boolean;
  topK: number | null;
} {
  const cfg = run.retrieval_config;
  if (cfg) {
    const retrieval = cfg.use_hybrid_retrieval ? "Hybrid (dense+BM25)" : "Dense only";
    return { retrieval, reranking: !!cfg.use_reranking, routed: !!cfg.use_model_routing, topK: cfg.retrieval_top_k };
  }
  const id = run.run_id;
  const retrieval = id.includes("hybrid") ? "Hybrid (dense+BM25)" : id.includes("dense") ? "Dense only" : "Unknown";
  return { retrieval, reranking: id.includes("rerank"), routed: id.includes("routed"), topK: null };
}

// Mirrors the default threshold values in .env.example (MIN_ANSWER_CORRECTNESS
// etc.) -- the API doesn't expose Settings, so these are kept in sync by hand
// with app/config.py's defaults rather than fetched.
export const QUALITY_THRESHOLDS = {
  minAnswerCorrectness: 0.75,
  minFaithfulness: 0.85,
  minAbstentionQuality: 0.75,
  maxRegressionPct: 0.2,
  maxGenerationLatencySeconds: 25.0,
};

function detailMetricMean(detail: EvalRunDetail, metric: string): number | null {
  const found = detail.metric_summaries.find((s) => s.metric === metric);
  return found ? found.mean_score : null;
}

export interface QualityGate {
  id: string;
  label: string;
  passed: boolean;
  actual: string;
  threshold: string;
}

export function buildQualityGates(detail: EvalRunDetail, baseline: EvalRunSummary | null): QualityGate[] {
  const gates: QualityGate[] = [];

  const addMinGate = (id: string, label: string, metric: string, threshold: number) => {
    const actual = detailMetricMean(detail, metric);
    if (actual == null) return;
    gates.push({
      id,
      label,
      passed: actual >= threshold,
      actual: `${(actual * 100).toFixed(1)}%`,
      threshold: `>= ${(threshold * 100).toFixed(0)}%`,
    });
  };

  addMinGate("correctness", "Answer Correctness", "answer_correctness", QUALITY_THRESHOLDS.minAnswerCorrectness);
  addMinGate("faithfulness", "Faithfulness", "faithfulness", QUALITY_THRESHOLDS.minFaithfulness);
  addMinGate("abstention", "Abstention Quality", "abstention_quality", QUALITY_THRESHOLDS.minAbstentionQuality);

  if (baseline) {
    let worstRegressionPct = 0;
    for (const summary of detail.metric_summaries) {
      const baselineMean = baseline.metric_summaries.find((m) => m.metric === summary.metric)?.mean_score;
      if (baselineMean == null || baselineMean === 0) continue;
      const regression = (baselineMean - summary.mean_score) / baselineMean;
      worstRegressionPct = Math.max(worstRegressionPct, regression);
    }
    gates.push({
      id: "regression",
      label: "Max Regression",
      passed: worstRegressionPct <= QUALITY_THRESHOLDS.maxRegressionPct,
      actual: `${(worstRegressionPct * 100).toFixed(1)}%`,
      threshold: `<= ${(QUALITY_THRESHOLDS.maxRegressionPct * 100).toFixed(0)}%`,
    });
  }

  if (detail.total_generation_latency_seconds != null && detail.total_questions > 0) {
    const avgLatency = detail.total_generation_latency_seconds / detail.total_questions;
    gates.push({
      id: "latency",
      label: "Generation Latency",
      passed: avgLatency <= QUALITY_THRESHOLDS.maxGenerationLatencySeconds,
      actual: `${avgLatency.toFixed(1)}s`,
      threshold: `<= ${QUALITY_THRESHOLDS.maxGenerationLatencySeconds.toFixed(0)}s`,
    });
  }

  return gates;
}

export function countPassFail(detail: EvalRunDetail): { passed: number; failed: number } {
  let passed = 0;
  let failed = 0;
  for (const r of detail.results) {
    if (resultStatus(r) === "passed") passed += 1;
    else failed += 1;
  }
  return { passed, failed };
}
