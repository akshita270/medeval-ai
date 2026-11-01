"use client";

interface TooltipPayloadItem {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
  unit?: string;
}

export function ChartTooltip({
  active,
  label,
  payload,
  valueFormatter,
}: {
  active?: boolean;
  label?: string | number;
  payload?: TooltipPayloadItem[];
  valueFormatter?: (value: number | string, key?: string | number) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-popover px-3.5 py-2.5 text-[12.5px] shadow-soft-lg">
      {label !== undefined && (
        <p className="mb-1.5 font-medium text-popover-foreground">{label}</p>
      )}
      <div className="flex flex-col gap-1">
        {payload.map((item, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              {item.name}
            </span>
            <span className="font-medium tabular-nums text-popover-foreground">
              {valueFormatter && item.value !== undefined
                ? valueFormatter(item.value, item.dataKey)
                : item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
