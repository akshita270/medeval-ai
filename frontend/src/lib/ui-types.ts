// Shared UI types for presentational components. Every page now sources
// its actual data from the real backend (see api.ts, use-api-data.ts) --
// these are just shapes, not mock values.

export type TrendDirection = "up" | "down" | "flat";

export interface Kpi {
  id: string;
  label: string;
  value: string;
  rawValue: number;
  unit?: string;
  format?: "compact" | "currency";
  trend: TrendDirection;
  trendValue: string;
  comparison: string;
  icon: string;
  goodDirection: "up" | "down";
}

export type RunStatus = "passed" | "failed" | "running" | "warning";
