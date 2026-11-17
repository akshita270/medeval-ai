"use client";

import { SectionHeader } from "@/components/shared/section-header";
import { ChartCard } from "@/components/shared/chart-card";
import { KpiCard } from "@/components/shared/kpi-card";
import { AsyncBoundary } from "@/components/shared/async-boundary";
import { OverviewActions } from "@/components/dashboard/overview-actions";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { RetrievalBarChart } from "@/components/dashboard/retrieval-bar-chart";
import { OutcomesDonut } from "@/components/dashboard/outcomes-donut";
import { RecentRunsTable } from "@/components/dashboard/recent-runs-table";
import { useEvalRunDetail, useEvalRuns } from "@/lib/use-api-data";
import { buildOverviewKpis } from "@/components/dashboard/kpis";

export default function OverviewPage() {
  const runsState = useEvalRuns();
  const latestRunId = runsState.status === "ready" && runsState.data.length > 0 ? runsState.data[0].run_id : null;
  const latestDetailState = useEvalRunDetail(latestRunId);

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="AI Quality Overview"
        subtitle="Real numbers from the evaluation runs actually saved to disk — not a live/synthetic feed."
        actions={<OverviewActions />}
      />

      <AsyncBoundary state={runsState}>
        {(runs) => (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {buildOverviewKpis(runs, latestDetailState.status === "ready" ? latestDetailState.data : null).map(
                (kpi, i) => (
                  <KpiCard key={kpi.id} kpi={kpi} index={i} />
                ),
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <ChartCard
                title="Answer Quality Across Real Runs"
                subtitle="Correctness, faithfulness & context recall — every run on disk"
                className="lg:col-span-2"
              >
                <PerformanceChart runs={runs} />
              </ChartCard>
              <ChartCard
                title="Latest Run: Pass / Fail"
                subtitle="Per-question outcome in the most recent real run"
              >
                <AsyncBoundary state={latestDetailState}>
                  {(detail) => <OutcomesDonut detail={detail} />}
                </AsyncBoundary>
              </ChartCard>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <ChartCard
                title="Retrieval Configuration Comparison"
                subtitle="Real answer correctness by retrieval strategy"
                className="lg:col-span-1"
              >
                <RetrievalBarChart runs={runs} />
              </ChartCard>
              <ChartCard
                title="Evaluation Runs"
                subtitle={`Every real run on disk (${runs.length})`}
                className="lg:col-span-2"
              >
                <RecentRunsTable runs={runs} />
              </ChartCard>
            </div>
          </>
        )}
      </AsyncBoundary>
    </div>
  );
}
