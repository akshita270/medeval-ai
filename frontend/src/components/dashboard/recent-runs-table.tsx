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
import { recentRuns } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function RecentRunsTable() {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Run ID</TableHead>
            <TableHead>Configuration</TableHead>
            <TableHead>Timestamp</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Score</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recentRuns.map((run) => (
            <TableRow key={run.id} className="group">
              <TableCell className="font-mono text-[12.5px] text-muted-foreground">
                {run.id}
              </TableCell>
              <TableCell className="text-[13px]">{run.config}</TableCell>
              <TableCell className="text-[12.5px] text-muted-foreground">
                {run.timestamp}
              </TableCell>
              <TableCell>
                <StatusBadge status={run.status} />
              </TableCell>
              <TableCell className="text-right">
                <span
                  className={cn(
                    "font-mono text-[13px] font-medium tabular-nums",
                    run.status === "failed" && "text-destructive",
                    run.status === "warning" && "text-warning",
                    run.status === "running" && "text-muted-foreground",
                  )}
                >
                  {run.status === "running" ? "—" : `${run.score.toFixed(1)}%`}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
