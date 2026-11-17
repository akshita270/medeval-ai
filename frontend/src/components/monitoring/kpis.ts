import type { Kpi } from "@/lib/ui-types";
import type { StatsOverview } from "@/lib/api";

export function buildMonitoringKpis(overview: StatsOverview): Kpi[] {
  const blockRate = overview.total_requests > 0 ? (overview.blocked_requests / overview.total_requests) * 100 : 0;
  const totalTokens = overview.total_prompt_tokens + overview.total_completion_tokens;

  return [
    {
      id: "requests",
      label: "Total API Requests",
      value: String(overview.total_requests),
      rawValue: overview.total_requests,
      trend: "flat",
      trendValue: "all time",
      comparison: "logged by this server",
      icon: "Network",
      goodDirection: "up",
    },
    {
      id: "avg-latency",
      label: "Average Latency",
      value: (overview.avg_latency_ms / 1000).toFixed(2),
      rawValue: overview.avg_latency_ms / 1000,
      unit: "s",
      trend: "flat",
      trendValue: "real measurement",
      comparison: "across every logged request",
      icon: "Gauge",
      goodDirection: "down",
    },
    {
      id: "block-rate",
      label: "Guardrail Block Rate",
      value: blockRate.toFixed(1),
      rawValue: blockRate,
      unit: "%",
      trend: "flat",
      trendValue: `${overview.blocked_requests} blocked`,
      comparison: `of ${overview.total_requests} requests`,
      icon: "ShieldAlert",
      goodDirection: "down",
    },
    {
      id: "tokens",
      label: "Token Consumption",
      value: String(totalTokens),
      rawValue: totalTokens,
      format: "compact",
      trend: "flat",
      trendValue: "all time",
      comparison: "input + output tokens",
      icon: "Binary",
      goodDirection: "down",
    },
    {
      id: "spend",
      label: "Estimated API Spend",
      value: overview.total_cost_usd.toFixed(4),
      rawValue: overview.total_cost_usd,
      format: "currency",
      trend: "flat",
      trendValue: "token-based estimate",
      comparison: "since this server started",
      icon: "DollarSign",
      goodDirection: "down",
    },
  ];
}
