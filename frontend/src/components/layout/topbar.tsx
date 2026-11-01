"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, Bell, ChevronRight, Sparkles } from "lucide-react";
import { navItems } from "./nav-items";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const notifications = [
  {
    id: "n1",
    title: "Quality gate passed",
    detail: "run-2048 cleared all thresholds and deployed to production.",
    time: "12m ago",
  },
  {
    id: "n2",
    title: "Regression detected",
    detail: "exp-06 showed a 0.9% faithfulness drop vs baseline.",
    time: "3h ago",
  },
  {
    id: "n3",
    title: "New golden dataset",
    detail: "Medication Safety Set v3 added (150 examples).",
    time: "1d ago",
  },
];

export function Topbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const current =
    navItems.find((item) =>
      item.href === "/" ? pathname === "/" : pathname.startsWith(item.href),
    ) ?? navItems[0];

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6">
      {/* Mobile nav trigger */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger render={<Button variant="ghost" size="icon" className="lg:hidden" />}>
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <div className="flex h-16 items-center gap-2.5 border-b border-border px-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[15px] font-semibold leading-tight">MedEval AI</p>
              <p className="text-[11px] leading-tight text-muted-foreground">
                AI Quality Engineering Platform
              </p>
            </div>
          </div>
          <nav className="flex flex-col gap-1 p-3">
            {navItems.map((item) => {
              const active =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium transition-colors",
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-foreground/80 hover:bg-accent/60",
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>

      {/* Breadcrumbs / title */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="hidden min-w-0 items-center gap-1.5 text-[13px] text-muted-foreground sm:flex">
          <span>MedEval AI</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="truncate font-medium text-foreground">{current.label}</span>
        </div>
        <span className="sm:hidden truncate text-[15px] font-semibold">
          {current.label}
        </span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 sm:gap-3">
        <Badge
          variant="outline"
          className="hidden items-center gap-1.5 border-border text-[11px] font-medium text-muted-foreground sm:flex"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Staging
        </Badge>

        <Badge
          variant="outline"
          className="hidden items-center gap-1.5 border-teal/30 bg-teal/10 text-[11px] font-medium text-teal sm:flex"
        >
          Demo data
        </Badge>

        <Badge
          variant="outline"
          className="hidden items-center gap-1.5 border-border text-[11px] font-medium text-success sm:flex"
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
          All systems operational
        </Badge>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon" className="relative" />}
          >
            <Bell className="h-[18px] w-[18px]" />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-destructive" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.map((n) => (
              <DropdownMenuItem key={n.id} className="flex-col items-start gap-0.5 py-2.5">
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="text-[13px] font-medium">{n.title}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{n.time}</span>
                </div>
                <span className="text-[12px] leading-snug text-muted-foreground">
                  {n.detail}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button className="flex items-center gap-2 rounded-full outline-none ring-offset-background transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring" />
            }
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-[12px] font-semibold text-primary">
                AJ
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="text-[13px] font-medium">Akshita Jain</p>
              <p className="text-[11px] font-normal text-muted-foreground">
                AI Quality Engineer
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Account settings</DropdownMenuItem>
            <DropdownMenuItem>API keys</DropdownMenuItem>
            <DropdownMenuItem>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
