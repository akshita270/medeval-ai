import { SectionHeader } from "@/components/shared/section-header";
import { ChartCard } from "@/components/shared/chart-card";
import { KpiCard } from "@/components/shared/kpi-card";
import { OverviewActions } from "@/components/dashboard/overview-actions";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { RetrievalBarChart } from "@/components/dashboard/retrieval-bar-chart";
import { OutcomesDonut } from "@/components/dashboard/outcomes-donut";
import { RecentRunsTable } from "@/components/dashboard/recent-runs-table";
import { overviewKpis } from "@/lib/mock-data";

export default function OverviewPage() {
  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="AI Quality Overview"
        subtitle="Real-time health of the RAG pipeline across correctness, faithfulness, retrieval quality, and latency."
        actions={<OverviewActions />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {overviewKpis.map((kpi, i) => (
          <KpiCard key={kpi.id} kpi={kpi} index={i} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard
          title="Evaluation Performance Over Time"
          subtitle="Correctness, faithfulness & context recall — last 18 runs"
          className="lg:col-span-2"
        >
          <PerformanceChart />
        </ChartCard>
        <ChartCard title="Evaluation Outcomes" subtitle="Pass vs. fail across all runs">
          <OutcomesDonut />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard
          title="Retrieval Configuration Comparison"
          subtitle="Answer correctness by retrieval strategy"
          className="lg:col-span-1"
        >
          <RetrievalBarChart />
        </ChartCard>
        <ChartCard
          title="Recent Evaluation Runs"
          subtitle="Latest 8 runs across all configurations"
          className="lg:col-span-2"
        >
          <RecentRunsTable />
        </ChartCard>
      </div>
    </div>
  );
}
