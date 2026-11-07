import json
import os
import re
from pathlib import Path
from typing import Any

from .corpus import load_corpus


class LowMemoryMultilingualEmbedding:
    """Adaptador ONNX serializable para Chroma, con caché y temporales en B:."""

    _models: dict[str, Any] = {}

    def __init__(self, model_name: str, cache_folder: str):
        import onnxruntime as ort
        from sentence_transformers import SentenceTransformer

        self.model_name = model_name
        self.cache_folder = cache_folder
        key = f"{model_name}|{cache_folder}"
        if key not in self._models:
            session_options = ort.SessionOptions()
            session_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_DISABLE_ALL
            session_options.enable_cpu_mem_arena = False
            session_options.enable_mem_pattern = False
            session_options.intra_op_num_threads = 1
            self._models[key] = SentenceTransformer(
                model_name_or_path=model_name,
                device="cpu",
                cache_folder=cache_folder,
                backend="onnx",
                model_kwargs={
                    "file_name": "onnx/model_quint8_avx2.onnx",
                    "provider": "CPUExecutionProvider",
                    "session_options": session_options,
                },
            )
        self._model = self._models[key]

    def __call__(self, input: list[str]) -> list[Any]:
        import numpy as np

        embeddings = self._model.encode(
            list(input), convert_to_numpy=True, normalize_embeddings=True, batch_size=8
        )
        return [np.asarray(embedding, dtype=np.float32) for embedding in embeddings]

    def embed_query(self, input: list[str]) -> list[Any]:
        return self.__call__(input)

    @staticmethod
    def name() -> str:
        return "mira_multilingual_onnx_low_memory"

    def default_space(self) -> str:
        return "cosine"

    def supported_spaces(self) -> list[str]:
        return ["cosine", "l2", "ip"]

    def get_config(self) -> dict[str, Any]:
        return {"model_name": self.model_name, "cache_folder": self.cache_folder}

    @staticmethod
    def build_from_config(config: dict[str, Any]) -> "LowMemoryMultilingualEmbedding":
        return LowMemoryMultilingualEmbedding(config["model_name"], config["cache_folder"])


def _terms(text: str) -> set[str]:
    return {term for term in re.findall(r"[a-záéíóúñ0-9_]+", text.lower()) if len(term) > 2}


class RagEngine:
    """Indexación y consulta independientes del servidor MCP."""

    def __init__(self, corpus_path: Path, persist_path: Path, model_name: str):
        self.corpus_path = corpus_path
        self.persist_path = persist_path
        self.model_name = model_name
        self._collections: dict[str, Any] = {}

    def _configure_model_cache(self) -> Path:
        cache_root = self.persist_path.parent / "models"
        temp_root = self.persist_path.parent / "tmp"
        cache_root.mkdir(parents=True, exist_ok=True)
        temp_root.mkdir(parents=True, exist_ok=True)
        # Evita que Hugging Face/Xet y los temporales vuelvan al disco del perfil.
        os.environ["HF_HOME"] = str(cache_root)
        os.environ["HF_XET_CACHE"] = str(cache_root / "xet")
        os.environ["HF_HUB_DISABLE_XET"] = "1"
        os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
        os.environ["TEMP"] = str(temp_root)
        os.environ["TMP"] = str(temp_root)
        return cache_root

    def _embedding_function(self, cache_root: Path):
        return LowMemoryMultilingualEmbedding(self.model_name, str(cache_root))

    def index(self, strategy: str = "sections", recreate: bool = True) -> dict:
        cache_root = self._configure_model_cache()
        import chromadb

        documents, chunks = load_corpus(self.corpus_path, strategy)
        client = chromadb.PersistentClient(path=str(self.persist_path))
        name = f"mira_cu1_{strategy}"
        if recreate:
            try:
                client.delete_collection(name)
            except Exception:
                pass
        embedding = self._embedding_function(cache_root)
        collection = client.get_or_create_collection(name=name, embedding_function=embedding)
        collection.upsert(
            ids=[chunk["chunk_id"] for chunk in chunks],
            documents=[chunk["text"] for chunk in chunks],
            metadatas=[self._metadata(chunk) for chunk in chunks],
        )
        manifest = {"strategy": strategy, "documents": documents, "chunks": len(chunks), "embedding_model": self.model_name}
        self.persist_path.mkdir(parents=True, exist_ok=True)
        (self.persist_path / f"manifest_{strategy}.json").write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        return manifest

    def search(self, query: str, strategy: str = "sections", top_k: int = 4) -> list[dict]:
        cache_root = self._configure_model_cache()
        import chromadb

        client = chromadb.PersistentClient(path=str(self.persist_path))
        embedding = self._embedding_function(cache_root)
        try:
            collection = client.get_collection(f"mira_cu1_{strategy}", embedding_function=embedding)
        except Exception as exc:
            raise RuntimeError("El índice RAG no existe. Ejecute `python -m mira_cu1.prepare`.") from exc
        result = collection.query(query_texts=[query], n_results=top_k, include=["documents", "metadatas", "distances"])
        output = []
        for document, metadata, distance in zip(result["documents"][0], result["metadatas"][0], result["distances"][0]):
            output.append({**metadata, "text": document, "distance": distance})
        return output

    def search_lexical(self, query: str, strategy: str = "sections", top_k: int = 4) -> list[dict]:
        """Buscador determinista para pruebas y diagnóstico sin descargar modelos."""
        _, chunks = load_corpus(self.corpus_path, strategy)
        query_terms = _terms(query)
        ranked = []
        for chunk in chunks:
            terms = _terms(chunk["text"] + " " + chunk["section"])
            overlap = len(query_terms & terms)
            score = overlap / max(1, len(query_terms))
            ranked.append((score, chunk))
        return [{**chunk, "distance": 1 - score} for score, chunk in sorted(ranked, key=lambda item: (-item[0], item[1]["chunk_id"]))[:top_k]]

    @staticmethod
    def _metadata(chunk: dict) -> dict:
        allowed = {
            "chunk_id", "document_id", "code", "title", "version", "status",
            "valid_from", "valid_until", "source", "section", "strategy",
            "line_start", "line_end", "origin", "fictional",
        }
        return {key: value if value is not None else "" for key, value in chunk.items() if key in allowed}
