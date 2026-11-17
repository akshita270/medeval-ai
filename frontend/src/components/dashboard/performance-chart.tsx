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
import type { EvalRunSummary } from "@/lib/api";
import { ChartTooltip } from "@/components/shared/chart-tooltip";

const series = [
  { key: "correctness", metric: "answer_correctness", name: "Correctness", color: "var(--chart-1)" },
  { key: "faithfulness", metric: "faithfulness", name: "Faithfulness", color: "var(--chart-2)" },
  { key: "contextRecall", metric: "context_recall", name: "Context Recall", color: "var(--chart-3)" },
];

export function PerformanceChart({ runs }: { runs: EvalRunSummary[] }) {
  const data = [...runs].reverse().map((run) => {
    const point: Record<string, number | string> = { run: run.label.split(" (")[0] };
    for (const s of series) {
      const summary = run.metric_summaries.find((m) => m.metric === s.metric);
      point[s.key] = summary ? Math.round(summary.mean_score * 1000) / 10 : 0;
    }
    return point;
  });

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="run"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
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
              dot={{ r: 3 }}
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
