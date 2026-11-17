"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "framer-motion";
import { Check, Copy, FileText, RotateCcw, Sparkles, User } from "lucide-react";
import { toast } from "sonner";
import type { ChatMessage as ChatMessageType } from "@/lib/chat-types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ChatMessageItem({
  message,
  onRegenerate,
}: {
  message: ChatMessageType;
  onRegenerate?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  function handleCopy() {
    navigator.clipboard?.writeText(message.content).catch(() => {});
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className={cn("flex gap-3", isUser && "flex-row-reverse")}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground",
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      </div>

      <div className={cn("flex max-w-[82%] flex-col gap-2", isUser && "items-end")}>
        {!isUser && message.blocked && (
          <span className="rounded-full border border-warning/20 bg-warning/10 px-2 py-0.5 text-[10.5px] font-medium text-warning">
            Blocked by guardrails
          </span>
        )}
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-card shadow-soft",
          )}
        >
          {isUser ? (
            <p>{message.content}</p>
          ) : (
            <div className="prose-chat">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-muted/40 p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Sources
            </p>
            <div className="flex flex-col gap-1.5">
              {message.sources.map((source, i) => (
                <div key={source.id} className="flex items-start gap-2 text-[12px]">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">&ldquo;{source.snippet}&rdquo;</p>
                    <p className="flex items-center gap-1 text-muted-foreground">
                      <FileText className="h-3 w-3 shrink-0" />
                      {source.docId} · {source.chunkId}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isUser && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" onClick={handleCopy}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={onRegenerate}>
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="flex items-center gap-1 rounded-2xl border border-border bg-card px-4 py-3.5 shadow-soft">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </div>
  );
}
