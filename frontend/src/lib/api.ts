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
