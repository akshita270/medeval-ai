import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ChartCard({
  title,
  subtitle,
  actions,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-5 shadow-soft",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[14.5px] font-semibold tracking-tight">{title}</h3>
          {subtitle && (
            <p className="mt-0.5 text-[12px] text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {actions}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}
