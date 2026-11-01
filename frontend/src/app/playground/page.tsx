import { SectionHeader } from "@/components/shared/section-header";
import { ChatPanel } from "@/components/playground/chat-panel";
import { RetrievalInspector } from "@/components/playground/retrieval-inspector";

export default function PlaygroundPage() {
  return (
    <div className="flex h-[calc(100vh-7.5rem)] flex-col gap-6">
      <SectionHeader
        title="RAG Playground"
        subtitle="Chat against the clinical knowledge base and inspect every stage of the retrieval pipeline."
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[65%_1fr]">
        <div className="min-h-[520px]">
          <ChatPanel />
        </div>
        <div className="min-h-[520px]">
          <RetrievalInspector />
        </div>
      </div>
    </div>
  );
}
