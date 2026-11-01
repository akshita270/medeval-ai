"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { retrievalConfigComparison } from "@/lib/mock-data";
import { ChartTooltip } from "@/components/shared/chart-tooltip";

const colors = ["var(--chart-5)", "var(--chart-5)", "var(--chart-2)", "var(--chart-1)"];

export function RetrievalBarChart() {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={retrievalConfigComparison}
          layout="vertical"
          margin={{ top: 4, right: 24, bottom: 0, left: 0 }}
          barCategoryGap={18}
        >
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <YAxis
            type="category"
            dataKey="config"
            width={150}
            tick={{ fontSize: 12, fill: "var(--foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={<ChartTooltip valueFormatter={(v) => `${v}%`} />}
            cursor={{ fill: "var(--accent)" }}
          />
          <Bar dataKey="correctness" name="Correctness" radius={[0, 6, 6, 0]} barSize={22}>
            {retrievalConfigComparison.map((entry, i) => (
              <Cell key={entry.config} fill={colors[i]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
