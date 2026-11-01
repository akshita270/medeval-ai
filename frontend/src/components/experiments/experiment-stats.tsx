import { Award, Clock, FlaskConical, TrendingUp } from "lucide-react";
import { experimentOverviewStats } from "@/lib/mock-data";

const stats = [
  {
    label: "Total Experiments",
    value: String(experimentOverviewStats.total),
    icon: FlaskConical,
  },
  {
    label: "Best Configuration",
    value: experimentOverviewStats.bestConfig,
    icon: Award,
  },
  {
    label: "Latest Experiment",
    value: experimentOverviewStats.latest,
    icon: Clock,
  },
  {
    label: "Avg. Improvement",
    value: experimentOverviewStats.avgImprovement,
    icon: TrendingUp,
  },
];

export function ExperimentStats() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex items-center gap-3.5 rounded-2xl border border-border bg-card p-4 shadow-soft"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <stat.icon className="h-[18px] w-[18px]" />
          </div>
          <div className="min-w-0">
            <p className="text-[11.5px] text-muted-foreground">{stat.label}</p>
            <p className="truncate text-[14px] font-semibold tracking-tight">
              {stat.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
