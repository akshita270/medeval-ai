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
import type { DailyStat } from "@/lib/api";
import { ChartTooltip } from "@/components/shared/chart-tooltip";

export function ApiSpendChart({ data }: { data: DailyStat[] }) {
  const chartData = data.map((d) => ({ date: d.date, spend: Math.round(d.cost_usd * 10000) / 10000 }));
  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            width={48}
            tickFormatter={(v) => `$${v}`}
          />
          <Tooltip
            content={<ChartTooltip valueFormatter={(v) => `$${typeof v === "number" ? v.toFixed(4) : v}`} />}
            cursor={{ stroke: "var(--border)" }}
          />
          <Line
            type="monotone"
            dataKey="spend"
            name="Spend"
            stroke="var(--chart-3)"
            strokeWidth={2.25}
            dot={{ r: 3 }}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
