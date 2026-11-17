import { GitBranch, ExternalLink } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge, type StatusKind } from "@/components/shared/status-badge";
import type { CiRun } from "@/lib/api";
import { cn } from "@/lib/utils";

function statusFor(run: CiRun): StatusKind {
  if (run.status !== "completed") return "running";
  if (run.conclusion === "success") return "passed";
  return "failed";
}

export function HistoryTable({ runs }: { runs: CiRun[] }) {
  if (runs.length === 0) {
    return <p className="text-[12.5px] text-muted-foreground">No CI runs found for this repository yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Commit</TableHead>
            <TableHead>Branch</TableHead>
            <TableHead>Workflow</TableHead>
            <TableHead>Triggered by</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Timestamp</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.map((run) => {
            const status = statusFor(run);
            return (
              <TableRow key={run.id} className={cn(status === "failed" && "bg-destructive/[0.03]")}>
                <TableCell className="max-w-[220px] truncate font-mono text-[12.5px] text-muted-foreground" title={run.commit_message}>
                  {run.commit_sha} -- {run.commit_message || "(no message)"}
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-1.5 text-[12.5px]">
                    <GitBranch className="h-3 w-3 text-muted-foreground" />
                    {run.branch}
                  </span>
                </TableCell>
                <TableCell className="text-[12.5px] text-muted-foreground">{run.name}</TableCell>
                <TableCell className="text-[12.5px] text-muted-foreground">{run.triggered_by || "--"}</TableCell>
                <TableCell>
                  <StatusBadge status={status} />
                </TableCell>
                <TableCell className="text-[12px] text-muted-foreground">
                  {new Date(run.created_at).toLocaleString()}
                </TableCell>
                <TableCell>
                  <a
                    href={run.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11.5px] text-primary hover:underline"
                  >
                    View <ExternalLink className="h-3 w-3" />
                  </a>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
