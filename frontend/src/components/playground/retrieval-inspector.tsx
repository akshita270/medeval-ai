"use client";

import { FileCode2, FileText, Hash, Layers, ShieldAlert, ShieldCheck, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { GeneratedAnswer } from "@/lib/api";

export function RetrievalInspector({ answer }: { answer: GeneratedAnswer | null }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card shadow-soft">
      <div className="border-b border-border px-5 py-4">
        <p className="text-[13.5px] font-semibold">Retrieval Inspector</p>
        <p className="text-[11.5px] text-muted-foreground">
          {answer ? "Live trace of the last query's pipeline" : "Ask a question to see the real pipeline trace"}
        </p>
      </div>

      {!answer ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <Sparkles className="h-5 w-5 text-muted-foreground" />
          <p className="text-[12px] text-muted-foreground">
            Nothing to inspect yet — send a question in the chat and the chunks it actually retrieved,
            whether guardrails passed, and the real model/token usage will show up here.
          </p>
        </div>
      ) : (
        <Tabs defaultValue="retrieval" className="flex-1 overflow-hidden px-5 py-4">
          <TabsList className="w-full">
            <TabsTrigger value="retrieval">Retrieval</TabsTrigger>
            <TabsTrigger value="strategy">Strategy</TabsTrigger>
            <TabsTrigger value="guardrails">Guardrails</TabsTrigger>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
          </TabsList>

          <div className="mt-4 h-[calc(100%-44px)] overflow-y-auto scrollbar-thin pr-1">
            <TabsContent value="retrieval">
              <RetrievalTab answer={answer} />
            </TabsContent>
            <TabsContent value="strategy">
              <StrategyTab answer={answer} />
            </TabsContent>
            <TabsContent value="guardrails">
              <GuardrailsTab answer={answer} />
            </TabsContent>
            <TabsContent value="metadata">
              <MetadataTab answer={answer} />
            </TabsContent>
          </div>
        </Tabs>
      )}
    </div>
  );
}

function RetrievalTab({ answer }: { answer: GeneratedAnswer }) {
  const passages = [...answer.retrieved_passages].sort((a, b) => b.similarity_score - a.similarity_score);
  const maxScore = Math.max(...passages.map((p) => p.similarity_score), 1);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-[12px] text-muted-foreground">
        <span>Chunks retrieved for this question</span>
        <span className="font-mono text-foreground">
          {passages.length} / top_k={answer.config.retrieval_top_k}
        </span>
      </div>

      {passages.length === 0 ? (
        <p className="text-[12px] text-muted-foreground">No passages were retrieved for this query.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {passages.map((chunk) => (
            <div key={chunk.chunk_id} className="flex flex-col gap-1.5 rounded-xl border border-border px-3 py-2.5">
              <div className="flex items-center gap-3">
                <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-medium">{chunk.doc_id}</p>
                  <p className="font-mono text-[10.5px] text-muted-foreground">{chunk.chunk_id}</p>
                </div>
                <div className="flex w-20 shrink-0 items-center gap-1.5">
                  <Progress value={(chunk.similarity_score / maxScore) * 100} className="h-1.5" />
                  <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                    {chunk.similarity_score.toFixed(2)}
                  </span>
                </div>
              </div>
              <p className="line-clamp-2 pl-6 text-[11.5px] text-muted-foreground">{chunk.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StrategyTab({ answer }: { answer: GeneratedAnswer }) {
  const { config } = answer;
  return (
    <div className="flex flex-col gap-3">
      <StrategyRow label="Hybrid retrieval (dense + BM25)" active={config.use_hybrid_retrieval} />
      <StrategyRow label="Cross-encoder reranking" active={config.use_reranking} />
      <div className="rounded-xl border border-border bg-muted/40 px-3.5 py-2.5">
        <p className="text-[11px] text-muted-foreground">
          These are the actual settings this answer was generated with — toggled in the backend&apos;s config, not
          hardcoded here. The API doesn&apos;t currently return a before/after rank breakdown per chunk, so this tab
          shows strategy status rather than a fabricated reorder table.
        </p>
      </div>
    </div>
  );
}

function StrategyRow({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3.5 py-2.5">
      <div className="flex items-center gap-2">
        <Layers className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-[12.5px] font-medium">{label}</p>
      </div>
      <Badge
        className={cn(
          active
            ? "bg-success/10 text-success hover:bg-success/10"
            : "bg-muted text-muted-foreground hover:bg-muted",
        )}
      >
        {active ? "Enabled" : "Disabled"}
      </Badge>
    </div>
  );
}

function GuardrailsTab({ answer }: { answer: GeneratedAnswer }) {
  if (!answer.blocked_by) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-border px-3.5 py-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
        <div>
          <p className="text-[12.5px] font-medium">All guardrail checks passed</p>
          <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
            Input and output checks (prompt injection, patient-identifier blocking, citation grounding, and more)
            ran against this request and didn&rsquo;t flag anything.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-start gap-3 rounded-xl border border-warning/20 bg-warning/5 px-3.5 py-3">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <div>
          <p className="text-[12.5px] font-medium">Request was blocked</p>
          <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
            The answer shown in the chat is the guardrail&rsquo;s own message, not a generated response.
          </p>
        </div>
      </div>
      {answer.blocked_by.map((reason) => (
        <Badge key={reason} variant="outline" className="w-fit border-warning/20 bg-warning/10 text-warning">
          {reason}
        </Badge>
      ))}
    </div>
  );
}

function MetadataTab({ answer }: { answer: GeneratedAnswer }) {
  const { config } = answer;
  const rows = [
    { icon: FileCode2, label: "Model used", value: config.llm_model },
    { icon: Hash, label: "Prompt version", value: config.prompt_version },
    { icon: Hash, label: "Chunk size / overlap", value: `${config.chunk_size} / ${config.chunk_overlap}` },
    {
      icon: Hash,
      label: "Input / output tokens",
      value:
        answer.total_tokens === 0
          ? "0 / 0 (cache hit)"
          : `${answer.prompt_tokens.toLocaleString()} / ${answer.completion_tokens.toLocaleString()}`,
    },
    { icon: Hash, label: "Total tokens", value: answer.total_tokens.toLocaleString() },
  ];

  return (
    <div className="flex flex-col gap-3">
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
      <p className="text-[10.5px] text-muted-foreground">
        A total of 0 tokens means this exact question/config was served from the response cache, not
        regenerated — see app/llm_cache.py.
      </p>
    </div>
  );
}
