"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { radarComparison } from "@/lib/mock-data";
import { ChartTooltip } from "@/components/shared/chart-tooltip";

export function RadarComparisonChart() {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={radarComparison} outerRadius="72%">
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis
            dataKey="metric"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          />
          <PolarRadiusAxis
            domain={[80, 100]}
            tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
            axisLine={false}
          />
          <Tooltip content={<ChartTooltip valueFormatter={(v) => `${v}%`} />} />
          <Radar
            name="Baseline"
            dataKey="baseline"
            stroke="var(--chart-5)"
            fill="var(--chart-5)"
            fillOpacity={0.12}
            strokeWidth={2}
          />
          <Radar
            name="Candidate"
            dataKey="candidate"
            stroke="var(--chart-1)"
            fill="var(--chart-1)"
            fillOpacity={0.2}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
      <div className="mt-1 flex items-center justify-center gap-4">
        <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--chart-5)" }} />
          Baseline
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--chart-1)" }} />
          Candidate
        </div>
      </div>
    </div>
  );
}
