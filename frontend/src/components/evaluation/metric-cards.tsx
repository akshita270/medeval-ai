"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { EvalRunDetail, EvalRunSummary } from "@/lib/api";
import { cn } from "@/lib/utils";

function meanOf(summaries: { mean_score: number }[]): number {
  return summaries.length > 0 ? summaries.reduce((acc, m) => acc + m.mean_score, 0) / summaries.length : 0;
}

export function MetricCards({ detail, baseline }: { detail: EvalRunDetail; baseline: EvalRunSummary | null }) {
  const overall = meanOf(detail.metric_summaries) * 100;
  const baselineOverall = baseline ? meanOf(baseline.metric_summaries) * 100 : null;
  const overallDelta = baselineOverall != null ? overall - baselineOverall : null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-soft"
      >
        <p className="text-[12.5px] font-medium text-primary">Overall Score</p>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-[30px] font-semibold tracking-tight tabular-nums">{overall.toFixed(1)}</span>
          <span className="text-[14px] font-medium text-muted-foreground">%</span>
        </div>
        <DeltaBadge delta={overallDelta} suffix=" vs baseline" />
      </motion.div>

      {detail.metric_summaries.map((metric, i) => {
        const baselineMetric = baseline?.metric_summaries.find((m) => m.metric === metric.metric);
        const delta = baselineMetric ? (metric.mean_score - baselineMetric.mean_score) * 100 : null;
        const score = metric.mean_score * 100;
        return (
          <motion.div
            key={metric.metric}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (i + 1) * 0.04 }}
            className="rounded-2xl border border-border bg-card p-5 shadow-soft"
          >
            <p className="truncate text-[12.5px] font-medium text-muted-foreground">
              {metric.metric.replace(/_/g, " ")}
            </p>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-[22px] font-semibold tracking-tight tabular-nums">{score.toFixed(1)}</span>
              <span className="text-[13px] font-medium text-muted-foreground">%</span>
            </div>
            <Progress value={score} className="mt-2.5 h-1.5" />
            <p className="mt-1.5 text-[10.5px] text-muted-foreground">{metric.count} questions scored</p>
            <DeltaBadge delta={delta} suffix=" vs baseline" small />
          </motion.div>
        );
      })}
    </div>
  );
}

function DeltaBadge({ delta, suffix, small }: { delta: number | null; suffix: string; small?: boolean }) {
  if (delta == null) {
    return (
      <div className="mt-2 inline-flex items-center gap-0.5 text-[11.5px] font-medium text-muted-foreground">
        <Minus className="h-3 w-3" />
        no baseline to compare
      </div>
    );
  }
  return (
    <div
      className={cn(
        "mt-2 inline-flex items-center gap-0.5 font-medium",
        small ? "text-[11.5px]" : "rounded-md px-1.5 py-0.5 text-[11.5px]",
        delta >= 0 ? "text-success" : "text-destructive",
        !small && (delta >= 0 ? "bg-success/10" : "bg-destructive/10"),
      )}
    >
      {delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {delta >= 0 ? "+" : ""}
      {delta.toFixed(1)}
      {suffix}
    </div>
  );
}
