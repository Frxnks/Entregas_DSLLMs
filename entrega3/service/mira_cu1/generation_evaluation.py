import argparse
import asyncio
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .config import ENTREGA_ROOT, get_settings
from .evaluate import GOLDEN_PATH, validate_golden
from .gateway import McpGateway
from .orchestrator import Orchestrator


def new_review(citations: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "citation_assessments": [
            {"chunk_id": citation["chunk_id"], "supports_answer": None, "note": ""}
            for citation in citations
        ],
        "faithful": None,
        "handling_correct": None,
        "failure_class": None,
        "notes": "",
    }


def _validate_review(sample: dict[str, Any]) -> None:
    review = sample.get("review")
    if not isinstance(review, dict):
        raise ValueError(f"{sample.get('id')}: falta el objeto review")

    citations = sample.get("response", {}).get("citations", [])
    expected_ids = [citation["chunk_id"] for citation in citations]
    assessments = review.get("citation_assessments")
    if not isinstance(assessments, list):
        raise ValueError(f"{sample.get('id')}: citation_assessments debe ser una lista")
    assessed_ids = [item.get("chunk_id") for item in assessments]
    if assessed_ids != expected_ids:
        raise ValueError(f"{sample.get('id')}: las revisiones de citas no coinciden con las citas emitidas")
    for assessment in assessments:
        verdict = assessment.get("supports_answer")
        if verdict is not None and not isinstance(verdict, bool):
            raise ValueError(f"{sample.get('id')}: supports_answer debe ser true, false o null")

    faithful = review.get("faithful")
    if faithful is not None and not isinstance(faithful, bool):
        raise ValueError(f"{sample.get('id')}: faithful debe ser true, false o null")

    handling = review.get("handling_correct")
    if handling is not None and not isinstance(handling, bool):
        raise ValueError(f"{sample.get('id')}: handling_correct debe ser true, false o null")
    if sample.get("type") not in {"current_conflict", "version_change"} and handling is not None:
        raise ValueError(f"{sample.get('id')}: handling_correct solo aplica a conflictos y cambios de versión")

    failure_class = review.get("failure_class")
    if failure_class is not None and failure_class not in ("recovery", "generation", "operational"):
        raise ValueError(f"{sample.get('id')}: failure_class no reconocido")


def _failure_detected(sample: dict[str, Any]) -> bool:
    if sample.get("status") != "completed":
        return True
    response = sample["response"]
    review = sample["review"]
    return (
        (sample["should_answer"] and response["state"] == "abstencion")
        or (not sample["should_answer"] and response["state"] != "abstencion")
        or review["faithful"] is False
        or any(item["supports_answer"] is False for item in review["citation_assessments"])
        or (
            sample["type"] in {"current_conflict", "version_change"}
            and review["handling_correct"] is False
        )
    )


def score_generation_report(report: dict[str, Any]) -> dict[str, Any]:
    samples = report.get("samples")
    if not isinstance(samples, list) or not samples:
        raise ValueError("El reporte no contiene muestras de generación")

    for sample in samples:
        _validate_review(sample)

    citation_reviews = [
        assessment
        for sample in samples
        for assessment in sample["review"]["citation_assessments"]
    ]
    reviewed_citations = [item for item in citation_reviews if item["supports_answer"] is not None]
    faithful_reviews = [
        sample["review"]["faithful"]
        for sample in samples
        if sample["review"]["faithful"] is not None and sample.get("status") == "completed"
    ]
    abstention_questions = [sample for sample in samples if not sample["should_answer"]]
    answerable_questions = [sample for sample in samples if sample["should_answer"]]
    behavior_questions = [
        sample for sample in samples
        if sample.get("status") == "completed"
    ]
    abstention_correct = sum(
        sample["response"]["state"] == "abstencion"
        for sample in abstention_questions
        if sample.get("status") == "completed"
    )
    unjustified_abstentions = sum(
        sample["response"]["state"] == "abstencion"
        for sample in answerable_questions
        if sample.get("status") == "completed"
    )
    handling_samples = [
        sample for sample in samples
        if sample["type"] in {"current_conflict", "version_change"}
    ]
    reviewed_handling = [
        sample["review"]["handling_correct"]
        for sample in handling_samples
        if sample["review"]["handling_correct"] is not None
    ]
    failure_classes = {
        category: sum(sample["review"]["failure_class"] == category for sample in samples)
        for category in ("recovery", "generation", "operational")
    }
    unclassified_failures = [
        sample["id"] for sample in samples
        if _failure_detected(sample) and sample["review"]["failure_class"] is None
    ]

    return {
        "samples": len(samples),
        "complete_golden_set": report.get("status") == "complete" and len(samples) == 20,
        "completed": sum(sample.get("status") == "completed" for sample in samples),
        "operational_errors": sum(sample.get("status") != "completed" for sample in samples),
        "citation_precision": {
            "correct": sum(item["supports_answer"] is True for item in reviewed_citations),
            "reviewed": len(reviewed_citations),
            "unreviewed": len(citation_reviews) - len(reviewed_citations),
            "value": (
                sum(item["supports_answer"] is True for item in reviewed_citations) / len(reviewed_citations)
                if reviewed_citations else None
            ),
        },
        "faithfulness": {
            "faithful": sum(value is True for value in faithful_reviews),
            "reviewed": len(faithful_reviews),
            "unreviewed_completed": sum(
                sample.get("status") == "completed" and sample["review"]["faithful"] is None
                for sample in samples
            ),
            "value": sum(value is True for value in faithful_reviews) / len(faithful_reviews)
            if faithful_reviews else None,
        },
        "abstention": {
            "correct": abstention_correct,
            "without_corpus_answer": len(abstention_questions),
            "correct_rate": abstention_correct / len(abstention_questions) if abstention_questions else None,
            "unjustified": unjustified_abstentions,
            "with_corpus_answer": len(answerable_questions),
            "unjustified_rate": (
                unjustified_abstentions / len(answerable_questions) if answerable_questions else None
            ),
            "completed_questions": len(behavior_questions),
        },
        "conflict_and_version_handling": {
            "correct": sum(value is True for value in reviewed_handling),
            "reviewed": len(reviewed_handling),
            "total": len(handling_samples),
            "unreviewed": len(handling_samples) - len(reviewed_handling),
            "value": sum(value is True for value in reviewed_handling) / len(reviewed_handling)
            if reviewed_handling else None,
        },
        "failure_classification": failure_classes,
        "unclassified_failures": unclassified_failures,
        "manual_review_complete": (
            len(reviewed_citations) == len(citation_reviews)
            and len(faithful_reviews) == sum(sample.get("status") == "completed" for sample in samples)
            and len(reviewed_handling) == len(handling_samples)
            and not unclassified_failures
        ),
    }


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    if temporary.exists():
        raise FileExistsError(f"El archivo temporal ya existe; revíselo antes de continuar: {temporary}")
    temporary.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


async def run_generation_evaluation(output: Path, limit: int | None = None) -> dict[str, Any]:
    settings = get_settings()
    if settings.llm_provider != "gemini":
        raise RuntimeError("La evaluación oficial de generación requiere LLM_PROVIDER=gemini; demo no mide el LLM.")
    if not settings.gemini_api_key:
        raise RuntimeError("Falta GEMINI_API_KEY; configure la clave localmente en entrega3/service/.env.")
    if output.exists():
        raise FileExistsError(f"El archivo de salida ya existe; elija otra ruta para no sobrescribirlo: {output}")

    golden = json.loads(GOLDEN_PATH.read_text(encoding="utf-8"))
    validation = validate_golden(golden, settings.corpus_path)
    if validation["client_validation"]["status"] != "validated":
        raise RuntimeError("El representante del cliente aún no validó el Golden Set.")

    questions = golden["questions"][:limit] if limit is not None else golden["questions"]
    report: dict[str, Any] = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "status": "running",
        "provider": "gemini",
        "configured_model": settings.gemini_model,
        "rag_strategy": settings.rag_strategy,
        "rag_top_k": settings.rag_top_k,
        "golden_set": {
            "version": golden["version"],
            "client_validation": validation["client_validation"],
        },
        "samples": [],
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    _write_json(output, report)

    try:
        session_result = await McpGateway.system_call(
            settings.mcp_url, "crear_sesion", {"usuario_id": "U-01"}
        )
    except RuntimeError as exc:
        report.update({
            "status": "failed",
            "failure_stage": "mcp_session",
            "error_type": type(exc).__name__,
            "error": str(exc),
        })
        _write_json(output, report)
        raise
    if not session_result.get("ok"):
        report.update({
            "status": "failed",
            "failure_stage": "mcp_session",
            "error": f"No se pudo crear una sesión de evaluación MCP: {session_result.get('error')}",
        })
        _write_json(output, report)
        raise RuntimeError(report["error"])
    session = session_result["data"]
    gateway = McpGateway(settings.mcp_url, session["session_id"])
    orchestrator = Orchestrator(settings, [session["display_name"]])

    for question in questions:
        sample: dict[str, Any] = {
            "id": question["id"],
            "type": question["type"],
            "question": question["question"],
            "should_answer": question["should_answer"],
            "expected_evidence": question["expected_evidence"],
            "expected_answer": question["expected_answer"],
        }
        try:
            response = await orchestrator.chat(question["question"], gateway)
            response_data = response.model_dump(mode="json")
            sample.update({
                "status": "completed",
                "response": response_data,
                "review": new_review(response_data["citations"]),
            })
        except RuntimeError as exc:
            error_review = new_review([])
            error_review["failure_class"] = "operational"
            error_review["notes"] = "Fallo de proveedor o servicio durante la evaluación."
            sample.update({
                "status": "error",
                "error_type": type(exc).__name__,
                "error": str(exc),
                "response": {"answer": "", "state": "error", "citations": [], "traces": [], "model": None},
                "review": error_review,
            })
        report["samples"].append(sample)
        report["status"] = "complete" if len(report["samples"]) == len(golden["questions"]) else "partial"
        report["scores"] = score_generation_report(report)
        _write_json(output, report)
        print(f"{sample['id']}: {sample['status']}")

    report["status"] = "complete" if len(questions) == len(golden["questions"]) else "partial"
    report["scores"] = score_generation_report(report)
    _write_json(output, report)
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="Evalúa la generación Gemini con el Golden Set CU-1")
    parser.add_argument("--limit", type=int, help="Ejecuta una muestra parcial; no produce evaluación final")
    parser.add_argument("--output", type=Path, help="Ruta nueva para el JSON; nunca sobrescribe archivos")
    parser.add_argument("--score-existing", type=Path, help="Calcula métricas de un reporte revisado manualmente")
    args = parser.parse_args()

    if args.score_existing:
        report = json.loads(args.score_existing.read_text(encoding="utf-8"))
        scores = score_generation_report(report)
        output = args.output or args.score_existing.with_name(args.score_existing.stem + "_scores.json")
        if output.exists():
            raise FileExistsError(f"El archivo de salida ya existe; elija otra ruta para no sobrescribirlo: {output}")
        _write_json(output, {"source_report": str(args.score_existing), "scores": scores})
        print(json.dumps(scores, ensure_ascii=False, indent=2))
        return

    if args.limit is not None and not 1 <= args.limit <= 20:
        parser.error("--limit debe estar entre 1 y 20")
    output = args.output or (
        ENTREGA_ROOT / "evaluacion"
        / f"generacion_gemini_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    )
    report = asyncio.run(run_generation_evaluation(output, args.limit))
    print(json.dumps(report["scores"], ensure_ascii=False, indent=2))
    print(f"Reporte guardado en {output}")


if __name__ == "__main__":
    main()
