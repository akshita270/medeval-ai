import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  MessageSquareText,
  FlaskConical,
  GitCompareArrows,
  Workflow,
  Activity,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
}

export const navItems: NavItem[] = [
  {
    label: "Overview",
    href: "/",
    icon: LayoutDashboard,
    description: "AI quality at a glance",
  },
  {
    label: "RAG Playground",
    href: "/playground",
    icon: MessageSquareText,
    description: "Chat, retrieval & guardrails",
  },
  {
    label: "Evaluation Lab",
    href: "/evaluation",
    icon: FlaskConical,
    description: "Run & inspect evaluations",
  },
  {
    label: "Experiments",
    href: "/experiments",
    icon: GitCompareArrows,
    description: "Compare configurations",
  },
  {
    label: "CI/CD Pipeline",
    href: "/pipeline",
    icon: Workflow,
    description: "Quality gates & deploys",
  },
  {
    label: "Monitoring",
    href: "/monitoring",
    icon: Activity,
    description: "Live observability",
  },
];
