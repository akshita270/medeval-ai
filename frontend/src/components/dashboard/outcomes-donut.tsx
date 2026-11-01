"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { evaluationOutcomes } from "@/lib/mock-data";
import { ChartTooltip } from "@/components/shared/chart-tooltip";

export function OutcomesDonut() {
  const total = evaluationOutcomes.reduce((acc, d) => acc + d.value, 0);
  const passRate = ((evaluationOutcomes[0].value / total) * 100).toFixed(1);

  return (
    <div className="relative h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={evaluationOutcomes}
            dataKey="value"
            nameKey="name"
            innerRadius={70}
            outerRadius={100}
            paddingAngle={3}
            startAngle={90}
            endAngle={-270}
            stroke="none"
          >
            {evaluationOutcomes.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[26px] font-semibold tabular-nums">{passRate}%</span>
        <span className="text-[11.5px] text-muted-foreground">Pass rate</span>
      </div>
      <div className="mt-1 flex items-center justify-center gap-4">
        {evaluationOutcomes.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
            {d.name} ({d.value})
          </div>
        ))}
      </div>
    </div>
  );
}
