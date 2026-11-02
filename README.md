# MedEval AI

A production-style Retrieval-Augmented Generation (RAG) system for Type 2 diabetes
research questions, built as an end-to-end evaluation and CI/CD platform rather than
just a demo RAG app. It answers questions over a small corpus of real, CC-licensed
PubMed/PMC research documents, and every change to retrieval, prompts, or the model
is checked against a golden dataset by an independent LLM judge before it's allowed
to ship.

No real patient data is used anywhere in this project. Quality gates here measure
answer quality against a golden dataset — they do not certify clinical safety.

## Why this project exists

Most RAG demos stop at "it answers questions." This one asks a harder question:
*how do you know a change didn't make it worse?* That's the actual problem in
production LLM systems, and it's what most of this repo is built around —
a golden dataset, an independent judge, regression detection, and a CI pipeline
that blocks a merge on a real measured drop in quality, not a vibe check.

## Architecture

```
Documents --> chunk --> embed --> ChromaDB
                                     |
Question ----------------------> retrieve (dense, or hybrid BM25+dense via RRF)
                                     |
                                reranking (cross-encoder, optional)
                                     |
                                 generate (gpt-5-mini)
                                     |
                                  answer + citations
```

Every generated answer is paired with a snapshot of the exact config that produced
it (chunk size, top-k, retrieval strategy, prompt version, model) — required to make
regression testing meaningful instead of comparing apples to oranges.

## What's built

**Phase 1 — RAG pipeline**
Token-bounded, paragraph-aware chunking with overlap; dense retrieval via ChromaDB;
hybrid retrieval (BM25 + dense, fused with Reciprocal Rank Fusion); optional
cross-encoder reranking; generation via the OpenAI API with full config reproducibility.
All three retrieval strategies (dense / hybrid / hybrid+rerank) are independently
toggleable for ablation comparison.

**Phase 2 — Golden evaluation dataset**
30 hand-built questions across 6 categories (factual, reasoning, multi-document
synthesis, out-of-scope, adversarial/misleading-premise, and more), each with
evidence quotes that are programmatically verified as verbatim substrings of the
real source documents — not just recalled from memory.

**Phase 3 — LLM-as-judge**
6 independent metrics (answer correctness, faithfulness, answer relevance, context
precision, context recall, abstention quality), each scored with only the inputs its
own rubric needs, with per-metric failure isolation and structured (Pydantic-validated)
output. Deterministic, non-LLM checks run alongside it for cost and citation validity.

**Phase 4 — Experiment tracking**
MLflow (local SQLite backend) logs config, metrics, and flagged-question artifacts
for every evaluation run, so results are comparable across changes over time.

**Phase 5 — Regression testing & CI/CD**
Per-question, per-metric regression detection against an approved baseline (not just
an aggregate score). A GitHub Actions PR pipeline runs lint/format/unit tests for
free on every PR (including forks), then a sampled 10-question evaluation + quality
gate when `OPENAI_API_KEY` is available — skipped (not failed) for fork PRs, since
GitHub withholds secrets from them by design. A release pipeline runs the full
30-question evaluation on every push to `main`. 67 unit tests cover deterministic
logic and mocked API calls at zero cost.

**Not yet built**: Phase 6 (AWS deployment, no Docker/Kubernetes) and Phase 7
(production monitoring + failure diagnosis). A guardrails/adversarial-testing layer
is also planned but not yet implemented.

## A known, documented limitation

LLM-judged scores carry real run-to-run variance even when nothing about the system
changes — verified directly: the same question, same config, scored 0.70 in one run
and 0.50 in another. Two cheap fixes were tried and both failed empirically for
`gpt-5-mini` (`temperature=0` is rejected by the API outright; `seed=42` is accepted
but doesn't produce stable scores). The real fix — averaging each metric over several
repeated judge calls — multiplies judge API cost and is deliberately deferred rather
than hidden by loosening thresholds indefinitely. Full writeup: [docs/CI_CD.md](docs/CI_CD.md).

## Project structure

```
app/            FastAPI RAG application (ingestion, embeddings, retrieval, generation)
evaluation/     Golden dataset, LLM-as-judge, regression quality gates, MLflow tracking
scripts/        build_index.py, run_evaluation.py, ci_quality_gate.py
tests/          Unit tests (deterministic + mocked-API) and integration tests
docs/           CI/CD setup and known-limitations documentation
frontend/       Next.js dashboard UI (mock data only, not wired to the backend)
.github/        GitHub Actions workflows (pr.yml, release.yml)
```

## Running it locally

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then fill in your own OPENAI_API_KEY
python scripts/build_index.py
uvicorn app.main:app --reload
```

Run the test suite (no API key needed, zero cost):
```bash
python -m pytest tests/unit/ -v
```

Run a real evaluation (costs real API credits):
```bash
python scripts/run_evaluation.py
```

## Tech stack

FastAPI, Pydantic, ChromaDB, OpenAI API, rank-bm25, sentence-transformers
(cross-encoder reranking), MLflow, pytest, ruff, GitHub Actions.
