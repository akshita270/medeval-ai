import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Clock,
} from "lucide-react";

export type StatusKind =
  | "passed"
  | "failed"
  | "running"
  | "warning"
  | "pending"
  | "deployed"
  | "rolled-back"
  | "blocked"
  | "success";

const statusConfig: Record<
  StatusKind,
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  passed: {
    label: "Passed",
    icon: CheckCircle2,
    className: "bg-success/10 text-success border-success/20",
  },
  success: {
    label: "Success",
    icon: CheckCircle2,
    className: "bg-success/10 text-success border-success/20",
  },
  deployed: {
    label: "Deployed",
    icon: CheckCircle2,
    className: "bg-success/10 text-success border-success/20",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  blocked: {
    label: "Blocked",
    icon: XCircle,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  running: {
    label: "Running",
    icon: Loader2,
    className: "bg-primary/10 text-primary border-primary/20",
  },
  warning: {
    label: "Warning",
    icon: AlertTriangle,
    className: "bg-warning/10 text-warning border-warning/20",
  },
  "rolled-back": {
    label: "Rolled back",
    icon: AlertTriangle,
    className: "bg-warning/10 text-warning border-warning/20",
  },
  pending: {
    label: "Pending",
    icon: Clock,
    className: "bg-muted text-muted-foreground border-border",
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: StatusKind;
  className?: string;
}) {
  const config = statusConfig[status];
  const Icon = config.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-medium",
        config.className,
        className,
      )}
    >
      <Icon className={cn("h-3 w-3", status === "running" && "animate-spin")} />
      {config.label}
    </span>
  );
}
