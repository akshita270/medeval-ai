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
import type { EvalDetailRow } from "@/lib/mock-data";

export function ResultDrawer({
  row,
  open,
  onOpenChange,
}: {
  row: EvalDetailRow | null;
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
                <SheetTitle className="text-[15px]">{row.id}</SheetTitle>
                <StatusBadge status={row.status} />
              </div>
            </SheetHeader>

            <div className="flex flex-col gap-5 px-4 pb-6">
              <Section label="Question">
                <p className="text-[13.5px] leading-relaxed">{row.question}</p>
              </Section>

              <Section label="Expected answer">
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  {row.expected}
                </p>
              </Section>

              <Section label="Generated answer">
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  {row.generated}
                </p>
              </Section>

              <Section label="Retrieved context">
                <ul className="flex flex-col gap-1.5">
                  {row.context.map((c) => (
                    <li
                      key={c}
                      className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-[12px] text-muted-foreground"
                    >
                      {c}
                    </li>
                  ))}
                </ul>
              </Section>

              <Section label="Judge scores">
                <div className="flex flex-wrap gap-2">
                  {row.judgeScores.map((s) => (
                    <Badge key={s.metric} variant="outline" className="gap-1.5 text-[11.5px]">
                      {s.metric}
                      <span className="font-mono font-semibold">{s.score.toFixed(1)}%</span>
                    </Badge>
                  ))}
                </div>
              </Section>

              <Section label="Judge explanation">
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  {row.judgeExplanation}
                </p>
              </Section>

              {row.failureReason && (
                <Section label="Failure reason">
                  <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-[12.5px] leading-relaxed text-destructive">
                    {row.failureReason}
                  </p>
                </Section>
              )}
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
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}
