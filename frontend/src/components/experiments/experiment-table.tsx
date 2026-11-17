"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import type { EvalRunSummary } from "@/lib/api";
import { parseRunConfig, runMetricMean } from "@/lib/eval-helpers";
import { cn } from "@/lib/utils";

export function ExperimentTable({
  runs,
  selected,
  onToggle,
}: {
  runs: EvalRunSummary[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>Run</TableHead>
            <TableHead>Model</TableHead>
            <TableHead>Retrieval</TableHead>
            <TableHead>Reranking</TableHead>
            <TableHead className="text-right">Correctness</TableHead>
            <TableHead className="text-right">Faithfulness</TableHead>
            <TableHead className="text-right">Avg latency</TableHead>
            <TableHead className="text-right">Total cost</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.map((run) => {
            const isSelected = selected.includes(run.run_id);
            const config = parseRunConfig(run);
            const correctness = runMetricMean(run, "answer_correctness");
            const faithfulness = runMetricMean(run, "faithfulness");
            const avgLatency =
              run.total_generation_latency_seconds != null
                ? run.total_generation_latency_seconds / run.total_questions
                : null;
            return (
              <TableRow
                key={run.run_id}
                onClick={() => onToggle(run.run_id)}
                className={cn("cursor-pointer", isSelected && "bg-primary/5")}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox checked={isSelected} onCheckedChange={() => onToggle(run.run_id)} />
                </TableCell>
                <TableCell className="font-mono text-[12.5px] font-medium">{run.label}</TableCell>
                <TableCell className="text-[12.5px] text-muted-foreground">{run.generation_model || "--"}</TableCell>
                <TableCell className="text-[12.5px] text-muted-foreground">{config.retrieval}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10.5px]",
                      config.reranking
                        ? "border-success/20 bg-success/10 text-success"
                        : "border-border bg-muted text-muted-foreground",
                    )}
                  >
                    {config.reranking ? "Enabled" : "Off"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono text-[12.5px] tabular-nums">
                  {correctness != null ? `${(correctness * 100).toFixed(1)}%` : "--"}
                </TableCell>
                <TableCell className="text-right font-mono text-[12.5px] tabular-nums">
                  {faithfulness != null ? `${(faithfulness * 100).toFixed(1)}%` : "--"}
                </TableCell>
                <TableCell className="text-right font-mono text-[12.5px] tabular-nums">
                  {avgLatency != null ? `${avgLatency.toFixed(2)}s` : "--"}
                </TableCell>
                <TableCell className="text-right font-mono text-[12.5px] tabular-nums">
                  ${run.total_cost_usd.toFixed(4)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
