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
import { apiSpendTrend } from "@/lib/mock-data";
import { ChartTooltip } from "@/components/shared/chart-tooltip";

export function ApiSpendChart() {
  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={apiSpendTrend} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
            interval={2}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            width={40}
            tickFormatter={(v) => `$${v}`}
          />
          <Tooltip
            content={<ChartTooltip valueFormatter={(v) => `$${v}`} />}
            cursor={{ stroke: "var(--border)" }}
          />
          <Line
            type="monotone"
            dataKey="spend"
            name="Spend"
            stroke="var(--chart-3)"
            strokeWidth={2.25}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
