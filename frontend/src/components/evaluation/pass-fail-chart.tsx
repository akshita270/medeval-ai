"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { EvalRunDetail } from "@/lib/api";
import { countPassFail } from "@/lib/eval-helpers";
import { ChartTooltip } from "@/components/shared/chart-tooltip";

export function PassFailChart({ detail }: { detail: EvalRunDetail }) {
  const { passed, failed } = countPassFail(detail);
  const total = passed + failed;
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : "0.0";
  const data = [
    { name: "Passed", value: passed, color: "var(--chart-1)" },
    { name: "Failed", value: failed, color: "var(--destructive)" },
  ];

  return (
    <div className="relative h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={62}
            outerRadius={86}
            paddingAngle={3}
            startAngle={90}
            endAngle={-270}
            stroke="none"
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[22px] font-semibold tabular-nums">{passRate}%</span>
        <span className="text-[11px] text-muted-foreground">Pass rate</span>
      </div>
    </div>
  );
}
