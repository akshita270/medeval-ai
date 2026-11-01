"use client";

import { useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  FlaskConical,
  GitCommitHorizontal,
  Loader2,
  Microscope,
  Rocket,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { pipelineSteps, type PipelineStepStatus } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const stepIconMap = {
  GitCommitHorizontal,
  FlaskConical,
  Microscope,
  ShieldCheck,
  Rocket,
};

const statusStyles: Record<PipelineStepStatus, string> = {
  passed: "bg-success/10 text-success border-success/30",
  failed: "bg-destructive/10 text-destructive border-destructive/30",
  running: "bg-primary/10 text-primary border-primary/30",
  pending: "bg-muted text-muted-foreground border-border",
};

export function PipelineSteps() {
  const [expanded, setExpanded] = useState<string | null>(pipelineSteps[2]?.id ?? null);

  return (
    <div className="flex flex-col gap-0">
      <div className="flex flex-col gap-0 sm:flex-row sm:items-stretch">
        {pipelineSteps.map((step, i) => {
          const Icon = stepIconMap[step.icon as keyof typeof stepIconMap] ?? GitCommitHorizontal;
          const isExpanded = expanded === step.id;
          const isLast = i === pipelineSteps.length - 1;

          return (
            <div key={step.id} className="flex flex-1 sm:items-start">
              <div className="flex flex-1 flex-col">
                <button
                  onClick={() => setExpanded(isExpanded ? null : step.id)}
                  className={cn(
                    "flex flex-col items-start gap-2.5 rounded-xl border p-4 text-left transition-colors",
                    isExpanded ? "border-primary/30 bg-primary/5" : "border-border bg-card hover:bg-muted/40",
                  )}
                >
                  <div className="flex w-full items-center justify-between">
                    <div
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg border",
                        statusStyles[step.status],
                      )}
                    >
                      {step.status === "running" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : step.status === "passed" ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : step.status === "failed" ? (
                        <XCircle className="h-4 w-4" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 text-muted-foreground transition-transform",
                        isExpanded && "rotate-180",
                      )}
                    />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold">{step.name}</p>
                    <p className="text-[11px] text-muted-foreground">{step.durationSec}s · {step.timestamp}</p>
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <ul className="mt-2 flex flex-col gap-1.5 rounded-xl border border-border bg-muted/30 p-3">
                        {step.details.map((d) => (
                          <li key={d} className="flex items-start gap-1.5 text-[11.5px] text-muted-foreground">
                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                            {d}
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {!isLast && (
                <div className="hidden w-8 shrink-0 items-center justify-center pt-8 sm:flex">
                  <div className="h-px w-full bg-border" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
