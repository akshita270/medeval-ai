"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DailyStat } from "@/lib/api";
import { ChartTooltip } from "@/components/shared/chart-tooltip";

// The backend logs one average latency per day, not every individual
// request's latency, so a real histogram bucketed by latency isn't
// available -- this shows the real daily average instead of fabricating
// a distribution shape.
export function LatencyDistributionChart({ data }: { data: DailyStat[] }) {
  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
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
            width={40}
            tickFormatter={(v) => `${v}ms`}
          />
          <Tooltip content={<ChartTooltip valueFormatter={(v) => `${v}ms`} />} cursor={{ fill: "var(--accent)" }} />
          <Bar dataKey="avg_latency_ms" name="Avg latency" fill="var(--chart-2)" radius={[6, 6, 0, 0]} barSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
