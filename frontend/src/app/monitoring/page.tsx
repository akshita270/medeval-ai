"use client";

import { SectionHeader } from "@/components/shared/section-header";
import { ChartCard } from "@/components/shared/chart-card";
import { KpiCard } from "@/components/shared/kpi-card";
import { AsyncBoundary } from "@/components/shared/async-boundary";
import { RequestVolumeChart } from "@/components/monitoring/request-volume-chart";
import { LatencyDistributionChart } from "@/components/monitoring/latency-distribution-chart";
import { TokenUsageChart } from "@/components/monitoring/token-usage-chart";
import { ApiSpendChart } from "@/components/monitoring/api-spend-chart";
import { GuardrailFrequencyChart } from "@/components/monitoring/guardrail-frequency-chart";
import { ModelQualityChart } from "@/components/monitoring/model-quality-chart";
import { buildMonitoringKpis } from "@/components/monitoring/kpis";
import { useDailyStats, useEvalRuns, useGuardrailEvents, useStatsOverview } from "@/lib/use-api-data";

export default function MonitoringPage() {
  const overviewState = useStatsOverview();
  const dailyState = useDailyStats(14);
  const guardrailState = useGuardrailEvents();
  const runsState = useEvalRuns();

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Monitoring"
        subtitle="Real traffic, latency, and cost logged by this server's own /ask calls -- not a simulated feed."
      />

      <AsyncBoundary state={overviewState}>
        {(overview) => (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {buildMonitoringKpis(overview).map((kpi, i) => (
              <KpiCard key={kpi.id} kpi={kpi} index={i} />
            ))}
          </div>
        )}
      </AsyncBoundary>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Request Volume" subtitle="Real /ask requests, by day (last 14 days)">
          <AsyncBoundary state={dailyState}>{(data) => <RequestVolumeChart data={data} />}</AsyncBoundary>
        </ChartCard>
        <ChartCard title="Average Latency" subtitle="Real daily average, not a bucketed distribution">
          <AsyncBoundary state={dailyState}>{(data) => <LatencyDistributionChart data={data} />}</AsyncBoundary>
        </ChartCard>
        <ChartCard title="Token Usage Trend" subtitle="Real input vs. output tokens, by day">
          <AsyncBoundary state={dailyState}>{(data) => <TokenUsageChart data={data} />}</AsyncBoundary>
        </ChartCard>
        <ChartCard title="API Spending Trend" subtitle="Real estimated daily spend, from actual token usage">
          <AsyncBoundary state={dailyState}>{(data) => <ApiSpendChart data={data} />}</AsyncBoundary>
        </ChartCard>
        <ChartCard title="Guardrail Event Frequency" subtitle="Real blocks by category, since this server started">
          <AsyncBoundary state={guardrailState}>{(data) => <GuardrailFrequencyChart data={data} />}</AsyncBoundary>
        </ChartCard>
        <ChartCard title="Model Quality Trend" subtitle="Correctness & faithfulness across real evaluation runs">
          <AsyncBoundary state={runsState}>{(runs) => <ModelQualityChart runs={runs} />}</AsyncBoundary>
        </ChartCard>
      </div>
    </div>
  );
}
