"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { passFailDistribution } from "@/lib/mock-data";
import { ChartTooltip } from "@/components/shared/chart-tooltip";

export function PassFailChart() {
  const total = passFailDistribution.reduce((acc, d) => acc + d.value, 0);
  const passRate = ((passFailDistribution[0].value / total) * 100).toFixed(1);

  return (
    <div className="relative h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={passFailDistribution}
            dataKey="value"
            nameKey="name"
            innerRadius={62}
            outerRadius={86}
            paddingAngle={3}
            startAngle={90}
            endAngle={-270}
            stroke="none"
          >
            {passFailDistribution.map((entry) => (
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
