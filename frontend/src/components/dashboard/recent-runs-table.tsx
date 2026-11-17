"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import type { RunStatus } from "@/lib/ui-types";
import type { EvalRunSummary } from "@/lib/api";
import { cn } from "@/lib/utils";

function statusFor(score: number): RunStatus {
  if (score >= 0.85) return "passed";
  if (score >= 0.7) return "warning";
  return "failed";
}

export function RecentRunsTable({ runs }: { runs: EvalRunSummary[] }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Run</TableHead>
            <TableHead>Configuration</TableHead>
            <TableHead>Generated</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Overall score</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.map((run) => {
            const status = statusFor(run.overall_score);
            return (
              <TableRow key={run.run_id} className="group">
                <TableCell className="font-mono text-[12.5px] text-muted-foreground">{run.run_id}</TableCell>
                <TableCell className="text-[13px]">{run.label}</TableCell>
                <TableCell className="text-[12.5px] text-muted-foreground">
                  {new Date(run.generated_at * 1000).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <StatusBadge status={status} />
                </TableCell>
                <TableCell className="text-right">
                  <span
                    className={cn(
                      "font-mono text-[13px] font-medium tabular-nums",
                      status === "failed" && "text-destructive",
                      status === "warning" && "text-warning",
                    )}
                  >
                    {(run.overall_score * 100).toFixed(1)}%
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
