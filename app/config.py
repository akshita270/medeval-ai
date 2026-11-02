from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central application configuration, loaded from environment variables / .env.

    Every field here is a knob that can change what an answer looks like
    (chunk size, top-k, model, prompt version). Keeping them in one typed
    object means each generated answer can record exactly which config
    produced it — required for reproducibility and for the regression
    testing in later phases.
    """

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # OpenAI
    openai_api_key: str = Field(default="")

    # Application
    app_env: str = Field(default="development")
    log_level: str = Field(default="INFO")

    # RAG configuration
    chunk_size: int = Field(default=800)
    chunk_overlap: int = Field(default=100)
    retrieval_top_k: int = Field(default=5)
    embedding_model: str = Field(default="text-embedding-3-small")
    llm_model: str = Field(default="gpt-5-mini")
    prompt_version: str = Field(default="v1")

    # Evaluation (independent of the generation model/prompt above --
    # a separate knob, even when it happens to hold the same value)
    judge_model: str = Field(default="gpt-5-mini")

    # Paths
    chroma_persist_dir: Path = Field(default=Path("./data/chroma_db"))
    raw_documents_dir: Path = Field(default=Path("./data/raw_documents"))

    # Vector store
    chroma_collection_name: str = Field(default="medical_research_docs")

    # Retrieval strategy (independently toggleable, for ablation benchmarking)
    use_hybrid_retrieval: bool = Field(default=False)
    use_reranking: bool = Field(default=False)
    retrieval_candidate_pool_size: int = Field(default=20)
    reranker_model: str = Field(default="cross-encoder/ms-marco-MiniLM-L-6-v2")

    # Quality gate thresholds -- configurable, never hardcoded in the gate
    # logic itself, so tightening/loosening a threshold is a config change.
    # These do NOT certify clinical safety; see quality_gates.py.
    min_answer_correctness: float = Field(default=0.75)
    min_faithfulness: float = Field(default=0.85)
    min_abstention_quality: float = Field(default=0.75)
    # 20% (not 10%): LLM-judged scores carry real run-to-run sampling
    # variance even with an unchanged system (verified empirically -- the
    # same question under the same config scored 0.70 in one run and 0.50
    # in another). A tighter threshold flags that noise as a regression.
    max_regression_pct: float = Field(default=0.20)
    # 20s (not 10s): measured real end-to-end retrieve+generate latency
    # with gpt-5-mini averaged ~16s on real data -- the original 10s was
    # an unverified guess, replaced once a real number existed.
    max_generation_latency_seconds: float = Field(default=20.0)
    max_failed_metric_rate: float = Field(default=0.05)


@lru_cache
def get_settings() -> Settings:
    """Settings are read from disk/env once per process and cached.

    Using a cached accessor (instead of a module-level `settings = Settings()`)
    means tests can clear the cache and reload with different env vars,
    instead of being stuck with whatever was loaded at import time.
    """
    return Settings()
