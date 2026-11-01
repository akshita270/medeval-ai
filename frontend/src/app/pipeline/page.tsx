import { SectionHeader } from "@/components/shared/section-header";
import { ChartCard } from "@/components/shared/chart-card";
import { PipelineSteps } from "@/components/pipeline/pipeline-steps";
import { QualityGates } from "@/components/pipeline/quality-gates";
import { HistoryTable } from "@/components/pipeline/history-table";

export default function PipelinePage() {
  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="CI/CD Pipeline"
        subtitle="Every merge runs a RAG evaluation quality gate before it can reach production."
      />

      <ChartCard
        title="Latest Pipeline Run"
        subtitle="pl-114 on main · triggered by akshita270 · 2026-10-30 09:01"
      >
        <PipelineSteps />
      </ChartCard>

      <ChartCard title="Quality Gates" subtitle="Thresholds enforced before deployment is allowed">
        <QualityGates />
      </ChartCard>

      <ChartCard title="Pipeline History" subtitle="Recent runs across all branches">
        <HistoryTable />
      </ChartCard>
    </div>
  );
}
