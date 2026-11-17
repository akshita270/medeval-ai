"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Sparkles } from "lucide-react";
import { ChatMessageItem, TypingIndicator } from "./chat-message";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ChatMessage } from "@/lib/chat-types";
import { askQuestion, ApiError, type GeneratedAnswer } from "@/lib/api";

const suggestedQuestions = [
  "What are the major risk factors for Type 2 diabetes?",
  "How is gestational diabetes diagnosed during pregnancy?",
  "What HbA1c threshold defines prediabetes vs diabetes?",
  "Summarize first-line pharmacologic therapy for T2D.",
];

const initialMessages: ChatMessage[] = [
  {
    id: "msg-welcome",
    role: "assistant",
    content:
      "Ask a question about Type 2 diabetes research and I'll answer it live from the retrieved source documents, with chunk-level citations you can verify on the right.",
  },
];

let idCounter = 100;
function nextId() {
  idCounter += 1;
  return `msg-${idCounter}`;
}

function toChatMessage(answer: GeneratedAnswer): ChatMessage {
  return {
    id: nextId(),
    role: "assistant",
    content: answer.answer,
    blocked: Boolean(answer.blocked_by),
    sources: answer.citation_details.map((c, i) => ({
      id: `${c.chunk_id}-${i}`,
      docId: c.doc_id,
      chunkId: c.chunk_id,
      snippet: c.quote,
    })),
  };
}

export function ChatPanel({ onAnswer }: { onAnswer?: (answer: GeneratedAnswer) => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isTyping]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    const userMessage: ChatMessage = { id: nextId(), role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);
    setLastQuestion(trimmed);

    try {
      const answer = await askQuestion(trimmed);
      setMessages((prev) => [...prev, toChatMessage(answer)]);
      onAnswer?.(answer);
    } catch (err) {
      const detail = err instanceof ApiError ? err.message : "Something went wrong calling the backend.";
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "assistant", content: `⚠️ ${detail}` },
      ]);
    } finally {
      setIsTyping(false);
    }
  }

  async function regenerateLast() {
    if (isTyping || !lastQuestion) return;
    setIsTyping(true);
    try {
      const answer = await askQuestion(lastQuestion);
      setMessages((prev) => [...prev, toChatMessage(answer)]);
      onAnswer?.(answer);
    } catch (err) {
      const detail = err instanceof ApiError ? err.message : "Something went wrong calling the backend.";
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "assistant", content: `⚠️ ${detail}` },
      ]);
    } finally {
      setIsTyping(false);
    }
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card shadow-soft">
      <div className="flex items-center gap-2.5 border-b border-border px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[13.5px] font-semibold">Clinical QA Assistant</p>
          <p className="text-[11.5px] text-muted-foreground">Live MedEval AI backend</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
        <div className="flex flex-col gap-5">
          {messages.map((message, i) => (
            <ChatMessageItem
              key={message.id}
              message={message}
              onRegenerate={i === messages.length - 1 && message.role === "assistant" ? regenerateLast : undefined}
            />
          ))}
          {isTyping && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </div>

      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 border-t border-border px-5 py-3">
          {suggestedQuestions.map((q) => (
            <button
              key={q}
              onClick={() => sendMessage(q)}
              className="rounded-full border border-border bg-background px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2 rounded-xl border border-border bg-background p-2 focus-within:border-ring/50 focus-within:ring-3 focus-within:ring-ring/20">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder="Ask a clinical question..."
            className="min-h-9 flex-1 resize-none border-0 bg-transparent px-2 py-1.5 shadow-none focus-visible:ring-0"
            rows={1}
          />
          <Button
            size="icon"
            className="shrink-0"
            disabled={!input.trim() || isTyping}
            onClick={() => sendMessage(input)}
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-1.5 px-1 text-[10.5px] text-muted-foreground">
          Calls the real backend — set its address above if it&apos;s not on localhost.
        </p>
      </div>
    </div>
  );
}
