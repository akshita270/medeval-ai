import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from pydantic import BaseModel, Field

from app.config import get_settings
from app.generation.generator import generate_answer
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
    yield


app = FastAPI(title="MedEval AI", lifespan=lifespan)


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


@app.post("/ask", response_model=GeneratedAnswer)
def ask(request: Request, body: AskRequest) -> GeneratedAnswer:
    settings = get_settings()
    collection = request.app.state.collection
    bm25_index = request.app.state.bm25_index
    passages = retrieve_passages(body.question, collection, settings, bm25_index)
    return generate_answer(body.question, passages, settings)
