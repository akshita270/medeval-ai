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
import { experiments } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function ExperimentTable({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>Experiment</TableHead>
            <TableHead>Model</TableHead>
            <TableHead>Chunk size</TableHead>
            <TableHead>Retrieval</TableHead>
            <TableHead>Reranking</TableHead>
            <TableHead className="text-right">Correctness</TableHead>
            <TableHead className="text-right">Faithfulness</TableHead>
            <TableHead className="text-right">Latency</TableHead>
            <TableHead className="text-right">Cost / 1k</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {experiments.map((exp) => {
            const isSelected = selected.includes(exp.id);
            return (
              <TableRow
                key={exp.id}
                onClick={() => onToggle(exp.id)}
                className={cn("cursor-pointer", isSelected && "bg-primary/5")}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggle(exp.id)}
                  />
                </TableCell>
                <TableCell className="font-mono text-[12.5px] font-medium">
                  {exp.name}
                </TableCell>
                <TableCell className="text-[12.5px] text-muted-foreground">
                  {exp.model}
                </TableCell>
                <TableCell className="font-mono text-[12.5px] text-muted-foreground">
                  {exp.chunkSize}
                </TableCell>
                <TableCell className="text-[12.5px] text-muted-foreground">
                  {exp.retrieval}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10.5px]",
                      exp.reranking
                        ? "border-success/20 bg-success/10 text-success"
                        : "border-border bg-muted text-muted-foreground",
                    )}
                  >
                    {exp.reranking ? "Enabled" : "Off"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono text-[12.5px] tabular-nums">
                  {exp.correctness.toFixed(1)}%
                </TableCell>
                <TableCell className="text-right font-mono text-[12.5px] tabular-nums">
                  {exp.faithfulness.toFixed(1)}%
                </TableCell>
                <TableCell className="text-right font-mono text-[12.5px] tabular-nums">
                  {(exp.latencyMs / 1000).toFixed(2)}s
                </TableCell>
                <TableCell className="text-right font-mono text-[12.5px] tabular-nums">
                  ${exp.costPer1k.toFixed(2)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
