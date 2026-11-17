"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { GuardrailEventCount } from "@/lib/api";
import { ChartTooltip } from "@/components/shared/chart-tooltip";

const colors = ["var(--destructive)", "var(--warning)", "var(--chart-1)", "var(--chart-3)", "var(--chart-5)"];

export function GuardrailFrequencyChart({ data }: { data: GuardrailEventCount[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[240px] w-full items-center justify-center text-center text-[12px] text-muted-foreground">
        No guardrail has blocked a real request yet on this server.
      </div>
    );
  }

  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 0, left: 0 }}>
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
            width={150}
            tick={{ fontSize: 11, fill: "var(--foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--accent)" }} />
          <Bar dataKey="count" name="Events" radius={[0, 6, 6, 0]} barSize={18}>
            {data.map((entry, i) => (
              <Cell key={entry.category} fill={colors[i % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
