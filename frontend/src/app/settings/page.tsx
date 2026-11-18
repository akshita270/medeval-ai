"use client";

import { useEffect, useState } from "react";
import { Loader2, Wifi, WifiOff } from "lucide-react";
import { SectionHeader } from "@/components/shared/section-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkHealth, getApiBaseUrl, getApiKey, setApiBaseUrl, setApiKey } from "@/lib/api";

type Status = "checking" | "online" | "offline";

export default function SettingsPage() {
  const [baseUrl, setBaseUrl] = useState<string>(() => getApiBaseUrl());
  const [apiKey, setApiKeyState] = useState<string>(() => getApiKey());
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    let cancelled = false;
    const checkingTimer = setTimeout(() => {
      if (!cancelled) setStatus("checking");
    }, 0);
    const timer = setTimeout(() => {
      checkHealth(baseUrl).then((ok) => {
        if (!cancelled) setStatus(ok ? "online" : "offline");
      });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(checkingTimer);
      clearTimeout(timer);
    };
  }, [baseUrl]);

  function handleBaseUrlChange(value: string) {
    setBaseUrl(value);
    setApiBaseUrl(value);
  }

  function handleApiKeyChange(value: string) {
    setApiKeyState(value);
    setApiKey(value);
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Settings"
        subtitle="Where this browser points for every page -- the Playground, Dashboard, and Monitoring all read from the same backend address."
      />

      <div className="max-w-xl rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h2 className="text-[14px] font-semibold text-foreground">Backend connection</h2>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          The real MedEval AI API this app talks to. Saved only in this browser (localStorage) --
          never sent anywhere else.
        </p>

        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="backend-url" className="text-[12.5px]">
              Backend address
            </Label>
            <Input
              id="backend-url"
              value={baseUrl}
              onChange={(e) => handleBaseUrlChange(e.target.value)}
              placeholder="http://<server-ip>:8000"
              className="font-mono text-[12.5px]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="backend-api-key" className="text-[12.5px]">
              API key
            </Label>
            <Input
              id="backend-api-key"
              type="password"
              value={apiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
              placeholder="Only needed if the server sets API_KEY"
              className="font-mono text-[12.5px]"
            />
            <p className="text-[11.5px] text-muted-foreground">
              Sent as the <code className="rounded bg-muted px-1 py-0.5">X-API-Key</code> header
              on every /ask call. Leave blank for a server with no API_KEY set.
            </p>
          </div>

          <div className="flex items-center gap-2 border-t border-border pt-4 text-[12.5px]">
            {status === "checking" && (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
            )}
            {status === "online" && <Wifi className="h-3.5 w-3.5 shrink-0 text-success" />}
            {status === "offline" && <WifiOff className="h-3.5 w-3.5 shrink-0 text-destructive" />}
            <span className="text-muted-foreground">
              {status === "online" && "Connected -- this backend is reachable."}
              {status === "offline" && "Unreachable at this address."}
              {status === "checking" && "Checking connection..."}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
