from functools import lru_cache

from .config import get_settings
from .database import Database
from .rag import RagEngine
from .tools import ToolService


@lru_cache
def get_database() -> Database:
    return Database(get_settings().database_path)


@lru_cache
def get_rag() -> RagEngine:
    settings = get_settings()
    return RagEngine(settings.corpus_path, settings.chroma_path, settings.rag_embedding_model)


@lru_cache
def get_tools() -> ToolService:
    return ToolService(get_database(), get_rag())

