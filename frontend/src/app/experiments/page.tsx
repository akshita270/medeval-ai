"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { SectionHeader } from "@/components/shared/section-header";
import { ChartCard } from "@/components/shared/chart-card";
import { ExperimentStats } from "@/components/experiments/experiment-stats";
import { ExperimentTable } from "@/components/experiments/experiment-table";
import { ComparisonView } from "@/components/experiments/comparison-view";
import { Button } from "@/components/ui/button";

export default function ExperimentsPage() {
  const [selected, setSelected] = useState<string[]>(["exp-03", "exp-04", "exp-05"]);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Experiments"
        subtitle="Compare retrieval, chunking, and model configurations side by side — MLflow-style."
      />

      <ExperimentStats />

      <ChartCard
        title="All Experiments"
        subtitle="Select two or more rows to compare configurations"
        actions={
          selected.length > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => setSelected([])} className="gap-1.5">
              <X className="h-3.5 w-3.5" />
              Clear ({selected.length})
            </Button>
          ) : undefined
        }
      >
        <ExperimentTable selected={selected} onToggle={toggle} />
      </ChartCard>

      {selected.length >= 2 ? (
        <ComparisonView selectedIds={selected} />
      ) : (
        <div className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border py-14 text-center">
          <p className="text-[13px] font-medium text-muted-foreground">
            Select at least 2 experiments to compare
          </p>
          <p className="text-[12px] text-muted-foreground">
            Check the boxes in the table above to build a side-by-side comparison.
          </p>
        </div>
      )}
    </div>
  );
}
