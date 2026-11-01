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
import { tokenUsageTrend } from "@/lib/mock-data";
import { ChartTooltip } from "@/components/shared/chart-tooltip";

export function TokenUsageChart() {
  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={tokenUsageTrend} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="inputFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="outputFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
            </linearGradient>
          </defs>
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
            width={44}
            tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--border)" }} />
          <Area
            type="monotone"
            dataKey="input"
            name="Input tokens"
            stackId="1"
            stroke="var(--chart-1)"
            strokeWidth={2}
            fill="url(#inputFill)"
          />
          <Area
            type="monotone"
            dataKey="output"
            name="Output tokens"
            stackId="1"
            stroke="var(--chart-2)"
            strokeWidth={2}
            fill="url(#outputFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="mt-1 flex items-center justify-center gap-4">
        <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--chart-1)" }} />
          Input tokens
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--chart-2)" }} />
          Output tokens
        </div>
      </div>
    </div>
  );
}
