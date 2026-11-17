"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/status-badge";
import type { EvalResult } from "@/lib/api";
import { metricScore, resultStatus } from "@/lib/eval-helpers";
import { cn } from "@/lib/utils";

type SortKey = "answer_correctness" | "faithfulness";

const PAGE_SIZE = 4;

export function ResultsTable({
  results,
  onSelectRow,
}: {
  results: EvalResult[];
  onSelectRow: (row: EvalResult) => void;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "passed" | "failed">("all");
  const [sortKey, setSortKey] = useState<SortKey>("answer_correctness");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let rows = results;
    if (status !== "all") rows = rows.filter((r) => resultStatus(r) === status);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((r) => r.question.toLowerCase().includes(q));
    }
    rows = [...rows].sort((a, b) => {
      const av = metricScore(a, sortKey) ?? 0;
      const bv = metricScore(b, sortKey) ?? 0;
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return rows;
  }, [results, search, status, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search questions..."
            className="pl-8"
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => {
            if (!v) return;
            setStatus(v as typeof status);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue>
              {(value: string) => ({ all: "All statuses", passed: "Passed", failed: "Failed" })[value] ?? value}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="passed">Passed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Question</TableHead>
              <TableHead>
                <button onClick={() => toggleSort("answer_correctness")} className="flex items-center gap-1 hover:text-foreground">
                  Correctness <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead>
                <button onClick={() => toggleSort("faithfulness")} className="flex items-center gap-1 hover:text-foreground">
                  Faithfulness <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  No results match your filters.
                </TableCell>
              </TableRow>
            )}
            {paged.map((row) => {
              const correctness = metricScore(row, "answer_correctness");
              const faithfulness = metricScore(row, "faithfulness");
              return (
                <TableRow key={row.question_id} onClick={() => onSelectRow(row)} className="cursor-pointer">
                  <TableCell className="max-w-xs truncate text-[13px] font-medium">{row.question}</TableCell>
                  <TableCell
                    className={cn(
                      "font-mono text-[12.5px] tabular-nums",
                      correctness != null && correctness < 0.7 && "text-destructive",
                    )}
                  >
                    {correctness != null ? `${(correctness * 100).toFixed(1)}%` : "--"}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "font-mono text-[12.5px] tabular-nums",
                      faithfulness != null && faithfulness < 0.7 && "text-destructive",
                    )}
                  >
                    {faithfulness != null ? `${(faithfulness * 100).toFixed(1)}%` : "--"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={resultStatus(row)} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-[12px] text-muted-foreground">
        <span>
          Showing {paged.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–
          {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
        </span>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="icon-sm" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="px-1.5">
            Page {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
