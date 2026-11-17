"use client";

import { useEffect, useState } from "react";
import { Loader2, Wifi, WifiOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { checkHealth, getApiBaseUrl, setApiBaseUrl } from "@/lib/api";

type Status = "checking" | "online" | "offline";

export function ApiEndpointBar() {
  const [url, setUrl] = useState<string>(() => getApiBaseUrl());
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      checkHealth(url).then((ok) => {
        if (!cancelled) setStatus(ok ? "online" : "offline");
      });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [url]);

  function handleChange(value: string) {
    setUrl(value);
    setApiBaseUrl(value);
    setStatus("checking");
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-soft">
      {status === "checking" && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />}
      {status === "online" && <Wifi className="h-3.5 w-3.5 shrink-0 text-success" />}
      {status === "offline" && <WifiOff className="h-3.5 w-3.5 shrink-0 text-destructive" />}
      <span className="whitespace-nowrap text-[11px] text-muted-foreground">
        {status === "online" ? "Live backend" : status === "offline" ? "Unreachable" : "Checking…"}
      </span>
      <Input
        value={url}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="http://<server-ip>:8000"
        className="h-7 w-56 font-mono text-[11px]"
      />
    </div>
  );
}
