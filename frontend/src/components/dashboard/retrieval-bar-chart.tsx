"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { EvalRunSummary } from "@/lib/api";
import { ChartTooltip } from "@/components/shared/chart-tooltip";

const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

export function RetrievalBarChart({ runs }: { runs: EvalRunSummary[] }) {
  const data = runs
    .map((run) => {
      const correctness = run.metric_summaries.find((m) => m.metric === "answer_correctness");
      return { config: run.label, correctness: correctness ? Math.round(correctness.mean_score * 1000) / 10 : 0 };
    })
    .filter((d) => d.correctness > 0);

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 0, left: 0 }} barCategoryGap={18}>
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
            tick={{ fontSize: 11, fill: "var(--foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={<ChartTooltip valueFormatter={(v) => `${v}%`} />}
            cursor={{ fill: "var(--accent)" }}
          />
          <Bar dataKey="correctness" name="Correctness" radius={[0, 6, 6, 0]} barSize={22}>
            {data.map((entry, i) => (
              <Cell key={entry.config} fill={colors[i % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
