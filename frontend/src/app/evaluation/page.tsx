"use client";

import { useState } from "react";
import { toast } from "sonner";
import { SectionHeader } from "@/components/shared/section-header";
import { ChartCard } from "@/components/shared/chart-card";
import { ConfigPanel } from "@/components/evaluation/config-panel";
import { MetricCards } from "@/components/evaluation/metric-cards";
import { RadarComparisonChart } from "@/components/evaluation/radar-comparison-chart";
import { RegressionTrendChart } from "@/components/evaluation/regression-trend-chart";
import { PassFailChart } from "@/components/evaluation/pass-fail-chart";
import { ResultsTable } from "@/components/evaluation/results-table";
import { ResultDrawer } from "@/components/evaluation/result-drawer";
import type { EvalDetailRow } from "@/lib/mock-data";

export default function EvaluationLabPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [hasResults, setHasResults] = useState(true);
  const [selectedRow, setSelectedRow] = useState<EvalDetailRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  function handleRun() {
    setIsRunning(true);
    setHasResults(false);
    toast.info("Evaluation started", {
      description: "Running against the selected golden dataset...",
    });
    setTimeout(() => {
      setIsRunning(false);
      setHasResults(true);
      toast.success("Evaluation complete", {
        description: "94.2% correctness · 97.1% faithfulness",
      });
    }, 2200);
  }

  function handleSelectRow(row: EvalDetailRow) {
    setSelectedRow(row);
    setDrawerOpen(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Evaluation Lab"
        subtitle="Configure a golden-dataset run, then drill into per-example judge scores and failure reasons."
      />

      <ConfigPanel onRun={handleRun} isRunning={isRunning} />

      {!hasResults && !isRunning && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-16 text-center">
          <p className="text-[13.5px] font-medium text-muted-foreground">
            No results yet
          </p>
          <p className="max-w-sm text-[12.5px] text-muted-foreground">
            Configure your run above and click &ldquo;Run Evaluation&rdquo; to see metric
            breakdowns, comparisons, and per-example results.
          </p>
        </div>
      )}

      {isRunning && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card py-16 text-center shadow-soft">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-[13px] text-muted-foreground">
            Running evaluation against golden dataset...
          </p>
        </div>
      )}

      {hasResults && !isRunning && (
        <>
          <MetricCards />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ChartCard
              title="Baseline vs. Candidate"
              subtitle="Per-metric comparison across configurations"
            >
              <RadarComparisonChart />
            </ChartCard>
            <ChartCard title="Regression Trend" subtitle="Overall score across recent runs">
              <RegressionTrendChart />
            </ChartCard>
            <ChartCard title="Pass / Fail Distribution" subtitle="Across all golden examples">
              <PassFailChart />
            </ChartCard>
          </div>

          <ChartCard
            title="Detailed Results"
            subtitle="Click a row to inspect judge scores and failure reasons"
          >
            <ResultsTable onSelectRow={handleSelectRow} />
          </ChartCard>
        </>
      )}

      <ResultDrawer row={selectedRow} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </div>
  );
}
