import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

from .config import ENTREGA_ROOT, get_settings
from .corpus import load_corpus
from .rag import RagEngine


GOLDEN_PATH = ENTREGA_ROOT / "evaluacion" / "golden_set.json"


def validate_golden(golden: dict, corpus_path: Path) -> dict:
    questions = golden["questions"]
    counts: dict[str, int] = {}
    for question in questions:
        counts[question["type"]] = counts.get(question["type"], 0) + 1
    expected = {"answerable": 12, "unanswerable": 4, "current_conflict": 2, "version_change": 2}
    if len(questions) != 20 or counts != expected:
        raise ValueError(f"Composición inválida del golden set: {counts}")
    if len({q["id"] for q in questions}) != len(questions):
        raise ValueError("Hay IDs de preguntas repetidos")
    documents, chunks = load_corpus(corpus_path)
    for question in questions:
        if question["should_answer"] != (question["type"] != "unanswerable"):
            raise ValueError(f"should_answer incoherente en {question['id']}")
        for evidence in question["expected_evidence"]:
            if not any(
                chunk["code"] == evidence["code"] and str(chunk["version"]) == evidence["version"]
                and evidence["section"].lower() in chunk["section"].lower()
                for chunk in chunks
            ):
                raise ValueError(f"Evidencia inexistente en {question['id']}: {evidence}")
    return {"total": len(questions), "counts": counts, "documents": len(documents), "client_validation": golden["client_validation"]}


def matches(result: dict, evidence: dict) -> bool:
    return (
        result["code"] == evidence["code"]
        and str(result["version"]) == evidence["version"]
        and evidence["section"].lower() in result["section"].lower()
    )


def retrieval_experiment(engine: RagEngine, golden: dict, strategy: str, top_k: int, lexical: bool) -> dict:
    rows = []
    eligible = [q for q in golden["questions"] if q["expected_evidence"]]
    for question in eligible:
        results = (
            engine.search_lexical(question["question"], strategy, top_k)
            if lexical else engine.search(question["question"], strategy, top_k)
        )
        found = [any(matches(result, evidence) for result in results) for evidence in question["expected_evidence"]]
        rows.append({
            "id": question["id"], "expected": len(found), "found": sum(found),
            "all_expected_retrieved": all(found), "retrieved_chunks": [item["chunk_id"] for item in results],
        })
    return {
        "strategy": strategy, "top_k": top_k, "backend": "lexical-diagnostic" if lexical else "semantic-chroma",
        "recall_at_k_questions": sum(row["all_expected_retrieved"] for row in rows) / len(rows),
        "recall_at_k_fragments": sum(row["found"] for row in rows) / sum(row["expected"] for row in rows),
        "results": rows,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Valida el golden set y compara la recuperación")
    parser.add_argument("--top-k", type=int, default=4)
    parser.add_argument("--lexical", action="store_true", help="Diagnóstico sin embeddings; no sustituye la métrica final")
    args = parser.parse_args()
    settings = get_settings()
    golden = json.loads(GOLDEN_PATH.read_text(encoding="utf-8"))
    validation = validate_golden(golden, settings.corpus_path)
    engine = RagEngine(settings.corpus_path, settings.chroma_path, settings.rag_embedding_model)
    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(), "validation": validation,
        "experiments": [
            retrieval_experiment(engine, golden, "sections", args.top_k, args.lexical),
            retrieval_experiment(engine, golden, "windows", args.top_k, args.lexical),
        ],
        "limitations": [
            "Este reporte mide recuperación; precisión de citas, fidelidad y abstención requieren evaluar la generación.",
            "El modo lexical es diagnóstico y no reemplaza la evaluación semántica final con ChromaDB.",
        ],
    }
    serialized = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    output = settings.runtime_dir / "retrieval_evaluation.json"
    output.write_text(serialized, encoding="utf-8")
    (ENTREGA_ROOT / "evaluacion" / "resultados_recuperacion.json").write_text(serialized, encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

