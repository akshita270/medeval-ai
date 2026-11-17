"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { LatencyBreakdown } from "@/lib/api";
import { ChartTooltip } from "@/components/shared/chart-tooltip";

const colors = ["var(--chart-1)", "var(--warning)", "var(--chart-3)", "var(--destructive)"];

export function LatencyBreakdownChart({ data }: { data: LatencyBreakdown }) {
  if (data.sample_count === 0) {
    return (
      <div className="flex h-[240px] w-full items-center justify-center text-center text-[12px] text-muted-foreground">
        No real request on this server has recorded per-stage timing yet.
      </div>
    );
  }

  const rows = [
    { stage: "Retrieval", ms: data.avg_retrieval_ms },
    { stage: "Input guardrails", ms: data.avg_input_guardrails_ms },
    { stage: "Generation", ms: data.avg_generation_ms },
    { stage: "Output guardrails", ms: data.avg_output_guardrails_ms },
  ];

  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 24, bottom: 0, left: 0 }}>
          <XAxis
            type="number"
            unit="ms"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="stage"
            width={120}
            tick={{ fontSize: 11, fill: "var(--foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--accent)" }} />
          <Bar dataKey="ms" name="Avg ms" radius={[0, 6, 6, 0]} barSize={18}>
            {rows.map((entry, i) => (
              <Cell key={entry.stage} fill={colors[i % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
