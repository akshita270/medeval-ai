"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { ChartCard } from "@/components/shared/chart-card";
import { ChartTooltip } from "@/components/shared/chart-tooltip";
import { Badge } from "@/components/ui/badge";
import { experiments, type Experiment } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const chartColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

export function ComparisonView({ selectedIds }: { selectedIds: string[] }) {
  const selected = experiments.filter((e) => selectedIds.includes(e.id));
  if (selected.length < 2) return null;

  const baseline = selected[0];
  const chartData = [
    {
      metric: "Correctness",
      ...Object.fromEntries(selected.map((e) => [e.name, e.correctness])),
    },
    {
      metric: "Faithfulness",
      ...Object.fromEntries(selected.map((e) => [e.name, e.faithfulness])),
    },
  ];

  const configFields: { label: string; key: keyof Experiment }[] = [
    { label: "Model", key: "model" },
    { label: "Chunk size", key: "chunkSize" },
    { label: "Retrieval strategy", key: "retrieval" },
    { label: "Reranking", key: "reranking" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {selected.map((exp) => (
          <ComparisonCard key={exp.id} exp={exp} baseline={baseline} />
        ))}
      </div>

      <ChartCard
        title="Correctness & Faithfulness by Experiment"
        subtitle="Grouped comparison across selected runs"
      >
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="metric"
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={false}
              />
              <YAxis
                domain={[80, 100]}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                width={42}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                content={<ChartTooltip valueFormatter={(v) => `${v}%`} />}
                cursor={{ fill: "var(--accent)" }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {selected.map((exp, i) => (
                <Bar
                  key={exp.id}
                  dataKey={exp.name}
                  fill={chartColors[i % chartColors.length]}
                  radius={[6, 6, 0, 0]}
                  barSize={28}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="Configuration Diff" subtitle="Highlighted where values differ from the first selected run">
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Field</th>
                {selected.map((exp) => (
                  <th key={exp.id} className="py-2 pr-4 font-medium">
                    {exp.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {configFields.map((field) => (
                <tr key={field.label} className="border-b border-border last:border-0">
                  <td className="py-2.5 pr-4 text-muted-foreground">{field.label}</td>
                  {selected.map((exp) => {
                    const value = exp[field.key];
                    const differs = value !== baseline[field.key];
                    return (
                      <td
                        key={exp.id}
                        className={cn(
                          "py-2.5 pr-4 font-mono",
                          differs && "font-semibold text-primary",
                        )}
                      >
                        {typeof value === "boolean" ? (value ? "Enabled" : "Off") : String(value)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}

function ComparisonCard({ exp, baseline }: { exp: Experiment; baseline: Experiment }) {
  const isBaseline = exp.id === baseline.id;
  const correctnessDelta = exp.correctness - baseline.correctness;
  const faithfulnessDelta = exp.faithfulness - baseline.faithfulness;
  const latencyDelta = exp.latencyMs - baseline.latencyMs;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate font-mono text-[13px] font-semibold">{exp.name}</p>
        {isBaseline && (
          <Badge variant="outline" className="shrink-0 text-[10px]">
            Baseline
          </Badge>
        )}
      </div>
      <p className="mt-0.5 text-[11.5px] text-muted-foreground">
        {exp.model} · {exp.chunkSize}tok · {exp.retrieval}
      </p>

      <div className="mt-4 flex flex-col gap-2.5">
        <DeltaRow
          label="Correctness"
          value={`${exp.correctness.toFixed(1)}%`}
          delta={correctnessDelta}
          goodDirection="up"
          isBaseline={isBaseline}
          format={(d) => `${Math.abs(d).toFixed(1)}pt`}
        />
        <DeltaRow
          label="Faithfulness"
          value={`${exp.faithfulness.toFixed(1)}%`}
          delta={faithfulnessDelta}
          goodDirection="up"
          isBaseline={isBaseline}
          format={(d) => `${Math.abs(d).toFixed(1)}pt`}
        />
        <DeltaRow
          label="Latency"
          value={`${(exp.latencyMs / 1000).toFixed(2)}s`}
          delta={latencyDelta}
          goodDirection="down"
          isBaseline={isBaseline}
          format={(d) => `${Math.abs(Math.round(d))}ms`}
        />
      </div>
    </div>
  );
}

function DeltaRow({
  label,
  value,
  delta,
  isBaseline,
  goodDirection,
  format,
}: {
  label: string;
  value: string;
  delta: number;
  isBaseline: boolean;
  goodDirection: "up" | "down";
  format: (delta: number) => string;
}) {
  const good =
    delta === 0 ? null : goodDirection === "up" ? delta > 0 : delta < 0;

  return (
    <div className="flex items-center justify-between text-[12.5px]">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-mono font-medium tabular-nums">{value}</span>
        {!isBaseline && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium",
              good === null
                ? "bg-muted text-muted-foreground"
                : good
                  ? "bg-success/10 text-success"
                  : "bg-destructive/10 text-destructive",
            )}
          >
            {delta === 0 ? (
              <Minus className="h-3 w-3" />
            ) : good ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {format(delta)}
          </span>
        )}
      </div>
    </div>
  );
}
