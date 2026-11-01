"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Sparkles } from "lucide-react";
import { ChatMessageItem, TypingIndicator } from "./chat-message";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  sampleChat,
  sampleSources,
  suggestedQuestions,
  type ChatMessage,
} from "@/lib/mock-data";

let idCounter = 100;
function nextId() {
  idCounter += 1;
  return `msg-${idCounter}`;
}

const fallbackAnswer =
  "This is a portfolio demo of MedEval AI, so live generation isn't wired up — every response here is pre-scripted. In a real deployment this answer would be produced by the RAG pipeline shown in the Retrieval Inspector, grounded in the retrieved clinical sources on the right.";

export function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>(sampleChat);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isTyping]);

  function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    const userMessage: ChatMessage = { id: nextId(), role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: nextId(),
        role: "assistant",
        content: fallbackAnswer,
        sources: sampleSources.slice(0, 2),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1300);
  }

  function regenerateLast() {
    if (isTyping) return;
    setIsTyping(true);
    setTimeout(() => {
      setMessages((prev) => {
        const next = [...prev];
        const lastIdx = next.length - 1;
        if (lastIdx >= 0 && next[lastIdx].role === "assistant") {
          next[lastIdx] = { ...next[lastIdx], id: nextId() };
        }
        return next;
      });
      setIsTyping(false);
    }, 900);
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card shadow-soft">
      <div className="flex items-center gap-2.5 border-b border-border px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[13.5px] font-semibold">Clinical QA Assistant</p>
          <p className="text-[11.5px] text-muted-foreground">
            gpt-4o-2026-08-01 · Hybrid retrieval + reranking
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
        <div className="flex flex-col gap-5">
          {messages.map((message, i) => (
            <ChatMessageItem
              key={message.id}
              message={message}
              onRegenerate={i === messages.length - 1 ? regenerateLast : undefined}
            />
          ))}
          {isTyping && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </div>

      {messages.length <= 2 && (
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
          Demo data only — responses are scripted, not generated live.
        </p>
      </div>
    </div>
  );
}
