"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { ChartCard } from "@/components/shared/chart-card";
import { ChartTooltip } from "@/components/shared/chart-tooltip";
import { Badge } from "@/components/ui/badge";
import type { EvalRunSummary } from "@/lib/api";
import { parseRunConfig, runMetricMean } from "@/lib/eval-helpers";
import { cn } from "@/lib/utils";

const chartColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

export function ComparisonView({ runs, selectedIds }: { runs: EvalRunSummary[]; selectedIds: string[] }) {
  const selected = runs.filter((r) => selectedIds.includes(r.run_id));
  if (selected.length < 2) return null;

  const reference = selected[0];
  const shortName = (r: EvalRunSummary) => r.label.split(" (")[0];
  const chartData = [
    {
      metric: "Correctness",
      ...Object.fromEntries(selected.map((r) => [shortName(r), (runMetricMean(r, "answer_correctness") ?? 0) * 100])),
    },
    {
      metric: "Faithfulness",
      ...Object.fromEntries(selected.map((r) => [shortName(r), (runMetricMean(r, "faithfulness") ?? 0) * 100])),
    },
  ];

  const configRows: { label: string; render: (r: EvalRunSummary) => string }[] = [
    { label: "Model", render: (r) => r.generation_model || "--" },
    { label: "Retrieval strategy", render: (r) => parseRunConfig(r).retrieval },
    { label: "Reranking", render: (r) => (parseRunConfig(r).reranking ? "Enabled" : "Off") },
    { label: "Model routing", render: (r) => (parseRunConfig(r).routed ? "Enabled" : "Off") },
    { label: "Questions evaluated", render: (r) => String(r.total_questions) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {selected.map((run) => (
          <ComparisonCard key={run.run_id} run={run} reference={reference} />
        ))}
      </div>

      <ChartCard title="Correctness & Faithfulness by Run" subtitle="Real scores from each selected run">
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
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                width={42}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip content={<ChartTooltip valueFormatter={(v) => `${v}%`} />} cursor={{ fill: "var(--accent)" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {selected.map((run, i) => (
                <Bar key={run.run_id} dataKey={shortName(run)} fill={chartColors[i % chartColors.length]} radius={[6, 6, 0, 0]} barSize={28} />
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
                {selected.map((run) => (
                  <th key={run.run_id} className="py-2 pr-4 font-medium">
                    {shortName(run)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {configRows.map((field) => (
                <tr key={field.label} className="border-b border-border last:border-0">
                  <td className="py-2.5 pr-4 text-muted-foreground">{field.label}</td>
                  {selected.map((run) => {
                    const value = field.render(run);
                    const differs = value !== field.render(reference);
                    return (
                      <td key={run.run_id} className={cn("py-2.5 pr-4 font-mono", differs && "font-semibold text-primary")}>
                        {value}
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

function ComparisonCard({ run, reference }: { run: EvalRunSummary; reference: EvalRunSummary }) {
  const isReference = run.run_id === reference.run_id;
  const correctness = (runMetricMean(run, "answer_correctness") ?? 0) * 100;
  const refCorrectness = (runMetricMean(reference, "answer_correctness") ?? 0) * 100;
  const faithfulness = (runMetricMean(run, "faithfulness") ?? 0) * 100;
  const refFaithfulness = (runMetricMean(reference, "faithfulness") ?? 0) * 100;
  const avgLatency = run.total_generation_latency_seconds != null ? run.total_generation_latency_seconds / run.total_questions : null;
  const refAvgLatency =
    reference.total_generation_latency_seconds != null ? reference.total_generation_latency_seconds / reference.total_questions : null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate font-mono text-[13px] font-semibold">{run.label}</p>
        {isReference && (
          <Badge variant="outline" className="shrink-0 text-[10px]">
            Reference
          </Badge>
        )}
      </div>
      <p className="mt-0.5 text-[11.5px] text-muted-foreground">
        {run.generation_model || "unknown model"} · {parseRunConfig(run).retrieval}
      </p>

      <div className="mt-4 flex flex-col gap-2.5">
        <DeltaRow
          label="Correctness"
          value={`${correctness.toFixed(1)}%`}
          delta={correctness - refCorrectness}
          goodDirection="up"
          isReference={isReference}
          format={(d) => `${Math.abs(d).toFixed(1)}pt`}
        />
        <DeltaRow
          label="Faithfulness"
          value={`${faithfulness.toFixed(1)}%`}
          delta={faithfulness - refFaithfulness}
          goodDirection="up"
          isReference={isReference}
          format={(d) => `${Math.abs(d).toFixed(1)}pt`}
        />
        <DeltaRow
          label="Avg latency"
          value={avgLatency != null ? `${avgLatency.toFixed(2)}s` : "--"}
          delta={avgLatency != null && refAvgLatency != null ? avgLatency - refAvgLatency : 0}
          goodDirection="down"
          isReference={isReference}
          format={(d) => `${Math.abs(d).toFixed(2)}s`}
        />
      </div>
    </div>
  );
}

function DeltaRow({
  label,
  value,
  delta,
  isReference,
  goodDirection,
  format,
}: {
  label: string;
  value: string;
  delta: number;
  isReference: boolean;
  goodDirection: "up" | "down";
  format: (delta: number) => string;
}) {
  const good = delta === 0 ? null : goodDirection === "up" ? delta > 0 : delta < 0;

  return (
    <div className="flex items-center justify-between text-[12.5px]">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-mono font-medium tabular-nums">{value}</span>
        {!isReference && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium",
              good === null ? "bg-muted text-muted-foreground" : good ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
            )}
          >
            {delta === 0 ? <Minus className="h-3 w-3" /> : good ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {format(delta)}
          </span>
        )}
      </div>
    </div>
  );
}
