"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import type { AsyncState } from "@/lib/use-api-data";

export function AsyncBoundary<T>({
  state,
  children,
}: {
  state: AsyncState<T>;
  children: (data: T) => ReactNode;
}) {
  if (state.status === "loading") {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-[12.5px] text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading real data from the backend…
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="flex flex-col items-center justify-center gap-1 py-12 text-center">
        <p className="text-[12.5px] font-medium text-destructive">Couldn&apos;t load this</p>
        <p className="max-w-sm text-[11.5px] text-muted-foreground">{state.message}</p>
      </div>
    );
  }
  return <>{children(state.data)}</>;
}
