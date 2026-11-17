"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EvalRunSummary } from "@/lib/api";
import { ChartTooltip } from "@/components/shared/chart-tooltip";

export function RegressionTrendChart({ runs }: { runs: EvalRunSummary[] }) {
  const data = [...runs]
    .sort((a, b) => a.generated_at - b.generated_at)
    .map((run) => ({ run: run.label.split(" (")[0], score: Math.round(run.overall_score * 1000) / 10 }));

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="regressionFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="run"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            width={42}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            content={<ChartTooltip valueFormatter={(v) => `${v}%`} />}
            cursor={{ stroke: "var(--border)" }}
          />
          <Area type="monotone" dataKey="score" name="Overall score" stroke="var(--chart-1)" strokeWidth={2.25} fill="url(#regressionFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
