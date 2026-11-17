"use client";

import { useState } from "react";
import { SectionHeader } from "@/components/shared/section-header";
import { ChartCard } from "@/components/shared/chart-card";
import { AsyncBoundary } from "@/components/shared/async-boundary";
import { RunPicker } from "@/components/evaluation/run-picker";
import { MetricCards } from "@/components/evaluation/metric-cards";
import { RadarComparisonChart } from "@/components/evaluation/radar-comparison-chart";
import { RegressionTrendChart } from "@/components/evaluation/regression-trend-chart";
import { PassFailChart } from "@/components/evaluation/pass-fail-chart";
import { ResultsTable } from "@/components/evaluation/results-table";
import { ResultDrawer } from "@/components/evaluation/result-drawer";
import { useEvalRunDetail, useEvalRuns } from "@/lib/use-api-data";
import type { EvalResult } from "@/lib/api";

export default function EvaluationLabPage() {
  const runsState = useEvalRuns();
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<EvalResult | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // No explicit selection yet -- default to the first non-baseline run
  // once the list loads. Derived at render time (not in an effect) so
  // there's no extra render/flash before a run is picked.
  const defaultRunId =
    runsState.status === "ready" && runsState.data.length > 0
      ? (runsState.data.find((r) => !r.is_baseline) ?? runsState.data[0]).run_id
      : null;
  const effectiveRunId = selectedRunId ?? defaultRunId;
  const detailState = useEvalRunDetail(effectiveRunId);

  function handleSelectRow(row: EvalResult) {
    setSelectedRow(row);
    setDrawerOpen(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Evaluation Lab"
        subtitle="Real evaluation runs saved to disk -- pick one to drill into real per-question judge scores."
      />

      <AsyncBoundary state={runsState}>
        {(runs) => {
          const baseline = runs.find((r) => r.is_baseline) ?? null;
          return (
            <>
              <RunPicker runs={runs} selectedRunId={effectiveRunId} onSelect={setSelectedRunId} />

              <AsyncBoundary state={detailState}>
                {(detail) => (
                  <>
                    <MetricCards detail={detail} baseline={baseline} />

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                      <ChartCard
                        title="Baseline vs. This Run"
                        subtitle="Per-metric comparison against the approved baseline"
                      >
                        <RadarComparisonChart detail={detail} baseline={baseline} />
                      </ChartCard>
                      <ChartCard title="Overall Score Across Runs" subtitle="Every real run, oldest to newest">
                        <RegressionTrendChart runs={runs} />
                      </ChartCard>
                      <ChartCard title="Pass / Fail Distribution" subtitle="Across this run's golden questions">
                        <PassFailChart detail={detail} />
                      </ChartCard>
                    </div>

                    <ChartCard title="Per-Question Results" subtitle="Click a row to inspect real judge scores and reasoning">
                      <ResultsTable results={detail.results} onSelectRow={handleSelectRow} />
                    </ChartCard>
                  </>
                )}
              </AsyncBoundary>
            </>
          );
        }}
      </AsyncBoundary>

      <ResultDrawer row={selectedRow} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </div>
  );
}
