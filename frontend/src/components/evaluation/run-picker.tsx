"use client";

import { FolderOpen } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { EvalRunSummary } from "@/lib/api";

export function RunPicker({
  runs,
  selectedRunId,
  onSelect,
}: {
  runs: EvalRunSummary[];
  selectedRunId: string | null;
  onSelect: (runId: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center gap-2">
        <FolderOpen className="h-4 w-4 text-primary" />
        <h3 className="text-[14.5px] font-semibold tracking-tight">Load a Real Evaluation Run</h3>
      </div>
      <p className="mt-0.5 text-[12px] text-muted-foreground">
        These are the actual runs saved to disk by <code className="font-mono">scripts/run_evaluation.py</code> --
        not a live trigger. Running a new evaluation costs real OpenAI credits, so this page replays what&rsquo;s
        already been run rather than letting anyone on the internet spend your budget with one click.
      </p>

      <div className="mt-4 max-w-sm">
        <Label className="text-[12px] text-muted-foreground">Run</Label>
        <Select value={selectedRunId ?? undefined} onValueChange={(v) => v && onSelect(v)}>
          <SelectTrigger className="mt-1.5 w-full">
            <SelectValue>
              {(value: string) => runs.find((r) => r.run_id === value)?.label ?? value}
            </SelectValue>
          </SelectTrigger>
          {/* Popup width otherwise matches the (narrow, max-w-sm) trigger
              exactly and clips long labels with overflow-x-hidden -- since
              retrieval_config made labels longer (e.g. "Dense retrieval +
              model routing, top_k=5 (10-question sample)"), it needs its
              own wider, viewport-capped width instead of inheriting the
              trigger's. Widened further isn't a full fix on its own --
              any future label a few characters longer would clip again --
              so each item also wraps onto two lines below instead of
              depending on width alone to avoid clipping. */}
          <SelectContent className="w-[min(34rem,92vw)]">
            {runs.map((r) => (
              <SelectItem key={r.run_id} value={r.run_id} className="py-2">
                <span className="flex flex-col gap-0.5 whitespace-normal break-words text-left">
                  <span>{r.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {(r.overall_score * 100).toFixed(1)}% overall
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
