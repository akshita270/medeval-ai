import { CheckCircle2, XCircle } from "lucide-react";
import { qualityGates } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function QualityGates() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {qualityGates.map((gate) => (
        <div
          key={gate.id}
          className={cn(
            "rounded-xl border p-4",
            gate.passed ? "border-success/20 bg-success/5" : "border-destructive/20 bg-destructive/5",
          )}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11.5px] font-medium text-muted-foreground">{gate.label}</p>
            {gate.passed ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0 text-destructive" />
            )}
          </div>
          <p className="mt-2 font-mono text-[18px] font-semibold tabular-nums">{gate.actual}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Threshold: {gate.threshold}</p>
        </div>
      ))}
    </div>
  );
}
