"use client";

import { useState } from "react";
import { Loader2, Play } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  evalMetricOptions,
  evalModels,
  goldenDatasets,
  retrievalStrategies,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function ConfigPanel({
  onRun,
  isRunning,
}: {
  onRun: () => void;
  isRunning: boolean;
}) {
  const [dataset, setDataset] = useState(goldenDatasets[0].id);
  const [model, setModel] = useState(evalModels[0]);
  const [strategy, setStrategy] = useState(retrievalStrategies[3]);
  const [reranking, setReranking] = useState(true);
  const [metrics, setMetrics] = useState<string[]>(evalMetricOptions);

  function toggleMetric(metric: string) {
    setMetrics((prev) =>
      prev.includes(metric) ? prev.filter((m) => m !== metric) : [...prev, metric],
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <h3 className="text-[14.5px] font-semibold tracking-tight">Run Configuration</h3>
      <p className="mt-0.5 text-[12px] text-muted-foreground">
        Select a golden dataset and model configuration to evaluate.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <Label className="text-[12px] text-muted-foreground">Golden dataset</Label>
          <Select value={dataset} onValueChange={(v) => v && setDataset(v)}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {(value: string) =>
                  goldenDatasets.find((d) => d.id === value)?.label ?? value
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {goldenDatasets.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.label} ({d.size})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-[12px] text-muted-foreground">Model</Label>
          <Select value={model} onValueChange={(v) => v && setModel(v)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {evalModels.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-[12px] text-muted-foreground">Retrieval strategy</Label>
          <Select value={strategy} onValueChange={(v) => v && setStrategy(v)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {retrievalStrategies.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col justify-between gap-1.5">
          <Label className="text-[12px] text-muted-foreground">Reranking</Label>
          <div className="flex h-8 items-center gap-2.5">
            <Switch checked={reranking} onCheckedChange={setReranking} />
            <span className="text-[12.5px] text-foreground">
              {reranking ? "Enabled" : "Disabled"}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-1.5">
        <Label className="text-[12px] text-muted-foreground">Metrics</Label>
        <div className="flex flex-wrap gap-2">
          {evalMetricOptions.map((metric) => {
            const active = metrics.includes(metric);
            return (
              <button
                key={metric}
                onClick={() => toggleMetric(metric)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
                  active
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-muted",
                )}
              >
                {metric}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <p className="text-[11.5px] text-muted-foreground">
          Estimated runtime: ~{reranking ? "5m 10s" : "3m 40s"} · {metrics.length} metrics selected
        </p>
        <Button onClick={onRun} disabled={isRunning} className="gap-2">
          {isRunning ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Running evaluation...
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5" />
              Run Evaluation
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
