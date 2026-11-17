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

export function ModelQualityChart({ runs }: { runs: EvalRunSummary[] }) {
  const data = [...runs].reverse().map((run) => {
    const correctness = run.metric_summaries.find((m) => m.metric === "answer_correctness");
    const faithfulness = run.metric_summaries.find((m) => m.metric === "faithfulness");
    return {
      run: run.label.split(" (")[0],
      correctness: correctness ? Math.round(correctness.mean_score * 1000) / 10 : 0,
      faithfulness: faithfulness ? Math.round(faithfulness.mean_score * 1000) / 10 : 0,
    };
  });

  return (
    <div className="h-[240px] w-full">
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
            cursor={{ stroke: "var(--border)" }}
          />
          <Line type="monotone" dataKey="correctness" name="Correctness" stroke="var(--chart-1)" strokeWidth={2.25} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="faithfulness" name="Faithfulness" stroke="var(--chart-2)" strokeWidth={2.25} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-1 flex items-center justify-center gap-4">
        <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--chart-1)" }} />
          Correctness
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--chart-2)" }} />
          Faithfulness
        </div>
      </div>
    </div>
  );
}
