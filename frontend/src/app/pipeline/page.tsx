"use client";

import { SectionHeader } from "@/components/shared/section-header";
import { ChartCard } from "@/components/shared/chart-card";
import { AsyncBoundary } from "@/components/shared/async-boundary";
import { PipelineSteps } from "@/components/pipeline/pipeline-steps";
import { QualityGates } from "@/components/pipeline/quality-gates";
import { HistoryTable } from "@/components/pipeline/history-table";
import { useCiRunJobs, useCiRuns, useEvalRunDetail, useEvalRuns } from "@/lib/use-api-data";
import { buildQualityGates } from "@/lib/eval-helpers";

export default function PipelinePage() {
  const ciRunsState = useCiRuns();
  const latestRunId = ciRunsState.status === "ready" && ciRunsState.data.length > 0 ? ciRunsState.data[0].id : null;
  const jobsState = useCiRunJobs(latestRunId);

  const evalRunsState = useEvalRuns();
  const latestEvalRunId =
    evalRunsState.status === "ready" && evalRunsState.data.length > 0 ? evalRunsState.data[0].run_id : null;
  const latestEvalDetailState = useEvalRunDetail(latestEvalRunId);

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="CI/CD Pipeline"
        subtitle="Real GitHub Actions run history for this repository -- including real failures."
      />

      <ChartCard
        title="Latest Pipeline Run"
        subtitle={
          ciRunsState.status === "ready" && ciRunsState.data.length > 0
            ? `${ciRunsState.data[0].name} -- run #${ciRunsState.data[0].run_number} on ${ciRunsState.data[0].branch}, triggered by ${ciRunsState.data[0].triggered_by}`
            : "Loading the real latest run..."
        }
      >
        <AsyncBoundary state={jobsState}>{(jobs) => <PipelineSteps jobs={jobs} />}</AsyncBoundary>
      </ChartCard>

      <ChartCard
        title="Quality Gates"
        subtitle="Thresholds from app/config.py, checked against the latest real evaluation run"
      >
        <AsyncBoundary state={evalRunsState}>
          {(evalRuns) => (
            <AsyncBoundary state={latestEvalDetailState}>
              {(detail) => (
                <QualityGates gates={buildQualityGates(detail, evalRuns.find((r) => r.is_baseline) ?? null)} />
              )}
            </AsyncBoundary>
          )}
        </AsyncBoundary>
      </ChartCard>

      <ChartCard title="Pipeline History" subtitle="Recent real CI runs on GitHub Actions">
        <AsyncBoundary state={ciRunsState}>{(runs) => <HistoryTable runs={runs} />}</AsyncBoundary>
      </ChartCard>
    </div>
  );
}
