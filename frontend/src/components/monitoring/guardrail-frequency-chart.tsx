"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { guardrailEventFrequency } from "@/lib/mock-data";
import { ChartTooltip } from "@/components/shared/chart-tooltip";

const colors = ["var(--destructive)", "var(--warning)", "var(--chart-1)", "var(--chart-3)", "var(--chart-5)"];

export function GuardrailFrequencyChart() {
  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={guardrailEventFrequency}
          layout="vertical"
          margin={{ top: 4, right: 24, bottom: 0, left: 0 }}
        >
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="category"
            width={130}
            tick={{ fontSize: 11.5, fill: "var(--foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--accent)" }} />
          <Bar dataKey="count" name="Events" radius={[0, 6, 6, 0]} barSize={18}>
            {guardrailEventFrequency.map((entry, i) => (
              <Cell key={entry.category} fill={colors[i % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
