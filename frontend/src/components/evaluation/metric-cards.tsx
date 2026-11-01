"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { evaluationMetricResults } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function MetricCards() {
  const overall =
    evaluationMetricResults.reduce((acc, m) => acc + m.score, 0) /
    evaluationMetricResults.length;
  const overallBaseline =
    evaluationMetricResults.reduce((acc, m) => acc + m.baseline, 0) /
    evaluationMetricResults.length;
  const delta = overall - overallBaseline;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-soft"
      >
        <p className="text-[12.5px] font-medium text-primary">Overall Score</p>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-[30px] font-semibold tracking-tight tabular-nums">
            {overall.toFixed(1)}
          </span>
          <span className="text-[14px] font-medium text-muted-foreground">%</span>
        </div>
        <div
          className={cn(
            "mt-2 inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11.5px] font-medium",
            delta >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
          )}
        >
          {delta >= 0 ? (
            <ArrowUpRight className="h-3 w-3" />
          ) : (
            <ArrowDownRight className="h-3 w-3" />
          )}
          {delta >= 0 ? "+" : ""}
          {delta.toFixed(1)}% vs baseline
        </div>
      </motion.div>

      {evaluationMetricResults.map((metric, i) => {
        const metricDelta = metric.score - metric.baseline;
        return (
          <motion.div
            key={metric.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (i + 1) * 0.04 }}
            className="rounded-2xl border border-border bg-card p-5 shadow-soft"
          >
            <p className="text-[12.5px] font-medium text-muted-foreground">{metric.label}</p>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-[22px] font-semibold tracking-tight tabular-nums">
                {metric.score.toFixed(1)}
              </span>
              <span className="text-[13px] font-medium text-muted-foreground">%</span>
            </div>
            <Progress value={metric.score} className="mt-2.5 h-1.5" />
            <div
              className={cn(
                "mt-2 inline-flex items-center gap-0.5 text-[11.5px] font-medium",
                metricDelta >= 0 ? "text-success" : "text-destructive",
              )}
            >
              {metricDelta >= 0 ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {metricDelta >= 0 ? "+" : ""}
              {metricDelta.toFixed(1)} vs {metric.baseline.toFixed(1)}% baseline
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
