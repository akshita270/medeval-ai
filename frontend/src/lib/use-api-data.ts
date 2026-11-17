"use client";

import { useEffect, useState } from "react";
import {
  ApiError,
  type CiJob,
  type CiRun,
  type DailyStat,
  type EvalRunDetail,
  type EvalRunSummary,
  type GuardrailEventCount,
  type LatencyBreakdown,
  type StatsOverview,
  getCiRunJobs,
  getDailyStats,
  getEvalRun,
  getGuardrailEvents,
  getLatencyBreakdown,
  getStatsOverview,
  listCiRuns,
  listEvalRuns,
} from "./api";

export type AsyncState<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: T };

function errorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : "Something went wrong loading real data from the backend.";
}

// Resets `state` to "loading" when `param` changes, so switching e.g. a
// selected run id shows a loading state immediately instead of stale
// data from the previous param. Done at render time (React's documented
// pattern for "resetting state when a prop changes"), not inside the
// fetch effect, so there's no synchronous setState in an effect body.
function useParamResettableState<P, T>(param: P): [AsyncState<T>, (s: AsyncState<T>) => void] {
  const [prevParam, setPrevParam] = useState(param);
  const [state, setState] = useState<AsyncState<T>>({ status: "loading" });
  if (param !== prevParam) {
    setPrevParam(param);
    setState({ status: "loading" });
  }
  return [state, setState];
}

export function useStatsOverview(): AsyncState<StatsOverview> {
  const [state, setState] = useState<AsyncState<StatsOverview>>({ status: "loading" });
  useEffect(() => {
    let cancelled = false;
    getStatsOverview()
      .then((data) => !cancelled && setState({ status: "ready", data }))
      .catch((err) => !cancelled && setState({ status: "error", message: errorMessage(err) }));
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}

export function useDailyStats(days: number): AsyncState<DailyStat[]> {
  const [state, setState] = useParamResettableState<number, DailyStat[]>(days);
  useEffect(() => {
    let cancelled = false;
    getDailyStats(days)
      .then((data) => !cancelled && setState({ status: "ready", data }))
      .catch((err) => !cancelled && setState({ status: "error", message: errorMessage(err) }));
    return () => {
      cancelled = true;
    };
  }, [days, setState]);
  return state;
}

export function useEvalRuns(): AsyncState<EvalRunSummary[]> {
  const [state, setState] = useState<AsyncState<EvalRunSummary[]>>({ status: "loading" });
  useEffect(() => {
    let cancelled = false;
    listEvalRuns()
      .then((data) => !cancelled && setState({ status: "ready", data }))
      .catch((err) => !cancelled && setState({ status: "error", message: errorMessage(err) }));
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}

export function useEvalRunDetail(runId: string | null): AsyncState<EvalRunDetail> {
  const [state, setState] = useParamResettableState<string | null, EvalRunDetail>(runId);
  useEffect(() => {
    if (!runId) return;
    let cancelled = false;
    getEvalRun(runId)
      .then((data) => !cancelled && setState({ status: "ready", data }))
      .catch((err) => !cancelled && setState({ status: "error", message: errorMessage(err) }));
    return () => {
      cancelled = true;
    };
  }, [runId, setState]);
  return state;
}

export function useGuardrailEvents(): AsyncState<GuardrailEventCount[]> {
  const [state, setState] = useState<AsyncState<GuardrailEventCount[]>>({ status: "loading" });
  useEffect(() => {
    let cancelled = false;
    getGuardrailEvents()
      .then((data) => !cancelled && setState({ status: "ready", data }))
      .catch((err) => !cancelled && setState({ status: "error", message: errorMessage(err) }));
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}

export function useLatencyBreakdown(): AsyncState<LatencyBreakdown> {
  const [state, setState] = useState<AsyncState<LatencyBreakdown>>({ status: "loading" });
  useEffect(() => {
    let cancelled = false;
    getLatencyBreakdown()
      .then((data) => !cancelled && setState({ status: "ready", data }))
      .catch((err) => !cancelled && setState({ status: "error", message: errorMessage(err) }));
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}

export function useCiRunJobs(runId: number | null): AsyncState<CiJob[]> {
  const [state, setState] = useParamResettableState<number | null, CiJob[]>(runId);
  useEffect(() => {
    if (runId == null) return;
    let cancelled = false;
    getCiRunJobs(runId)
      .then((data) => !cancelled && setState({ status: "ready", data }))
      .catch((err) => !cancelled && setState({ status: "error", message: errorMessage(err) }));
    return () => {
      cancelled = true;
    };
  }, [runId, setState]);
  return state;
}

export function useCiRuns(): AsyncState<CiRun[]> {
  const [state, setState] = useState<AsyncState<CiRun[]>>({ status: "loading" });
  useEffect(() => {
    let cancelled = false;
    listCiRuns()
      .then((data) => !cancelled && setState({ status: "ready", data }))
      .catch((err) => !cancelled && setState({ status: "error", message: errorMessage(err) }));
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}
