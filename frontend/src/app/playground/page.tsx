"use client";

import { useState } from "react";
import { SectionHeader } from "@/components/shared/section-header";
import { ChatPanel } from "@/components/playground/chat-panel";
import { RetrievalInspector } from "@/components/playground/retrieval-inspector";
import { ApiEndpointBar } from "@/components/playground/api-endpoint-bar";
import type { GeneratedAnswer } from "@/lib/api";

export default function PlaygroundPage() {
  const [latestAnswer, setLatestAnswer] = useState<GeneratedAnswer | null>(null);

  return (
    <div className="flex h-[calc(100vh-7.5rem)] flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionHeader
          title="RAG Playground"
          subtitle="Chat against the clinical knowledge base and inspect every stage of the retrieval pipeline."
        />
        <ApiEndpointBar />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[65%_1fr]">
        <div className="min-h-[520px]">
          <ChatPanel onAnswer={setLatestAnswer} />
        </div>
        <div className="min-h-[520px]">
          <RetrievalInspector answer={latestAnswer} />
        </div>
      </div>
    </div>
  );
}
