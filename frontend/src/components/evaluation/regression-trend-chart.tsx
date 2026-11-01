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
import { regressionTrend } from "@/lib/mock-data";
import { ChartTooltip } from "@/components/shared/chart-tooltip";

export function RegressionTrendChart() {
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={regressionTrend} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
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
            domain={[85, 100]}
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
          <Area
            type="monotone"
            dataKey="score"
            name="Score"
            stroke="var(--chart-1)"
            strokeWidth={2.25}
            fill="url(#regressionFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
