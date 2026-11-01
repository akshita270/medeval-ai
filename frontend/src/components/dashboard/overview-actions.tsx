"use client";

import { useState } from "react";
import { CalendarRange, Check, FileDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ranges = ["Last 7 days", "Last 14 days", "Last 30 days", "Quarter to date"];

export function OverviewActions() {
  const [range, setRange] = useState(ranges[0]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" size="sm" className="gap-2" />}
        >
          <CalendarRange className="h-3.5 w-3.5" />
          {range}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {ranges.map((r) => (
            <DropdownMenuItem key={r} onClick={() => setRange(r)} className="justify-between">
              {r}
              {r === range && <Check className="h-3.5 w-3.5" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        size="sm"
        className="gap-2"
        onClick={() =>
          toast.success("Report generated", {
            description: `AI quality report for ${range.toLowerCase()} is ready to download.`,
          })
        }
      >
        <FileDown className="h-3.5 w-3.5" />
        Generate report
      </Button>
    </div>
  );
}
