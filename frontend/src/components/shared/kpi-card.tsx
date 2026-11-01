"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { Kpi } from "@/lib/mock-data";
import { iconMap } from "@/lib/icon-map";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "./animated-number";

export function KpiCard({ kpi, index = 0 }: { kpi: Kpi; index?: number }) {
  const Icon = iconMap[kpi.icon] ?? iconMap.Target;
  const isGood =
    kpi.trend === "flat"
      ? true
      : (kpi.trend === "up" && kpi.goodDirection === "up") ||
        (kpi.trend === "down" && kpi.goodDirection === "down");

  const decimals = kpi.value.includes(".") ? 1 : 0;
  const formatter =
    kpi.format === "compact"
      ? (v: number) =>
          new Intl.NumberFormat("en-US", {
            notation: "compact",
            maximumFractionDigits: 1,
          }).format(v)
      : kpi.format === "currency"
        ? (v: number) => `$${Math.round(v).toLocaleString()}`
        : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      className="group rounded-2xl border border-border bg-card p-5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft-lg"
    >
      <div className="flex items-start justify-between">
        <p className="text-[13px] font-medium text-muted-foreground">{kpi.label}</p>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-110">
          <Icon className="h-[18px] w-[18px]" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-[28px] font-semibold tracking-tight tabular-nums">
          <AnimatedNumber value={kpi.rawValue} decimals={decimals} format={formatter} />
        </span>
        {!formatter && kpi.unit && (
          <span className="text-[15px] font-medium text-muted-foreground">
            {kpi.unit}
          </span>
        )}
      </div>

      <div className="mt-2.5 flex items-center gap-1.5">
        <span
          className={cn(
            "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11.5px] font-medium",
            kpi.trend === "flat"
              ? "bg-muted text-muted-foreground"
              : isGood
                ? "bg-success/10 text-success"
                : "bg-destructive/10 text-destructive",
          )}
        >
          {kpi.trend === "up" && <ArrowUpRight className="h-3 w-3" />}
          {kpi.trend === "down" && <ArrowDownRight className="h-3 w-3" />}
          {kpi.trend === "flat" && <Minus className="h-3 w-3" />}
          {kpi.trendValue}
        </span>
        <span className="text-[11.5px] text-muted-foreground">{kpi.comparison}</span>
      </div>
    </motion.div>
  );
}
