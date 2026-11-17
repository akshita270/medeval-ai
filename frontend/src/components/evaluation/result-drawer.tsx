"use client";

import type { ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import type { EvalResult } from "@/lib/api";
import { resultStatus } from "@/lib/eval-helpers";

export function ResultDrawer({
  row,
  open,
  onOpenChange,
}: {
  row: EvalResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto scrollbar-thin sm:max-w-xl">
        {row && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2">
                <SheetTitle className="text-[15px]">{row.question_id}</SheetTitle>
                <StatusBadge status={resultStatus(row)} />
              </div>
            </SheetHeader>

            <div className="flex flex-col gap-5 px-4 pb-6">
              <Section label="Question">
                <p className="text-[13.5px] leading-relaxed">{row.question}</p>
              </Section>

              <Section label="Expected answer">
                <p className="text-[13px] leading-relaxed text-muted-foreground">{row.expected_answer}</p>
              </Section>

              <Section label="Judge scores & reasoning">
                <div className="flex flex-col gap-2.5">
                  {row.metric_scores.map((s) => (
                    <div key={s.metric} className="rounded-lg border border-border bg-muted/40 px-3 py-2.5">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-[11.5px] capitalize">
                          {s.metric.replace(/_/g, " ")}
                        </Badge>
                        <span className="font-mono text-[13px] font-semibold">{(s.score * 100).toFixed(1)}%</span>
                      </div>
                      <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">{s.reasoning}</p>
                    </div>
                  ))}
                  {Object.entries(row.failed_metrics).map(([metric, error]) => (
                    <div
                      key={metric}
                      className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5"
                    >
                      <Badge variant="outline" className="border-destructive/20 text-[11.5px] capitalize text-destructive">
                        {metric.replace(/_/g, " ")} -- failed
                      </Badge>
                      <p className="mt-1.5 text-[12px] leading-relaxed text-destructive">{error}</p>
                    </div>
                  ))}
                </div>
              </Section>

              <Section label="Cost & latency">
                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <Stat label="Generation model" value={row.generation_model || "--"} />
                  <Stat
                    label="Generation latency"
                    value={row.generation_latency_seconds != null ? `${row.generation_latency_seconds.toFixed(2)}s` : "--"}
                  />
                  <Stat label="Judge latency" value={`${row.judge_latency_seconds.toFixed(2)}s`} />
                  <Stat label="Judge cost" value={`$${row.estimated_cost_usd.toFixed(5)}`} />
                  <Stat label="Prompt tokens" value={row.prompt_tokens.toLocaleString()} />
                  <Stat label="Completion tokens" value={row.completion_tokens.toLocaleString()} />
                </div>
              </Section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border px-3 py-2">
      <p className="text-[10.5px] text-muted-foreground">{label}</p>
      <p className="font-mono text-[12.5px] font-medium">{value}</p>
    </div>
  );
}
