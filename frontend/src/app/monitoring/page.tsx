import { SectionHeader } from "@/components/shared/section-header";
import { ChartCard } from "@/components/shared/chart-card";
import { KpiCard } from "@/components/shared/kpi-card";
import { monitoringKpis } from "@/lib/mock-data";
import { RequestVolumeChart } from "@/components/monitoring/request-volume-chart";
import { LatencyDistributionChart } from "@/components/monitoring/latency-distribution-chart";
import { TokenUsageChart } from "@/components/monitoring/token-usage-chart";
import { ApiSpendChart } from "@/components/monitoring/api-spend-chart";
import { GuardrailFrequencyChart } from "@/components/monitoring/guardrail-frequency-chart";
import { ModelQualityChart } from "@/components/monitoring/model-quality-chart";

export default function MonitoringPage() {
  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Monitoring"
        subtitle="Live observability into request volume, latency, token spend, and guardrail activity."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {monitoringKpis.map((kpi, i) => (
          <KpiCard key={kpi.id} kpi={kpi} index={i} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Request Volume" subtitle="API requests over the last 14 days">
          <RequestVolumeChart />
        </ChartCard>
        <ChartCard title="Latency Distribution" subtitle="Request count by latency bucket">
          <LatencyDistributionChart />
        </ChartCard>
        <ChartCard title="Token Usage Trend" subtitle="Input vs. output tokens, last 14 days">
          <TokenUsageChart />
        </ChartCard>
        <ChartCard title="API Spending Trend" subtitle="Estimated daily spend, last 14 days">
          <ApiSpendChart />
        </ChartCard>
        <ChartCard title="Guardrail Event Frequency" subtitle="Violations by category, last 7 days">
          <GuardrailFrequencyChart />
        </ChartCard>
        <ChartCard title="Model Quality Trend" subtitle="Correctness & faithfulness over time">
          <ModelQualityChart />
        </ChartCard>
      </div>
    </div>
  );
}
