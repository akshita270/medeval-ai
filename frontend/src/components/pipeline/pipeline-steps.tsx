"use client";

import { useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Clock,
  FlaskConical,
  GitCommitHorizontal,
  Loader2,
  Microscope,
  Rocket,
  XCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { CiJob } from "@/lib/api";
import { cn } from "@/lib/utils";

type StepStatus = "passed" | "failed" | "running" | "pending";

function jobStatusKind(job: CiJob): StepStatus {
  if (job.status !== "completed") return job.status === "in_progress" ? "running" : "pending";
  if (job.conclusion === "success") return "passed";
  if (job.conclusion === "skipped") return "pending";
  return "failed";
}

function stepStatusKind(step: { status: string; conclusion: string | null }): StepStatus {
  if (step.status !== "completed") return step.status === "in_progress" ? "running" : "pending";
  if (step.conclusion === "success") return "passed";
  if (step.conclusion === "skipped") return "pending";
  return "failed";
}

function jobIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("lint") || lower.includes("test")) return FlaskConical;
  if (lower.includes("eval")) return Microscope;
  if (lower.includes("deploy")) return Rocket;
  return GitCommitHorizontal;
}

const statusStyles: Record<StepStatus, string> = {
  passed: "bg-success/10 text-success border-success/30",
  failed: "bg-destructive/10 text-destructive border-destructive/30",
  running: "bg-primary/10 text-primary border-primary/30",
  pending: "bg-muted text-muted-foreground border-border",
};

const statusIcon: Record<StepStatus, typeof CheckCircle2> = {
  passed: CheckCircle2,
  failed: XCircle,
  running: Loader2,
  pending: Clock,
};

export function PipelineSteps({ jobs }: { jobs: CiJob[] }) {
  const firstFailing = jobs.findIndex((j) => jobStatusKind(j) === "failed");
  const [expanded, setExpanded] = useState<string | null>(jobs[firstFailing]?.name ?? jobs[0]?.name ?? null);

  if (jobs.length === 0) {
    return <p className="text-[12.5px] text-muted-foreground">No job detail available for this run.</p>;
  }

  return (
    <div className="flex flex-col gap-0 sm:flex-row sm:items-stretch">
      {jobs.map((job, i) => {
        const kind = jobStatusKind(job);
        const Icon = jobIcon(job.name);
        const StatusIcon = statusIcon[kind];
        const isExpanded = expanded === job.name;
        const isLast = i === jobs.length - 1;

        return (
          <div key={job.name} className="flex flex-1 sm:items-start">
            <div className="flex flex-1 flex-col">
              <button
                onClick={() => setExpanded(isExpanded ? null : job.name)}
                className={cn(
                  "flex flex-col items-start gap-2.5 rounded-xl border p-4 text-left transition-colors",
                  isExpanded ? "border-primary/30 bg-primary/5" : "border-border bg-card hover:bg-muted/40",
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg border", statusStyles[kind])}>
                    {kind === "running" ? <StatusIcon className="h-4 w-4 animate-spin" /> : <StatusIcon className="h-4 w-4" />}
                  </div>
                  <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                </div>
                <div>
                  <p className="text-[13px] font-semibold">{job.name}</p>
                  <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Icon className="h-3 w-3" />
                    {job.steps.length} steps
                  </p>
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
                      {job.steps.map((step) => (
                        <li key={step.name} className="flex items-center justify-between gap-2 text-[11.5px]">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <span
                              className={cn(
                                "h-1.5 w-1.5 shrink-0 rounded-full",
                                stepStatusKind(step) === "passed" && "bg-success",
                                stepStatusKind(step) === "failed" && "bg-destructive",
                                stepStatusKind(step) === "running" && "bg-primary",
                                stepStatusKind(step) === "pending" && "bg-muted-foreground",
                              )}
                            />
                            {step.name}
                          </span>
                          <span className="capitalize text-muted-foreground">{step.conclusion ?? step.status}</span>
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
  );
}
