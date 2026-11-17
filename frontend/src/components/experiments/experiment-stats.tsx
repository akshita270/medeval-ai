import { Award, Clock, FlaskConical, TrendingUp } from "lucide-react";
import type { EvalRunSummary } from "@/lib/api";

export function ExperimentStats({ runs }: { runs: EvalRunSummary[] }) {
  const best = [...runs].sort((a, b) => b.overall_score - a.overall_score)[0] ?? null;
  const latest = [...runs].sort((a, b) => b.generated_at - a.generated_at)[0] ?? null;
  const baseline = runs.find((r) => r.is_baseline) ?? null;
  const avgImprovement =
    baseline && runs.length > 1
      ? runs
          .filter((r) => !r.is_baseline)
          .reduce((acc, r) => acc + (r.overall_score - baseline.overall_score), 0) /
        Math.max(runs.length - 1, 1)
      : null;

  const stats = [
    { label: "Total Real Runs", value: String(runs.length), icon: FlaskConical },
    { label: "Best Configuration", value: best ? best.label.split(" (")[0] : "--", icon: Award },
    { label: "Latest Run", value: latest ? latest.label.split(" (")[0] : "--", icon: Clock },
    {
      label: "Avg. vs Baseline",
      value: avgImprovement != null ? `${avgImprovement >= 0 ? "+" : ""}${(avgImprovement * 100).toFixed(1)}pt` : "--",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="flex items-center gap-3.5 rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <stat.icon className="h-[18px] w-[18px]" />
          </div>
          <div className="min-w-0">
            <p className="text-[11.5px] text-muted-foreground">{stat.label}</p>
            <p className="truncate text-[14px] font-semibold tracking-tight">{stat.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
