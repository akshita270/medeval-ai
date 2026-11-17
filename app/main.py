import logging
import time
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.auth import require_api_key
from app.ci_status import CiStatusError, get_ci_run_jobs, get_recent_ci_runs
from app.config import get_settings
from app.eval_reports import EvalRunNotFoundError, get_eval_run, list_eval_runs
from app.generation.generator import generate_answer
from app.guardrails.pipeline import (
    build_blocked_answer,
    redact_blocked_answer,
    run_input_guardrails,
    run_output_guardrails,
)
from app.rate_limiter import RateLimiter, enforce_rate_limit
from app.request_log import RequestLogEntry, get_request_log
from app.retrieval.bm25_index import build_bm25_index
from app.retrieval.pipeline import retrieve_passages
from app.schemas import GeneratedAnswer
from app.vectorstore.chroma_store import get_collection

logger = logging.getLogger(__name__)


class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)


class HealthResponse(BaseModel):
    status: str
    collection_name: str
    chunk_count: int
    embedding_model: str
    llm_model: str


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    logging.basicConfig(level=settings.log_level)

    # Opened exactly once at startup, not per-request -- rebuilding the
    # index itself is scripts/build_index.py's job, run explicitly and
    # separately when documents or chunking config actually change.
    app.state.collection = get_collection(settings.chroma_persist_dir, settings.chroma_collection_name)
    logger.info(
        "Loaded collection '%s' with %d chunks",
        settings.chroma_collection_name,
        app.state.collection.count(),
    )

    # Built once at startup regardless of use_hybrid_retrieval -- it's
    # cheap (milliseconds, in-memory, no extra storage) and this way
    # flipping that flag is a config-only change, never a restart-with-
    # different-startup-logic change.
    app.state.bm25_index = build_bm25_index(app.state.collection)
    logger.info("Built BM25 index with %d chunks", len(app.state.bm25_index.chunk_ids))

    # One shared, in-memory limiter for the process's lifetime -- see
    # app/rate_limiter.py for why in-memory/per-process is the right
    # tradeoff here rather than a shared store.
    app.state.rate_limiter = RateLimiter(
        max_requests=settings.rate_limit_requests_per_minute,
        window_seconds=60.0,
    )
    logger.info("Rate limiter: %d requests/minute per client", settings.rate_limit_requests_per_minute)

    app.state.request_log = get_request_log(str(settings.request_log_db_path))
    yield


app = FastAPI(title="MedEval AI", lifespan=lifespan)

# Open to any origin: this is a public, no-auth, no-cookie demo API
# (no real patient data, nothing session-scoped) meant to be called
# directly from a browser-based frontend hosted elsewhere.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
def health(request: Request) -> HealthResponse:
    settings = get_settings()
    collection = request.app.state.collection
    return HealthResponse(
        status="ok",
        collection_name=settings.chroma_collection_name,
        chunk_count=collection.count(),
        embedding_model=settings.embedding_model,
        llm_model=settings.llm_model,
    )


def _log_request(request_log, result: GeneratedAnswer, started_at: float) -> None:
    latency_ms = (time.perf_counter() - started_at) * 1000
    blocked = bool(result.blocked_by)
    # A real generation call always produces some completion tokens, so
    # zero tokens on a request nothing blocked can only mean the answer
    # came from the LLM response cache (app/llm_cache.py), not a fresh call.
    cache_hit = not blocked and result.total_tokens == 0
    request_log.log(
        RequestLogEntry(
            model=result.config.llm_model,
            latency_ms=latency_ms,
            prompt_tokens=result.prompt_tokens,
            completion_tokens=result.completion_tokens,
            blocked=blocked,
            cache_hit=cache_hit,
            blocked_reasons=tuple(result.blocked_by or ()),
            retrieval_ms=result.stage_timings_ms.get("retrieval_ms"),
            input_guardrails_ms=result.stage_timings_ms.get("input_guardrails_ms"),
            generation_ms=result.stage_timings_ms.get("generation_ms"),
            output_guardrails_ms=result.stage_timings_ms.get("output_guardrails_ms"),
        )
    )


@app.post(
    "/ask",
    response_model=GeneratedAnswer,
    dependencies=[Depends(require_api_key), Depends(enforce_rate_limit)],
)
def ask(request: Request, body: AskRequest) -> GeneratedAnswer:
    settings = get_settings()
    collection = request.app.state.collection
    bm25_index = request.app.state.bm25_index
    request_log = request.app.state.request_log
    started_at = time.perf_counter()

    stage_timings: dict[str, float] = {}

    retrieval_started = time.perf_counter()
    passages = retrieve_passages(body.question, collection, settings, bm25_index)
    stage_timings["retrieval_ms"] = (time.perf_counter() - retrieval_started) * 1000

    # Guardrails run after retrieval (reusing its similarity scores, no
    # extra embedding call) but before generation, so a blocked request
    # never reaches the expensive LLM call.
    input_guardrails_started = time.perf_counter()
    decision = run_input_guardrails(body.question, passages, settings)
    stage_timings["input_guardrails_ms"] = (time.perf_counter() - input_guardrails_started) * 1000
    if decision.blocked:
        result = build_blocked_answer(body.question, decision, settings).model_copy(
            update={"stage_timings_ms": stage_timings}
        )
        _log_request(request_log, result, started_at)
        return result

    generation_started = time.perf_counter()
    answer = generate_answer(body.question, passages, settings)
    stage_timings["generation_ms"] = (time.perf_counter() - generation_started) * 1000

    # Output guardrails run after generation -- catches the LLM slipping
    # into personalized advice despite the prompt's rules and the input
    # checks above. The generation cost is already spent either way; this
    # only decides what's shown to the user.
    output_guardrails_started = time.perf_counter()
    output_decision = run_output_guardrails(body.question, answer, settings)
    stage_timings["output_guardrails_ms"] = (time.perf_counter() - output_guardrails_started) * 1000
    if output_decision.blocked:
        result = redact_blocked_answer(answer, output_decision).model_copy(
            update={"stage_timings_ms": stage_timings}
        )
        _log_request(request_log, result, started_at)
        return result

    answer = answer.model_copy(update={"stage_timings_ms": stage_timings})
    _log_request(request_log, answer, started_at)
    return answer


@app.get("/stats/overview")
def stats_overview(request: Request) -> dict:
    """Real aggregate traffic/cost stats for the Dashboard page's KPI
    cards -- everything /ask has actually been asked since this server
    started (the SQLite log survives restarts; in-memory state wouldn't).
    """
    return request.app.state.request_log.overview()


@app.get("/stats/daily")
def stats_daily(request: Request, days: int = 14) -> list[dict]:
    """Real per-day traffic/latency/cost series for the Monitoring
    page's trend charts, covering the last `days` days.
    """
    return request.app.state.request_log.daily_series(days=days)


@app.get("/stats/latency-breakdown")
def stats_latency_breakdown(request: Request) -> dict:
    """Average per-stage latency (retrieval / input guardrails / generation
    / output guardrails) across every request that recorded stage timings,
    for the Monitoring page's latency-breakdown chart.
    """
    return request.app.state.request_log.latency_breakdown()


@app.get("/stats/guardrail-events")
def stats_guardrail_events(request: Request) -> list[dict]:
    """How many requests each guardrail check has actually blocked,
    for the Monitoring page's guardrail-activity chart.
    """
    return request.app.state.request_log.guardrail_event_counts()


@app.get("/evaluation/runs")
def evaluation_runs() -> list[dict]:
    """Every real evaluation run saved to disk, for the Evaluation Lab
    and Experiments pages. Read-only -- see app/eval_reports.py for why
    there is no endpoint that triggers a new (paid) run.
    """
    return list_eval_runs()


@app.get("/evaluation/runs/{run_id}")
def evaluation_run_detail(run_id: str) -> dict:
    try:
        return get_eval_run(run_id)
    except EvalRunNotFoundError:
        raise HTTPException(status_code=404, detail=f"No evaluation run found with id '{run_id}'")


@app.get("/pipeline/runs")
def pipeline_runs() -> list[dict]:
    """Real GitHub Actions run history for the Pipeline page -- including
    real failures, since the point of this feature is to stop fabricating
    a CI status that always says 'passed'.
    """
    settings = get_settings()
    try:
        return get_recent_ci_runs(settings)
    except CiStatusError as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@app.get("/pipeline/runs/{run_id}/jobs")
def pipeline_run_jobs(run_id: int) -> list[dict]:
    """Real per-job, per-step breakdown of one CI run, for the Pipeline
    page's "latest run" step-by-step view.
    """
    settings = get_settings()
    try:
        return get_ci_run_jobs(settings, run_id)
    except CiStatusError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
