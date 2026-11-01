"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronsLeft,
  ChevronsRight,
  Settings,
  BookOpen,
  Moon,
  Sun,
  Sparkles,
} from "lucide-react";
import { useTheme } from "next-themes";
import { navItems } from "./nav-items";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const COLLAPSE_KEY = "medeval-sidebar-collapsed";

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration-safe mount flag, standard next-themes pattern
    setMounted(true);
    try {
      const stored = window.localStorage.getItem(COLLAPSE_KEY);
      if (stored === "1") setCollapsed(true);
    } catch {
      // ignore
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 76 : 260 }}
      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
      className="hidden lg:flex relative z-20 h-screen flex-col border-r border-sidebar-border bg-sidebar shrink-0"
    >
      {/* Brand */}
      <div
        className={cn(
          "flex h-16 items-center gap-2.5 border-b border-sidebar-border px-4",
          collapsed && "justify-center px-0",
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft">
          <Sparkles className="h-4.5 w-4.5" />
        </div>
        {!collapsed && (
          <div className="min-w-0 overflow-hidden">
            <p className="truncate text-[15px] font-semibold leading-tight tracking-tight text-sidebar-foreground">
              MedEval AI
            </p>
            <p className="truncate text-[11px] leading-tight text-muted-foreground">
              AI Quality Engineering Platform
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            const linkClassName = cn(
              "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium transition-colors duration-150",
              collapsed && "justify-center px-0",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            );
            const linkContent = (
              <>
                {active && (
                  <motion.span
                    layoutId="sidebar-active-indicator"
                    className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-primary"
                    transition={{ duration: 0.18 }}
                  />
                )}
                <Icon
                  className={cn(
                    "h-[18px] w-[18px] shrink-0",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </>
            );

            if (collapsed) {
              return (
                <li key={item.href}>
                  <Tooltip>
                    <TooltipTrigger
                      render={<Link href={item.href} className={linkClassName} />}
                    >
                      {linkContent}
                    </TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                </li>
              );
            }

            return (
              <li key={item.href}>
                <Link href={item.href} className={linkClassName}>
                  {linkContent}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom section */}
      <div className="border-t border-sidebar-border px-3 py-3">
        <ul className="flex flex-col gap-1">
          <SidebarActionItem
            icon={Settings}
            label="Settings"
            collapsed={collapsed}
          />
          <SidebarActionItem
            icon={BookOpen}
            label="Documentation"
            collapsed={collapsed}
          />
          <li>
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium text-sidebar-foreground/80 transition-colors duration-150 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                collapsed && "justify-center px-0",
              )}
            >
              {mounted && theme === "dark" ? (
                <Sun className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
              ) : (
                <Moon className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
              )}
              {!collapsed && (
                <span>{mounted && theme === "dark" ? "Light mode" : "Dark mode"}</span>
              )}
            </button>
          </li>
        </ul>

        <button
          type="button"
          onClick={toggleCollapsed}
          className={cn(
            "mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium text-sidebar-foreground/60 transition-colors duration-150 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            collapsed && "justify-center px-0",
          )}
        >
          {collapsed ? (
            <ChevronsRight className="h-[18px] w-[18px]" />
          ) : (
            <>
              <ChevronsLeft className="h-[18px] w-[18px]" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </motion.aside>
  );
}

function SidebarActionItem({
  icon: Icon,
  label,
  collapsed,
}: {
  icon: typeof Settings;
  label: string;
  collapsed: boolean;
}) {
  return (
    <li>
      <button
        type="button"
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium text-sidebar-foreground/80 transition-colors duration-150 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
          collapsed && "justify-center px-0",
        )}
      >
        <Icon className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
        {!collapsed && <span>{label}</span>}
      </button>
    </li>
  );
}
