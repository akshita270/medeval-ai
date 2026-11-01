"use client";

import {
  ArrowRight,
  Clock,
  Coins,
  DollarSign,
  FileCode2,
  FileText,
  Hash,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  guardrailChecks,
  rerankedChunks,
  responseMetadata,
  retrievedChunks,
} from "@/lib/mock-data";

export function RetrievalInspector() {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card shadow-soft">
      <div className="border-b border-border px-5 py-4">
        <p className="text-[13.5px] font-semibold">Retrieval Inspector</p>
        <p className="text-[11.5px] text-muted-foreground">
          Live trace of the last query&rsquo;s pipeline
        </p>
      </div>

      <Tabs defaultValue="retrieval" className="flex-1 overflow-hidden px-5 py-4">
        <TabsList className="w-full">
          <TabsTrigger value="retrieval">Retrieval</TabsTrigger>
          <TabsTrigger value="reranking">Reranking</TabsTrigger>
          <TabsTrigger value="guardrails">Guardrails</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
        </TabsList>

        <div className="mt-4 h-[calc(100%-44px)] overflow-y-auto scrollbar-thin pr-1">
          <TabsContent value="retrieval">
            <RetrievalTab />
          </TabsContent>
          <TabsContent value="reranking">
            <RerankingTab />
          </TabsContent>
          <TabsContent value="guardrails">
            <GuardrailsTab />
          </TabsContent>
          <TabsContent value="metadata">
            <MetadataTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function RetrievalTab() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2.5">
        <StatusMiniCard label="Dense retrieval" detail="k=20 · cosine" active />
        <StatusMiniCard label="BM25 retrieval" detail="k=20 · sparse" active />
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3.5 py-2.5">
        <div>
          <p className="text-[12.5px] font-medium">Hybrid fusion</p>
          <p className="text-[11px] text-muted-foreground">
            Reciprocal rank fusion · α = 0.6 (dense-weighted)
          </p>
        </div>
        <Badge className="bg-success/10 text-success hover:bg-success/10">Active</Badge>
      </div>

      <div className="flex items-center justify-between text-[12px] text-muted-foreground">
        <span>Top-k configuration</span>
        <span className="font-mono text-foreground">top_k=6, candidates=40</span>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Retrieved chunks
        </p>
        {retrievedChunks.map((chunk) => (
          <div
            key={chunk.id}
            className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5"
          >
            <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium">{chunk.document}</p>
              <p className="text-[11px] text-muted-foreground">
                p.{chunk.page} · {chunk.method}
              </p>
            </div>
            <div className="flex w-20 shrink-0 items-center gap-1.5">
              <Progress value={chunk.score * 100} className="h-1.5" />
              <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                {chunk.score.toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RerankingTab() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3.5 py-2.5">
        <div>
          <p className="text-[12.5px] font-medium">Cross-encoder reranker</p>
          <p className="text-[11px] text-muted-foreground">bge-reranker-v2-m3</p>
        </div>
        <Badge className="bg-success/10 text-success hover:bg-success/10">Active</Badge>
      </div>

      <div className="flex flex-col gap-2">
        {rerankedChunks.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5"
          >
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-muted font-mono text-muted-foreground">
                {item.original}
              </span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 font-mono text-primary">
                {item.reranked}
              </span>
            </div>
            <div className="flex-1">
              <p className="font-mono text-[11.5px] text-foreground">{item.id}</p>
            </div>
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
                item.delta > 0 && "bg-success/10 text-success",
                item.delta < 0 && "bg-muted text-muted-foreground",
                item.delta === 0 && "bg-muted text-muted-foreground",
              )}
            >
              {item.delta > 0 ? `+${item.delta}` : item.delta}
            </span>
            <span className="w-12 shrink-0 text-right font-mono text-[11.5px] tabular-nums text-muted-foreground">
              {item.crossEncoderScore.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GuardrailsTab() {
  return (
    <div className="flex flex-col gap-2.5">
      {guardrailChecks.map((check) => (
        <div
          key={check.id}
          className="flex items-start gap-3 rounded-xl border border-border px-3.5 py-3"
        >
          {check.status === "passed" ? (
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          ) : (
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[12.5px] font-medium">{check.label}</p>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px]",
                  check.status === "passed"
                    ? "border-success/20 bg-success/10 text-success"
                    : "border-warning/20 bg-warning/10 text-warning",
                )}
              >
                {check.status === "passed" ? "Passed" : "Review"}
              </Badge>
            </div>
            <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
              {check.detail}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function MetadataTab() {
  const rows = [
    { icon: FileCode2, label: "Model", value: responseMetadata.model },
    { icon: Hash, label: "Prompt version", value: responseMetadata.promptVersion },
    {
      icon: Coins,
      label: "Input / output tokens",
      value: `${responseMetadata.inputTokens.toLocaleString()} / ${responseMetadata.outputTokens.toLocaleString()}`,
    },
    {
      icon: Clock,
      label: "Retrieval latency",
      value: `${responseMetadata.retrievalLatencyMs} ms`,
    },
    {
      icon: Clock,
      label: "Generation latency",
      value: `${responseMetadata.generationLatencyMs} ms`,
    },
    {
      icon: Clock,
      label: "Total latency",
      value: `${(responseMetadata.totalLatencyMs / 1000).toFixed(2)} s`,
    },
    {
      icon: DollarSign,
      label: "Estimated cost",
      value: `$${responseMetadata.estimatedCostUsd.toFixed(4)}`,
    },
  ];

  return (
    <div className="flex flex-col divide-y divide-border rounded-xl border border-border">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between px-3.5 py-2.5">
          <span className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <row.icon className="h-3.5 w-3.5" />
            {row.label}
          </span>
          <span className="font-mono text-[12px] font-medium">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

function StatusMiniCard({
  label,
  detail,
  active,
}: {
  label: string;
  detail: string;
  active: boolean;
}) {
  return (
    <div className="rounded-xl border border-border px-3 py-2.5">
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            active ? "bg-success" : "bg-muted-foreground",
          )}
        />
        <p className="text-[12px] font-medium">{label}</p>
      </div>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{detail}</p>
    </div>
  );
}
