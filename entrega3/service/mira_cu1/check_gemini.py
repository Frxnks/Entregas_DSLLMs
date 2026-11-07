"""Prueba mínima de conexión; no imprime claves ni mensajes crudos del proveedor."""
import json
from google import genai
from google.genai import types
from .config import get_settings


def main():
    settings = get_settings()
    report = {"model": settings.gemini_model, "key_configured": bool(settings.gemini_api_key)}
    if not settings.gemini_api_key:
        report["status"] = "missing_key"
    else:
        try:
            with genai.Client(api_key=settings.gemini_api_key, http_options=types.HttpOptions(timeout=30000)) as client:
                result = client.models.generate_content(
                    model=settings.gemini_model,
                    contents="Responde únicamente OK.",
                    config=types.GenerateContentConfig(max_output_tokens=256),
                )
                report.update(status="connected", has_text=bool(result.text),
                              usage=result.usage_metadata.model_dump(mode="json") if result.usage_metadata else None)
        except Exception as exc:
            message = str(getattr(exc, "message", "")).replace(settings.gemini_api_key, "[CLAVE EXCLUIDA]")[:800]
            report.update(status="connection_error", error_type=type(exc).__name__, code=getattr(exc, "code", None), message=message)
    target = settings.runtime_dir / "gemini_connection.json"
    target.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    main()
