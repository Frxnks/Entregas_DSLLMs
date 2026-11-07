"""Evaluación documental con Gemini, reanudable y sin acceso a SQLite."""
import argparse
import asyncio
import hashlib
import html
import json
from datetime import datetime, timezone
from pathlib import Path

from .config import ENTREGA_ROOT, get_settings
from .evaluate import GOLDEN_PATH, validate_golden
from .provider import GeminiProvider
from .orchestrator import Orchestrator
from .rag import RagEngine
from .security import sanitize_for_llm


class DocumentaryGateway:
    """La evaluación documental no puede consultar casos ni ejecutar acciones."""
    def __init__(self, rag, strategy, top_k):
        self.rag, self.strategy, self.top_k = rag, strategy, top_k

    async def call(self, name, arguments):
        if name != "buscar_reglas":
            return {"ok": False, "data": None, "error": "Evaluación documental: solo buscar_reglas está permitido"}
        results = await asyncio.to_thread(self.rag.search, arguments["pregunta"], self.strategy, self.top_k)
        return {"ok": True, "data": results, "error": None}


def write_review(golden):
    """Hoja legible de aceptación; no registra aprobación automáticamente."""
    esc = html.escape
    rows = []
    for q in golden["questions"]:
        sources = "; ".join(f'{e["code"]} v{e["version"]} — {e["section"]}' for e in q["expected_evidence"])
        rows.append(f'<article><h2>{esc(q["id"])} · {esc(q["question"])}</h2><p><b>Respuesta esperada:</b> {esc(q["expected_answer"])}</p><p><b>Fuentes:</b> {esc(sources or "Sin respaldo en el corpus")}</p><p>Decisión: ☐ Aceptar ☐ Corregir</p><p>Observaciones: __________________________________________</p></article>')
    digest = hashlib.sha256(GOLDEN_PATH.read_bytes()).hexdigest()
    output = ENTREGA_ROOT / "evaluacion" / "revision_nikolas.html"
    output.write_text('<!doctype html><html lang="es"><meta charset="utf-8"><title>Validación Golden Set — Nikolas</title><style>body{font:16px Arial;max-width:900px;margin:40px auto;color:#123047}article{border:1px solid #bcc;padding:20px;margin:20px 0;break-inside:avoid}h2{font-size:18px}code{overflow-wrap:anywhere}@media print{body{margin:15mm}}</style><h1>Validación del Golden Set</h1><p>Representante: Nikolas. Estado: PENDIENTE.</p><p>Revisar cada respuesta contra el corpus. Indicar correcciones por ID. La firma confirma únicamente la versión identificada por este hash.</p><p>SHA-256: <code>'+digest+'</code></p>'+''.join(rows)+'<p>Fecha: __________ Firma o aprobación escrita: __________________</p></html>', encoding="utf-8")
    return output


async def run(args):
    settings = get_settings()
    golden = json.loads(GOLDEN_PATH.read_text(encoding="utf-8"))
    validate_golden(golden, settings.corpus_path)
    if args.review:
        print(write_review(golden))
        return
    if args.check:
        print(json.dumps({"key_configured": bool(settings.gemini_api_key), "model": settings.gemini_model,
                          "client_validation": golden["client_validation"]["status"],
                          "index_exists": (settings.chroma_path / "manifest_sections.json").exists()}))
        return
    if not settings.gemini_api_key:
        raise SystemExit("Configure la clave con entrega3/configurar-gemini.ps1. No la envíe al chat.")
    if golden["client_validation"]["status"] != "approved":
        raise SystemExit("Falta la aprobación documentada de Nikolas. Puede generar la hoja con --review.")
    fingerprint = hashlib.sha256(GOLDEN_PATH.read_bytes()).hexdigest()
    out = settings.runtime_dir / "generation" / f"{fingerprint[:12]}_{args.strategy}"
    out.mkdir(parents=True, exist_ok=True)
    config = {"golden_sha256": fingerprint, "strategy": args.strategy, "k": settings.rag_top_k,
              "model": settings.gemini_model, "fallback": settings.gemini_fallback_model,
              "embedding_model": settings.rag_embedding_model}
    manifest = out / "manifest.json"
    if manifest.exists() and json.loads(manifest.read_text()) != config:
        raise SystemExit("La configuración cambió: use una carpeta de ejecución nueva para no mezclar resultados.")
    manifest.write_text(json.dumps(config, indent=2), encoding="utf-8")
    rag = RagEngine(settings.corpus_path, settings.chroma_path, settings.rag_embedding_model)
    gateway = DocumentaryGateway(rag, args.strategy, settings.rag_top_k)
    provider = GeminiProvider(settings, [])
    # Una instancia conserva el rate limiter entre preguntas.
    provider.tool.function_declarations = [d for d in provider.tool.function_declarations if d.name == "buscar_reglas"]
    try:
        for q in golden["questions"]:
            output = out / f'{q["id"]}.json'
            if output.exists() and json.loads(output.read_text(encoding="utf-8")).get("status") == "completed":
                continue
            record = {"id": q["id"], "type": q["type"], "question": q["question"],
                      "expected_answer": q["expected_answer"], "timestamp": datetime.now(timezone.utc).isoformat()}
            try:
                result = await provider.answer(q["question"], gateway)
                record.update(status="completed", answer=result.text, state=Orchestrator._state(result.text),
                              model=result.model, usage=result.usage, tool_calls=result.tool_calls,
                              retrieved=sanitize_for_llm(result.tool_results),
                              human_review={"citation_precision": None, "faithfulness": None,
                                            "correct_abstention": None, "unjustified_abstention": None,
                                            "conflict_or_version_correct": None, "failure_class": None})
            except Exception as exc:
                record.update(status="operational_error", error_type=type(exc).__name__)
            output.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
            print(f'{q["id"]}: {record["status"]}', flush=True)
            if record["status"] == "operational_error":
                print("Corrida detenida; los resultados completados se conservan. Reejecute para reanudar.")
                break
    finally:
        await provider.client.aio.aclose()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Comprueba preparación sin llamar a Gemini")
    parser.add_argument("--review", action="store_true", help="Genera la hoja de Nikolas sin llamar a Gemini")
    parser.add_argument("--strategy", choices=["sections", "windows"], default="sections")
    asyncio.run(run(parser.parse_args()))


if __name__ == "__main__":
    main()
