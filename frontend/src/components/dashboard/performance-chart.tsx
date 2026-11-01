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
import { performanceOverTime } from "@/lib/mock-data";
import { ChartTooltip } from "@/components/shared/chart-tooltip";

const series = [
  { key: "correctness", name: "Correctness", color: "var(--chart-1)" },
  { key: "faithfulness", name: "Faithfulness", color: "var(--chart-2)" },
  { key: "contextRecall", name: "Context Recall", color: "var(--chart-3)" },
];

export function PerformanceChart() {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={performanceOverTime} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
            interval={2}
          />
          <YAxis
            domain={[80, 100]}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            width={42}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            content={<ChartTooltip valueFormatter={(v) => `${v}%`} />}
            cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
          />
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              strokeWidth={2.25}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-4">
        {series.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.name}
          </div>
        ))}
      </div>
    </div>
  );
}
