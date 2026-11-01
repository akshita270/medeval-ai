"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { modelQualityTrend } from "@/lib/mock-data";
import { ChartTooltip } from "@/components/shared/chart-tooltip";

export function ModelQualityChart() {
  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={modelQualityTrend} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
            interval={3}
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
          <Line
            type="monotone"
            dataKey="correctness"
            name="Correctness"
            stroke="var(--chart-1)"
            strokeWidth={2.25}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="faithfulness"
            name="Faithfulness"
            stroke="var(--chart-2)"
            strokeWidth={2.25}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-1 flex items-center justify-center gap-4">
        <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--chart-1)" }} />
          Correctness
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--chart-2)" }} />
          Faithfulness
        </div>
      </div>
    </div>
  );
}
