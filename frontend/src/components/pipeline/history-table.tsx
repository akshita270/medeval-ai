import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { pipelineHistory } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { GitBranch } from "lucide-react";

export function HistoryTable() {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Commit</TableHead>
            <TableHead>Branch</TableHead>
            <TableHead>Triggered by</TableHead>
            <TableHead className="text-right">Eval score</TableHead>
            <TableHead>Pipeline</TableHead>
            <TableHead>Deployment</TableHead>
            <TableHead>Timestamp</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pipelineHistory.map((run) => (
            <TableRow
              key={run.id}
              className={cn(run.status === "failed" && "bg-destructive/[0.03]")}
            >
              <TableCell className="font-mono text-[12.5px] text-muted-foreground">
                {run.commit}
              </TableCell>
              <TableCell>
                <span className="flex items-center gap-1.5 text-[12.5px]">
                  <GitBranch className="h-3 w-3 text-muted-foreground" />
                  {run.branch}
                </span>
              </TableCell>
              <TableCell className="text-[12.5px] text-muted-foreground">
                {run.triggeredBy}
              </TableCell>
              <TableCell
                className={cn(
                  "text-right font-mono text-[12.5px] tabular-nums",
                  run.evalScore < 80 && "text-destructive font-semibold",
                )}
              >
                {run.evalScore.toFixed(1)}%
              </TableCell>
              <TableCell>
                <StatusBadge status={run.status === "success" ? "passed" : run.status === "failed" ? "failed" : "running"} />
              </TableCell>
              <TableCell>
                <StatusBadge status={run.deployment === "deployed" ? "deployed" : run.deployment === "rolled-back" ? "rolled-back" : "blocked"} />
              </TableCell>
              <TableCell className="text-[12px] text-muted-foreground">{run.timestamp}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
