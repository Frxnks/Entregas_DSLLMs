from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


SERVICE_ROOT = Path(__file__).resolve().parents[1]
ENTREGA_ROOT = SERVICE_ROOT.parent
KIT_ROOT = ENTREGA_ROOT / "insumos" / "CU-1_operador_revision"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=SERVICE_ROOT / ".env", env_file_encoding="utf-8", extra="ignore"
    )

    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    gemini_fallback_model: str = ""
    llm_provider: str = "gemini"
    gemini_min_interval_seconds: float = 4.0
    gemini_max_retries: int = 3
    mcp_url: str = "http://127.0.0.1:8001/mcp"
    api_host: str = "127.0.0.1"
    api_port: int = 8002
    mcp_host: str = "127.0.0.1"
    mcp_port: int = 8001
    rag_top_k: int = 5
    rag_strategy: str = "sections"
    rag_embedding_model: str = "paraphrase-multilingual-MiniLM-L12-v2"
    mira_cors_origin: str = "http://localhost:3000"
    runtime_dir: Path = ENTREGA_ROOT / "var"

    @property
    def database_path(self) -> Path:
        return self.runtime_dir / "mira_cu1.sqlite"

    @property
    def chroma_path(self) -> Path:
        return self.runtime_dir / "chroma"

    @property
    def corpus_path(self) -> Path:
        return KIT_ROOT / "corpus"

    @property
    def workbook_path(self) -> Path:
        return KIT_ROOT / "datos" / "CU-1_datos.xlsx"


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.runtime_dir.mkdir(parents=True, exist_ok=True)
    return settings
