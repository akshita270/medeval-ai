// Thin client for the real MedEval AI backend (see app/main.py / app/schemas.py).
// The backend's address isn't fixed: it's an AWS server that gets stopped and
// restarted (a fresh public IP each time) to keep costs near zero, so the base
// URL is user-editable at runtime and persisted in this browser only.

export interface CitationDetail {
  doc_id: string;
  chunk_id: string;
  quote: string;
}

export interface RetrievedPassage {
  chunk_id: string;
  doc_id: string;
  chunk_index: number;
  text: string;
  similarity_score: number;
}

export interface GenerationConfig {
  llm_model: string;
  embedding_model: string;
  prompt_version: string;
  chunk_size: number;
  chunk_overlap: number;
  retrieval_top_k: number;
  use_hybrid_retrieval: boolean;
  use_reranking: boolean;
}

export interface GeneratedAnswer {
  query: string;
  answer: string;
  citations: string[];
  citation_details: CitationDetail[];
  retrieved_passages: RetrievedPassage[];
  config: GenerationConfig;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  blocked_by: string[] | null;
}

const DEFAULT_API_BASE_URL = "http://localhost:8000";
const STORAGE_KEY = "medeval-api-base-url";

export function getApiBaseUrl(): string {
  if (typeof window === "undefined") return DEFAULT_API_BASE_URL;
  try {
    return window.localStorage.getItem(STORAGE_KEY) || DEFAULT_API_BASE_URL;
  } catch {
    return DEFAULT_API_BASE_URL;
  }
}

export function setApiBaseUrl(url: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, url);
  } catch {
    // Private browsing / blocked storage -- the URL just won't persist.
  }
}

export class ApiError extends Error {}

function normalizedBase(baseUrl?: string): string {
  return (baseUrl ?? getApiBaseUrl()).trim().replace(/\/+$/, "");
}

export async function askQuestion(question: string, baseUrl?: string): Promise<GeneratedAnswer> {
  const base = normalizedBase(baseUrl);
  let res: Response;
  try {
    res = await fetch(`${base}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
  } catch {
    throw new ApiError(`Couldn't reach the backend at ${base}. Is the server running?`);
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new ApiError(`Backend returned ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`);
  }
  return res.json();
}

export async function checkHealth(baseUrl?: string): Promise<boolean> {
  const base = normalizedBase(baseUrl);
  try {
    const res = await fetch(`${base}/health`, { signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function getJson<T>(path: string, baseUrl?: string): Promise<T> {
  const base = normalizedBase(baseUrl);
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(15000) });
  } catch {
    throw new ApiError(`Couldn't reach the backend at ${base}. Is the server running?`);
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new ApiError(`Backend returned ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`);
  }
  return res.json();
}

// --- Dashboard / Monitoring: real traffic stats, logged by every /ask call ---

export interface StatsOverview {
  total_requests: number;
  blocked_requests: number;
  avg_latency_ms: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_cost_usd: number;
}

export interface DailyStat {
  date: string;
  requests: number;
  blocked: number;
  avg_latency_ms: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
}

export interface GuardrailEventCount {
  category: string;
  count: number;
}

export function getStatsOverview(baseUrl?: string): Promise<StatsOverview> {
  return getJson<StatsOverview>("/stats/overview", baseUrl);
}

export function getDailyStats(days = 14, baseUrl?: string): Promise<DailyStat[]> {
  return getJson<DailyStat[]>(`/stats/daily?days=${days}`, baseUrl);
}

export function getGuardrailEvents(baseUrl?: string): Promise<GuardrailEventCount[]> {
  return getJson<GuardrailEventCount[]>("/stats/guardrail-events", baseUrl);
}

// --- Evaluation Lab / Experiments: real past evaluation runs ---

export interface MetricSummary {
  metric: string;
  mean_score: number;
  count: number;
}

export interface EvalRunSummary {
  run_id: string;
  label: string;
  is_baseline: boolean;
  total_questions: number;
  overall_score: number;
  metric_summaries: MetricSummary[];
  total_cost_usd: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_generation_latency_seconds: number | null;
  generation_model: string;
  generated_at: number;
}

export interface MetricScore {
  metric: string;
  score: number;
  reasoning: string;
  is_llm_judged: boolean;
}

export interface EvalResult {
  question_id: string;
  question: string;
  expected_answer: string;
  metric_scores: MetricScore[];
  failed_metrics: Record<string, string>;
  judge_latency_seconds: number;
  generation_latency_seconds: number | null;
  prompt_tokens: number;
  completion_tokens: number;
  estimated_cost_usd: number;
  generation_model: string;
}

export interface EvalRunDetail {
  dataset_version: string;
  total_questions: number;
  metric_summaries: MetricSummary[];
  total_failed_metric_calls: number;
  total_cost_usd: number;
  total_judge_latency_seconds: number;
  total_generation_latency_seconds: number | null;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  results: EvalResult[];
}

export function listEvalRuns(baseUrl?: string): Promise<EvalRunSummary[]> {
  return getJson<EvalRunSummary[]>("/evaluation/runs", baseUrl);
}

export function getEvalRun(runId: string, baseUrl?: string): Promise<EvalRunDetail> {
  return getJson<EvalRunDetail>(`/evaluation/runs/${encodeURIComponent(runId)}`, baseUrl);
}

// --- Pipeline: real GitHub Actions run history ---

export interface CiRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  branch: string;
  commit_sha: string;
  commit_message: string;
  triggered_by: string;
  run_number: number;
  event: string;
  created_at: string;
  updated_at: string;
  html_url: string;
}

export interface CiJobStep {
  name: string;
  status: string;
  conclusion: string | null;
}

export interface CiJob {
  name: string;
  status: string;
  conclusion: string | null;
  started_at: string | null;
  completed_at: string | null;
  steps: CiJobStep[];
}

export function listCiRuns(baseUrl?: string): Promise<CiRun[]> {
  return getJson<CiRun[]>("/pipeline/runs", baseUrl);
}

export function getCiRunJobs(runId: number, baseUrl?: string): Promise<CiJob[]> {
  return getJson<CiJob[]>(`/pipeline/runs/${runId}/jobs`, baseUrl);
}
