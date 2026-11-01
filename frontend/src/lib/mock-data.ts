// ---------------------------------------------------------------------------
// MedEval AI — mock/demo data only. Nothing in this file is connected to a
// real backend, model, or database. Shapes mirror what a real RAG evaluation
// platform would expose so the UI reads as production-grade.
// ---------------------------------------------------------------------------

export type TrendDirection = "up" | "down" | "flat";

export interface Kpi {
  id: string;
  label: string;
  value: string;
  rawValue: number;
  unit?: string;
  format?: "compact" | "currency";
  trend: TrendDirection;
  trendValue: string;
  comparison: string;
  icon: string;
  goodDirection: "up" | "down";
}

export const overviewKpis: Kpi[] = [
  {
    id: "correctness",
    label: "Answer Correctness",
    value: "94.2",
    rawValue: 94.2,
    unit: "%",
    trend: "up",
    trendValue: "+1.8%",
    comparison: "vs last 7 days",
    icon: "Target",
    goodDirection: "up",
  },
  {
    id: "faithfulness",
    label: "Faithfulness",
    value: "97.1",
    rawValue: 97.1,
    unit: "%",
    trend: "up",
    trendValue: "+0.6%",
    comparison: "vs last 7 days",
    icon: "ShieldCheck",
    goodDirection: "up",
  },
  {
    id: "context-recall",
    label: "Context Recall",
    value: "91.8",
    rawValue: 91.8,
    unit: "%",
    trend: "down",
    trendValue: "-0.9%",
    comparison: "vs last 7 days",
    icon: "Layers",
    goodDirection: "up",
  },
  {
    id: "pass-rate",
    label: "Evaluation Pass Rate",
    value: "96",
    rawValue: 96,
    unit: "%",
    trend: "up",
    trendValue: "+2.1%",
    comparison: "vs last 7 days",
    icon: "CheckCircle2",
    goodDirection: "up",
  },
  {
    id: "latency",
    label: "Average Latency",
    value: "1.8",
    rawValue: 1.8,
    unit: "s",
    trend: "down",
    trendValue: "-0.2s",
    comparison: "vs last 7 days",
    icon: "Gauge",
    goodDirection: "down",
  },
  {
    id: "runs",
    label: "Total Evaluation Runs",
    value: "128",
    rawValue: 128,
    trend: "up",
    trendValue: "+14",
    comparison: "vs last 7 days",
    icon: "FlaskConical",
    goodDirection: "up",
  },
];

export const performanceOverTime = [
  { date: "Sep 24", correctness: 89.1, faithfulness: 93.8, contextRecall: 86.4 },
  { date: "Sep 26", correctness: 90.0, faithfulness: 94.5, contextRecall: 87.1 },
  { date: "Sep 28", correctness: 90.8, faithfulness: 95.0, contextRecall: 88.0 },
  { date: "Sep 30", correctness: 91.4, faithfulness: 95.3, contextRecall: 88.9 },
  { date: "Oct 02", correctness: 90.9, faithfulness: 95.8, contextRecall: 89.2 },
  { date: "Oct 04", correctness: 92.1, faithfulness: 96.0, contextRecall: 89.8 },
  { date: "Oct 06", correctness: 92.6, faithfulness: 96.3, contextRecall: 90.1 },
  { date: "Oct 08", correctness: 92.3, faithfulness: 96.1, contextRecall: 90.6 },
  { date: "Oct 10", correctness: 93.0, faithfulness: 96.5, contextRecall: 90.9 },
  { date: "Oct 12", correctness: 93.4, faithfulness: 96.7, contextRecall: 91.2 },
  { date: "Oct 14", correctness: 93.1, faithfulness: 96.6, contextRecall: 91.0 },
  { date: "Oct 16", correctness: 93.8, faithfulness: 96.9, contextRecall: 91.4 },
  { date: "Oct 18", correctness: 94.0, faithfulness: 97.0, contextRecall: 91.6 },
  { date: "Oct 20", correctness: 93.6, faithfulness: 96.8, contextRecall: 91.1 },
  { date: "Oct 22", correctness: 94.0, faithfulness: 96.9, contextRecall: 91.5 },
  { date: "Oct 24", correctness: 94.3, faithfulness: 97.0, contextRecall: 91.9 },
  { date: "Oct 26", correctness: 94.1, faithfulness: 97.2, contextRecall: 91.7 },
  { date: "Oct 28", correctness: 94.2, faithfulness: 97.1, contextRecall: 91.8 },
];

export const retrievalConfigComparison = [
  { config: "Dense only", correctness: 87.4 },
  { config: "BM25 only", correctness: 83.1 },
  { config: "Hybrid (dense + BM25)", correctness: 91.6 },
  { config: "Hybrid + reranking", correctness: 94.2 },
];

export const evaluationOutcomes = [
  { name: "Passed", value: 123, color: "var(--success)" },
  { name: "Failed", value: 5, color: "var(--destructive)" },
];

export type RunStatus = "passed" | "failed" | "running" | "warning";

export interface EvaluationRun {
  id: string;
  config: string;
  timestamp: string;
  status: RunStatus;
  score: number;
}

export const recentRuns: EvaluationRun[] = [
  { id: "run-2048", config: "Hybrid + reranking · gpt-4o", timestamp: "2026-10-30 09:12", status: "passed", score: 96.4 },
  { id: "run-2047", config: "Hybrid + reranking · gpt-4o-mini", timestamp: "2026-10-30 07:45", status: "passed", score: 94.8 },
  { id: "run-2046", config: "Dense only · claude-sonnet-4.5", timestamp: "2026-10-29 22:03", status: "warning", score: 88.2 },
  { id: "run-2045", config: "Hybrid · gpt-4o", timestamp: "2026-10-29 18:51", status: "passed", score: 93.1 },
  { id: "run-2044", config: "Hybrid + reranking · gpt-4o", timestamp: "2026-10-29 14:20", status: "failed", score: 71.6 },
  { id: "run-2043", config: "BM25 only · gpt-4o-mini", timestamp: "2026-10-29 11:08", status: "passed", score: 90.5 },
  { id: "run-2042", config: "Hybrid + reranking · claude-sonnet-4.5", timestamp: "2026-10-28 20:44", status: "running", score: 0 },
  { id: "run-2041", config: "Dense only · gpt-4o", timestamp: "2026-10-28 16:37", status: "passed", score: 92.0 },
];

// ---------------------------------------------------------------------------
// RAG Playground
// ---------------------------------------------------------------------------

export interface ChatSource {
  id: string;
  title: string;
  snippet: string;
  document: string;
  page: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
}

export const sampleSources: ChatSource[] = [
  {
    id: "src-1",
    title: "ADA Standards of Care in Diabetes — 2025",
    snippet:
      "Risk factors for type 2 diabetes include overweight/obesity, physical inactivity, family history, and history of gestational diabetes...",
    document: "ada_standards_of_care_2025.pdf",
    page: 24,
  },
  {
    id: "src-2",
    title: "CDC National Diabetes Statistics Report",
    snippet:
      "Age ≥45, prediabetes (HbA1c 5.7–6.4%), hypertension, and dyslipidemia are strongly associated with progression to T2D...",
    document: "cdc_diabetes_statistics_report.pdf",
    page: 8,
  },
  {
    id: "src-3",
    title: "WHO Global Report on Diabetes",
    snippet:
      "Population-level drivers include urbanization, sedentary lifestyles, and increased consumption of energy-dense foods...",
    document: "who_global_diabetes_report.pdf",
    page: 41,
  },
  {
    id: "src-4",
    title: "Look AHEAD Trial — Long-Term Follow-up",
    snippet:
      "Polycystic ovary syndrome and certain racial/ethnic backgrounds (African American, Hispanic, Native American) confer elevated risk...",
    document: "look_ahead_trial_followup.pdf",
    page: 15,
  },
];

export const sampleChat: ChatMessage[] = [
  {
    id: "msg-1",
    role: "user",
    content: "What are the major risk factors for Type 2 diabetes?",
  },
  {
    id: "msg-2",
    role: "assistant",
    content:
      "Type 2 diabetes (T2D) risk is driven by a combination of modifiable and non-modifiable factors:\n\n1. **Excess weight and central adiposity** — BMI ≥25 kg/m² (≥23 in Asian populations) is the strongest modifiable risk factor [1].\n2. **Physical inactivity** — sedentary behavior reduces insulin sensitivity independent of body weight [1][3].\n3. **Family history and genetics** — a first-degree relative with T2D roughly doubles lifetime risk [1].\n4. **Age ≥45** — beta-cell function and insulin sensitivity decline with age [2].\n5. **Prediabetes** — HbA1c 5.7–6.4% or impaired fasting glucose signals high short-term conversion risk [2].\n6. **Hypertension and dyslipidemia** — frequently co-occur with insulin resistance as part of metabolic syndrome [2].\n7. **History of gestational diabetes or PCOS** — both substantially raise future T2D risk in women [1][4].\n8. **Race/ethnicity** — African American, Hispanic/Latino, Native American, and Asian American populations carry disproportionately higher risk at a given BMI [4].\n9. **Urbanization and diet** — energy-dense, low-fiber diets and declining physical activity at a population level are key drivers of rising global incidence [3].\n\nScreening guidelines (ADA 2025) recommend testing adults starting at age 35, or earlier for those with additional risk factors, with repeat screening every 3 years if normal.",
    sources: sampleSources,
  },
];

export const suggestedQuestions = [
  "How is gestational diabetes diagnosed during pregnancy?",
  "What HbA1c threshold defines prediabetes vs diabetes?",
  "Summarize first-line pharmacologic therapy for T2D.",
  "What lifestyle interventions have the strongest evidence base?",
];

export const retrievedChunks = [
  { id: "c1", document: "ada_standards_of_care_2025.pdf", page: 24, score: 0.93, method: "dense+bm25" },
  { id: "c2", document: "cdc_diabetes_statistics_report.pdf", page: 8, score: 0.89, method: "dense" },
  { id: "c3", document: "who_global_diabetes_report.pdf", page: 41, score: 0.84, method: "bm25" },
  { id: "c4", document: "look_ahead_trial_followup.pdf", page: 15, score: 0.81, method: "dense+bm25" },
  { id: "c5", document: "metabolic_syndrome_review_2024.pdf", page: 6, score: 0.77, method: "dense" },
  { id: "c6", document: "pcos_t2d_risk_cohort.pdf", page: 3, score: 0.74, method: "bm25" },
];

export const rerankedChunks = [
  { id: "c1", original: 1, reranked: 1, delta: 0, crossEncoderScore: 0.97 },
  { id: "c4", original: 4, reranked: 2, delta: 2, crossEncoderScore: 0.92 },
  { id: "c2", original: 2, reranked: 3, delta: -1, crossEncoderScore: 0.88 },
  { id: "c6", original: 6, reranked: 4, delta: 2, crossEncoderScore: 0.81 },
  { id: "c3", original: 3, reranked: 5, delta: -2, crossEncoderScore: 0.76 },
  { id: "c5", original: 5, reranked: 6, delta: -1, crossEncoderScore: 0.69 },
];

export const guardrailChecks = [
  { id: "g1", label: "Prompt injection screening", status: "passed", detail: "No adversarial instructions detected in user input." },
  { id: "g2", label: "Input validation", status: "passed", detail: "Query within length and language constraints." },
  { id: "g3", label: "Grounding check", status: "passed", detail: "97% of claims traced to retrieved context." },
  { id: "g4", label: "Citation verification", status: "passed", detail: "All numbered citations map to retrieved chunks." },
  { id: "g5", label: "PHI / safety screen", status: "warning", detail: "No PHI detected; response includes general medical guidance disclaimer recommended." },
] as const;

export const responseMetadata = {
  model: "gpt-4o-2026-08-01",
  promptVersion: "clinical-qa-v3.2",
  inputTokens: 1842,
  outputTokens: 356,
  retrievalLatencyMs: 410,
  generationLatencyMs: 1390,
  totalLatencyMs: 1800,
  estimatedCostUsd: 0.0183,
};

// ---------------------------------------------------------------------------
// Evaluation Lab
// ---------------------------------------------------------------------------

export const goldenDatasets = [
  { id: "ds-clinical-qa", label: "Clinical QA Golden Set (v4)", size: 240 },
  { id: "ds-diagnosis", label: "Diagnostic Reasoning Set (v2)", size: 180 },
  { id: "ds-medication", label: "Medication Safety Set (v3)", size: 150 },
  { id: "ds-patient-edu", label: "Patient Education Set (v1)", size: 90 },
];

export const evalModels = [
  "gpt-4o-2026-08-01",
  "gpt-4o-mini-2026-08-01",
  "claude-sonnet-4.5",
  "claude-haiku-4.5",
];

export const retrievalStrategies = [
  "Dense only",
  "BM25 only",
  "Hybrid (dense + BM25)",
  "Hybrid + reranking",
];

export const evalMetricOptions = [
  "Answer Correctness",
  "Faithfulness",
  "Context Precision",
  "Context Recall",
  "Answer Relevance",
  "Guardrail Pass Rate",
];

export interface MetricResult {
  id: string;
  label: string;
  score: number;
  baseline: number;
}

export const evaluationMetricResults: MetricResult[] = [
  { id: "correctness", label: "Answer Correctness", score: 94.2, baseline: 91.6 },
  { id: "faithfulness", label: "Faithfulness", score: 97.1, baseline: 95.0 },
  { id: "context-precision", label: "Context Precision", score: 90.4, baseline: 88.1 },
  { id: "context-recall", label: "Context Recall", score: 91.8, baseline: 89.9 },
  { id: "answer-relevance", label: "Answer Relevance", score: 95.6, baseline: 93.2 },
  { id: "guardrail-pass", label: "Guardrail Pass Rate", score: 98.3, baseline: 97.8 },
];

export const radarComparison = [
  { metric: "Correctness", baseline: 91.6, candidate: 94.2 },
  { metric: "Faithfulness", baseline: 95.0, candidate: 97.1 },
  { metric: "Ctx Precision", baseline: 88.1, candidate: 90.4 },
  { metric: "Ctx Recall", baseline: 89.9, candidate: 91.8 },
  { metric: "Relevance", baseline: 93.2, candidate: 95.6 },
  { metric: "Guardrails", baseline: 97.8, candidate: 98.3 },
];

export const regressionTrend = [
  { run: "run-2033", score: 91.0 },
  { run: "run-2036", score: 91.8 },
  { run: "run-2039", score: 90.9 },
  { run: "run-2041", score: 92.4 },
  { run: "run-2043", score: 93.0 },
  { run: "run-2045", score: 93.1 },
  { run: "run-2047", score: 94.8 },
  { run: "run-2048", score: 94.2 },
];

export const passFailDistribution = [
  { name: "Passed", value: 231, color: "var(--success)" },
  { name: "Failed", value: 9, color: "var(--destructive)" },
];

export type DetailStatus = "passed" | "failed";

export interface EvalDetailRow {
  id: string;
  question: string;
  expected: string;
  generated: string;
  correctness: number;
  faithfulness: number;
  status: DetailStatus;
  context: string[];
  judgeScores: { metric: string; score: number }[];
  judgeExplanation: string;
  failureReason?: string;
}

export const evaluationDetailRows: EvalDetailRow[] = [
  {
    id: "eval-001",
    question: "What are the major risk factors for Type 2 diabetes?",
    expected:
      "Obesity/overweight, physical inactivity, family history, age ≥45, prediabetes, hypertension, dyslipidemia, gestational diabetes history, PCOS, and certain racial/ethnic backgrounds.",
    generated:
      "Excess weight, sedentary lifestyle, genetics/family history, age over 45, prediabetes, high blood pressure, abnormal lipids, gestational diabetes history, PCOS, and higher-risk ethnic groups.",
    correctness: 96.5,
    faithfulness: 98.0,
    status: "passed",
    context: [
      "ADA Standards of Care §2.3 — Risk-based screening criteria",
      "CDC National Diabetes Statistics Report, Table 4",
    ],
    judgeScores: [
      { metric: "Correctness", score: 96.5 },
      { metric: "Faithfulness", score: 98.0 },
      { metric: "Completeness", score: 94.0 },
    ],
    judgeExplanation:
      "Response captures all nine risk factors present in the reference answer with equivalent clinical phrasing. No unsupported claims introduced.",
  },
  {
    id: "eval-002",
    question: "What HbA1c range defines prediabetes?",
    expected: "HbA1c between 5.7% and 6.4% defines prediabetes.",
    generated: "An HbA1c level from 5.7% to 6.4% is classified as prediabetes.",
    correctness: 99.1,
    faithfulness: 99.5,
    status: "passed",
    context: ["ADA Standards of Care §2.1 — Diagnostic criteria table"],
    judgeScores: [
      { metric: "Correctness", score: 99.1 },
      { metric: "Faithfulness", score: 99.5 },
      { metric: "Completeness", score: 100 },
    ],
    judgeExplanation: "Exact numeric match to reference range, no hallucinated detail.",
  },
  {
    id: "eval-003",
    question: "What is the first-line pharmacologic therapy for T2D?",
    expected: "Metformin is recommended as first-line therapy absent contraindications.",
    generated:
      "Metformin, combined with lifestyle modification, is generally the first medication prescribed, unless contraindicated such as in significant renal impairment.",
    correctness: 92.3,
    faithfulness: 95.1,
    status: "passed",
    context: ["ADA Standards of Care §9.2 — Pharmacologic approaches"],
    judgeScores: [
      { metric: "Correctness", score: 92.3 },
      { metric: "Faithfulness", score: 95.1 },
      { metric: "Completeness", score: 88.0 },
    ],
    judgeExplanation: "Correct primary claim; omits mention of GLP-1/SGLT2 considerations for comorbid CVD/CKD present in longer reference answer.",
  },
  {
    id: "eval-004",
    question: "Can type 2 diabetes be diagnosed with a single random glucose test?",
    expected:
      "A single random plasma glucose ≥200 mg/dL is diagnostic only when accompanied by classic hyperglycemia symptoms; otherwise confirmation on a separate day is required.",
    generated:
      "Yes, a random glucose test alone is always sufficient to diagnose type 2 diabetes.",
    correctness: 38.0,
    faithfulness: 29.5,
    status: "failed",
    context: ["ADA Standards of Care §2.1 — Diagnostic criteria table", "WHO Global Report on Diabetes, Annex B"],
    judgeScores: [
      { metric: "Correctness", score: 38.0 },
      { metric: "Faithfulness", score: 29.5 },
      { metric: "Completeness", score: 40.0 },
    ],
    judgeExplanation:
      "Response overgeneralizes the diagnostic criterion, omitting the symptom-dependency and confirmatory-testing requirement present in the retrieved context.",
    failureReason: "Faithfulness violation: unsupported absolute claim contradicts retrieved guideline nuance.",
  },
  {
    id: "eval-005",
    question: "What lifestyle interventions have the strongest evidence base for preventing T2D?",
    expected:
      "Structured programs combining ≥150 min/week moderate activity with 5–7% body weight loss (e.g. Diabetes Prevention Program) show the strongest evidence, reducing incidence by ~58%.",
    generated:
      "The Diabetes Prevention Program model — moderate exercise about 150 minutes weekly plus modest weight loss of 5 to 7 percent — has the most robust supporting evidence, cutting new-onset diabetes by roughly 58%.",
    correctness: 97.8,
    faithfulness: 98.4,
    status: "passed",
    context: ["Look AHEAD Trial — Long-Term Follow-up, Executive Summary"],
    judgeScores: [
      { metric: "Correctness", score: 97.8 },
      { metric: "Faithfulness", score: 98.4 },
      { metric: "Completeness", score: 96.0 },
    ],
    judgeExplanation: "Faithfully reproduces DPP statistics and mechanism with correct attribution.",
  },
  {
    id: "eval-006",
    question: "Is metformin safe in patients with stage 4 chronic kidney disease?",
    expected:
      "Metformin is contraindicated at eGFR <30 mL/min/1.73m² (stage 4-5 CKD) due to lactic acidosis risk; dose reduction is advised at eGFR 30-45.",
    generated:
      "Metformin should generally be avoided in patients with significant kidney impairment, though exact thresholds vary by guideline.",
    correctness: 64.2,
    faithfulness: 71.0,
    status: "failed",
    context: ["ADA Standards of Care §9.2 — Pharmacologic approaches", "KDIGO 2024 Guideline, Table 3"],
    judgeScores: [
      { metric: "Correctness", score: 64.2 },
      { metric: "Faithfulness", score: 71.0 },
      { metric: "Completeness", score: 55.0 },
    ],
    judgeExplanation: "Directionally correct but lacks the specific eGFR thresholds required for clinical actionability; penalized for incompleteness.",
    failureReason: "Below correctness threshold (70%): missing quantitative eGFR cutoffs.",
  },
];

// ---------------------------------------------------------------------------
// Experiments
// ---------------------------------------------------------------------------

export interface Experiment {
  id: string;
  name: string;
  model: string;
  chunkSize: number;
  retrieval: string;
  reranking: boolean;
  correctness: number;
  faithfulness: number;
  latencyMs: number;
  costPer1k: number;
  createdAt: string;
}

export const experiments: Experiment[] = [
  { id: "exp-01", name: "baseline-dense-512", model: "gpt-4o-mini", chunkSize: 512, retrieval: "Dense only", reranking: false, correctness: 87.4, faithfulness: 91.2, latencyMs: 1120, costPer1k: 3.8, createdAt: "2026-10-12" },
  { id: "exp-02", name: "bm25-512", model: "gpt-4o-mini", chunkSize: 512, retrieval: "BM25 only", reranking: false, correctness: 83.1, faithfulness: 88.0, latencyMs: 980, costPer1k: 3.8, createdAt: "2026-10-13" },
  { id: "exp-03", name: "hybrid-512", model: "gpt-4o", chunkSize: 512, retrieval: "Hybrid (dense + BM25)", reranking: false, correctness: 91.6, faithfulness: 94.4, latencyMs: 1540, costPer1k: 11.2, createdAt: "2026-10-16" },
  { id: "exp-04", name: "hybrid-1024-rerank", model: "gpt-4o", chunkSize: 1024, retrieval: "Hybrid + reranking", reranking: true, correctness: 93.8, faithfulness: 96.3, latencyMs: 1810, costPer1k: 12.6, createdAt: "2026-10-19" },
  { id: "exp-05", name: "hybrid-768-rerank-sonnet", model: "claude-sonnet-4.5", chunkSize: 768, retrieval: "Hybrid + reranking", reranking: true, correctness: 94.2, faithfulness: 97.1, latencyMs: 1800, costPer1k: 9.4, createdAt: "2026-10-24" },
  { id: "exp-06", name: "hybrid-1536-rerank", model: "gpt-4o", chunkSize: 1536, retrieval: "Hybrid + reranking", reranking: true, correctness: 92.9, faithfulness: 95.8, latencyMs: 2150, costPer1k: 14.9, createdAt: "2026-10-26" },
  { id: "exp-07", name: "hybrid-768-rerank-haiku", model: "claude-haiku-4.5", chunkSize: 768, retrieval: "Hybrid + reranking", reranking: true, correctness: 90.1, faithfulness: 93.7, latencyMs: 980, costPer1k: 2.1, createdAt: "2026-10-28" },
  { id: "exp-08", name: "dense-1024-rerank", model: "gpt-4o-mini", chunkSize: 1024, retrieval: "Dense only", reranking: true, correctness: 89.3, faithfulness: 92.6, latencyMs: 1340, costPer1k: 4.6, createdAt: "2026-10-29" },
];

export const experimentOverviewStats = {
  total: experiments.length,
  bestConfig: "exp-05 · hybrid-768-rerank-sonnet",
  latest: "exp-08 · dense-1024-rerank",
  avgImprovement: "+6.8%",
};

// ---------------------------------------------------------------------------
// CI/CD Pipeline
// ---------------------------------------------------------------------------

export type PipelineStepStatus = "passed" | "failed" | "running" | "pending";

export interface PipelineStep {
  id: string;
  name: string;
  icon: string;
  status: PipelineStepStatus;
  durationSec: number;
  timestamp: string;
  details: string[];
}

export const pipelineSteps: PipelineStep[] = [
  {
    id: "step-commit",
    name: "Code Commit",
    icon: "GitCommitHorizontal",
    status: "passed",
    durationSec: 2,
    timestamp: "2026-10-30 09:01:12",
    details: ["Commit a1b2c3d pushed to main", "Author: akshita270", "12 files changed"],
  },
  {
    id: "step-unit-tests",
    name: "Unit Tests",
    icon: "FlaskConical",
    status: "passed",
    durationSec: 48,
    timestamp: "2026-10-30 09:01:20",
    details: ["214 tests passed", "0 failed, 3 skipped", "Coverage: 88.4%"],
  },
  {
    id: "step-rag-eval",
    name: "RAG Evaluation",
    icon: "Microscope",
    status: "passed",
    durationSec: 312,
    timestamp: "2026-10-30 09:02:08",
    details: ["Golden set: Clinical QA v4 (240 examples)", "Correctness: 94.2%", "Faithfulness: 97.1%"],
  },
  {
    id: "step-quality-gate",
    name: "Quality Gate",
    icon: "ShieldCheck",
    status: "passed",
    durationSec: 4,
    timestamp: "2026-10-30 09:07:20",
    details: ["All 5 thresholds met", "No regression vs baseline", "Guardrail compliance: 98.3%"],
  },
  {
    id: "step-deploy",
    name: "Deployment",
    icon: "Rocket",
    status: "passed",
    durationSec: 56,
    timestamp: "2026-10-30 09:07:24",
    details: ["Deployed to production", "Canary rollout: 100%", "Rollback window: 30 min"],
  },
];

export interface QualityGate {
  id: string;
  label: string;
  threshold: string;
  actual: string;
  passed: boolean;
}

export const qualityGates: QualityGate[] = [
  { id: "qg-correctness", label: "Correctness Threshold", threshold: "≥ 90.0%", actual: "94.2%", passed: true },
  { id: "qg-faithfulness", label: "Faithfulness Threshold", threshold: "≥ 95.0%", actual: "97.1%", passed: true },
  { id: "qg-regression", label: "Max Regression", threshold: "≤ 1.5%", actual: "0.0%", passed: true },
  { id: "qg-guardrail", label: "Guardrail Compliance", threshold: "≥ 97.0%", actual: "98.3%", passed: true },
  { id: "qg-latency", label: "Latency Threshold", threshold: "≤ 2.5s", actual: "1.8s", passed: true },
];

export type DeploymentStatus = "deployed" | "rolled-back" | "blocked";
export type PipelineStatus = "success" | "failed" | "running";

export interface PipelineRun {
  id: string;
  commit: string;
  branch: string;
  triggeredBy: string;
  evalScore: number;
  status: PipelineStatus;
  deployment: DeploymentStatus;
  timestamp: string;
}

export const pipelineHistory: PipelineRun[] = [
  { id: "pl-114", commit: "a1b2c3d", branch: "main", triggeredBy: "akshita270", evalScore: 94.2, status: "success", deployment: "deployed", timestamp: "2026-10-30 09:01" },
  { id: "pl-113", commit: "9f8e7d6", branch: "feature/rerank-tuning", triggeredBy: "akshita270", evalScore: 93.8, status: "success", deployment: "deployed", timestamp: "2026-10-29 16:22" },
  { id: "pl-112", commit: "5c4b3a2", branch: "feature/guardrails-v2", triggeredBy: "ci-bot", evalScore: 71.6, status: "failed", deployment: "blocked", timestamp: "2026-10-29 14:18" },
  { id: "pl-111", commit: "2d1e0f9", branch: "main", triggeredBy: "akshita270", evalScore: 92.4, status: "success", deployment: "deployed", timestamp: "2026-10-28 20:40" },
  { id: "pl-110", commit: "8a7b6c5", branch: "feature/chunk-size-sweep", triggeredBy: "akshita270", evalScore: 90.9, status: "success", deployment: "rolled-back", timestamp: "2026-10-28 11:05" },
  { id: "pl-109", commit: "4e3d2c1", branch: "main", triggeredBy: "akshita270", evalScore: 92.0, status: "success", deployment: "deployed", timestamp: "2026-10-27 19:52" },
  { id: "pl-108", commit: "0b9a8c7", branch: "feature/bm25-tuning", triggeredBy: "ci-bot", evalScore: 85.3, status: "success", deployment: "deployed", timestamp: "2026-10-26 13:30" },
  { id: "pl-107", commit: "6f5e4d3", branch: "feature/guardrails-v1", triggeredBy: "akshita270", evalScore: 68.9, status: "failed", deployment: "blocked", timestamp: "2026-10-25 10:14" },
];

// ---------------------------------------------------------------------------
// Monitoring
// ---------------------------------------------------------------------------

export const monitoringKpis: Kpi[] = [
  { id: "requests", label: "Total API Requests", value: "48.2K", rawValue: 48200, format: "compact", trend: "up", trendValue: "+12.4%", comparison: "vs last 7 days", icon: "Network", goodDirection: "up" },
  { id: "avg-latency", label: "Average Latency", value: "1.82", rawValue: 1.82, unit: "s", trend: "down", trendValue: "-0.14s", comparison: "vs last 7 days", icon: "Gauge", goodDirection: "down" },
  { id: "error-rate", label: "Error Rate", value: "0.42", rawValue: 0.42, unit: "%", trend: "down", trendValue: "-0.08%", comparison: "vs last 7 days", icon: "AlertTriangle", goodDirection: "down" },
  { id: "tokens", label: "Token Consumption", value: "18.6M", rawValue: 18600000, format: "compact", trend: "up", trendValue: "+9.1%", comparison: "vs last 7 days", icon: "Binary", goodDirection: "down" },
  { id: "spend", label: "Estimated API Spend", value: "$642", rawValue: 642, format: "currency", trend: "up", trendValue: "+$58", comparison: "vs last 7 days", icon: "DollarSign", goodDirection: "down" },
  { id: "guardrail-violations", label: "Guardrail Violations", value: "7", rawValue: 7, trend: "down", trendValue: "-3", comparison: "vs last 7 days", icon: "ShieldAlert", goodDirection: "down" },
];

export const requestVolumeTrend = Array.from({ length: 14 }).map((_, i) => {
  return {
    date: `Oct ${16 + i}`,
    requests: 2600 + Math.round(Math.sin(i / 2) * 400) + i * 90,
  };
});

export const latencyDistribution = [
  { bucket: "0-0.5s", count: 820 },
  { bucket: "0.5-1s", count: 2140 },
  { bucket: "1-1.5s", count: 3680 },
  { bucket: "1.5-2s", count: 2910 },
  { bucket: "2-2.5s", count: 1240 },
  { bucket: "2.5-3s", count: 410 },
  { bucket: ">3s", count: 120 },
];

export const tokenUsageTrend = Array.from({ length: 14 }).map((_, i) => ({
  date: `Oct ${16 + i}`,
  input: 980000 + i * 24000 + Math.round(Math.cos(i / 3) * 40000),
  output: 310000 + i * 9000 + Math.round(Math.sin(i / 3) * 15000),
}));

export const apiSpendTrend = Array.from({ length: 14 }).map((_, i) => ({
  date: `Oct ${16 + i}`,
  spend: 38 + i * 2.1 + Math.round(Math.sin(i / 2) * 6),
}));

export const guardrailEventFrequency = [
  { category: "Prompt injection", count: 2 },
  { category: "PHI exposure risk", count: 1 },
  { category: "Ungrounded claim", count: 3 },
  { category: "Citation mismatch", count: 1 },
  { category: "Toxicity", count: 0 },
];

export const modelQualityTrend = performanceOverTime.map((d) => ({
  date: d.date,
  correctness: d.correctness,
  faithfulness: d.faithfulness,
}));
