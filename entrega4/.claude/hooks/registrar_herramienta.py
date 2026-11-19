"""Hook PreToolUse: registra cada uso de herramienta (incluidas skills y subagentes)
en docs/evidencia/traza-herramientas.jsonl. Nunca bloquea: siempre termina con 0."""
import datetime
import json
import os
import pathlib
import sys


def main() -> int:
    try:
        data = json.load(sys.stdin)
    except Exception:
        return 0
    entrada = {k: str(v)[:200] for k, v in (data.get("tool_input") or {}).items()}
    registro = {
        "ts": datetime.datetime.now().isoformat(timespec="seconds"),
        "herramienta": data.get("tool_name"),
        "agente": data.get("agent_type") or data.get("agent_id") or "principal",
        "entrada": entrada,
        "sesion": data.get("session_id"),
        "claves": sorted(data.keys()),
    }
    raiz = pathlib.Path(os.environ.get("CLAUDE_PROJECT_DIR", "."))
    salida = raiz / "docs" / "evidencia" / "traza-herramientas.jsonl"
    try:
        salida.parent.mkdir(parents=True, exist_ok=True)
        with salida.open("a", encoding="utf-8") as f:
            f.write(json.dumps(registro, ensure_ascii=False) + "\n")
    except Exception:
        pass
    return 0


if __name__ == "__main__":
    sys.exit(main())
