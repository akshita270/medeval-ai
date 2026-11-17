import type { Kpi } from "@/lib/ui-types";
import type { EvalRunDetail, EvalRunSummary } from "@/lib/api";
import { PASS_THRESHOLD, countPassFail, runMetricMean } from "@/lib/eval-helpers";

export function buildOverviewKpis(runs: EvalRunSummary[], latestDetail: EvalRunDetail | null): Kpi[] {
  if (runs.length === 0) return [];
  const latest = runs[0];
  const kpis: Kpi[] = [];

  const addPercentMetric = (label: string, id: string, icon: string, metric: string) => {
    const value = runMetricMean(latest, metric);
    if (value == null) return;
    kpis.push({
      id,
      label,
      value: (value * 100).toFixed(1),
      rawValue: value * 100,
      unit: "%",
      trend: "flat",
      trendValue: `${latest.total_questions}q`,
      comparison: `from "${latest.label}"`,
      icon,
      goodDirection: "up",
    });
  };

  addPercentMetric("Answer Correctness", "correctness", "Target", "answer_correctness");
  addPercentMetric("Faithfulness", "faithfulness", "ShieldCheck", "faithfulness");
  addPercentMetric("Context Recall", "context-recall", "Layers", "context_recall");

  if (latestDetail && latestDetail.results.length > 0) {
    const { passed } = countPassFail(latestDetail);
    const passRate = (passed / latestDetail.results.length) * 100;
    kpis.push({
      id: "pass-rate",
      label: "Question Pass Rate",
      value: passRate.toFixed(0),
      rawValue: passRate,
      unit: "%",
      trend: "flat",
      trendValue: `≥${(PASS_THRESHOLD * 100).toFixed(0)}% avg score`,
      comparison: "in the latest run",
      icon: "CheckCircle2",
      goodDirection: "up",
    });
  }

  if (latestDetail?.total_generation_latency_seconds != null && latestDetail.total_questions > 0) {
    const avgLatency = latestDetail.total_generation_latency_seconds / latestDetail.total_questions;
    kpis.push({
      id: "latency",
      label: "Avg Generation Latency",
      value: avgLatency.toFixed(1),
      rawValue: avgLatency,
      unit: "s",
      trend: "flat",
      trendValue: "real measurement",
      comparison: "in the latest run",
      icon: "Gauge",
      goodDirection: "down",
    });
  }

  kpis.push({
    id: "runs",
    label: "Real Evaluation Runs",
    value: String(runs.length),
    rawValue: runs.length,
    trend: "flat",
    trendValue: "on disk",
    comparison: "no synthetic runs included",
    icon: "FlaskConical",
    goodDirection: "up",
  });

  return kpis;
}
