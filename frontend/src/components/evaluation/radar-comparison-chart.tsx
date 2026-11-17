"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { EvalRunDetail, EvalRunSummary } from "@/lib/api";
import { ChartTooltip } from "@/components/shared/chart-tooltip";

export function RadarComparisonChart({
  detail,
  baseline,
}: {
  detail: EvalRunDetail;
  baseline: EvalRunSummary | null;
}) {
  const data = detail.metric_summaries.map((metric) => {
    const baselineMetric = baseline?.metric_summaries.find((m) => m.metric === metric.metric);
    return {
      metric: metric.metric.replace(/_/g, " "),
      candidate: Math.round(metric.mean_score * 1000) / 10,
      baseline: baselineMetric ? Math.round(baselineMetric.mean_score * 1000) / 10 : null,
    };
  });

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
          <PolarRadiusAxis
            domain={[0, 100]}
            tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
            axisLine={false}
          />
          <Tooltip content={<ChartTooltip valueFormatter={(v) => `${v}%`} />} />
          {baseline && (
            <Radar
              name="Baseline"
              dataKey="baseline"
              stroke="var(--chart-5)"
              fill="var(--chart-5)"
              fillOpacity={0.12}
              strokeWidth={2}
            />
          )}
          <Radar
            name="This run"
            dataKey="candidate"
            stroke="var(--chart-1)"
            fill="var(--chart-1)"
            fillOpacity={0.2}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
      <div className="mt-1 flex items-center justify-center gap-4">
        {baseline && (
          <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--chart-5)" }} />
            Baseline
          </div>
        )}
        <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--chart-1)" }} />
          This run
        </div>
      </div>
    </div>
  );
}
