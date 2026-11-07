"""Sanitización previa a cualquier envío hacia el proveedor externo.

El filtro reduce exposición accidental; no se presenta como anonimización universal.
"""
import re
from collections.abc import Mapping, Sequence
from typing import Any


SENSITIVE_KEYS = {
    "nombre", "display_name", "email", "telefono", "phone", "rut",
    "api_key", "token", "session_id", "confirmation_token", "ruta", "path",
}
RUT_RE = re.compile(r"\b\d{1,2}\.\d{3}\.\d{3}-[0-9Kk]\b")
EMAIL_RE = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.I)
PHONE_RE = re.compile(r"(?<!\w)(?:\+?56\s*)?(?:9\s*)?\d{4}[ -]?\d{4}(?!\w)")


def sanitize_text(value: str, known_names: Sequence[str] = ()) -> str:
    clean = RUT_RE.sub("[RUT ENMASCARADO]", value)
    clean = EMAIL_RE.sub("[CORREO ENMASCARADO]", clean)
    clean = PHONE_RE.sub("[TELÉFONO ENMASCARADO]", clean)
    for name in sorted((n for n in known_names if n), key=len, reverse=True):
        clean = re.sub(re.escape(name), "[NOMBRE ENMASCARADO]", clean, flags=re.I)
    return clean


def sanitize_for_llm(value: Any, known_names: Sequence[str] = ()) -> Any:
    if isinstance(value, str):
        return sanitize_text(value, known_names)
    if isinstance(value, Mapping):
        return {
            key: "[EXCLUIDO]" if key.lower() in SENSITIVE_KEYS else sanitize_for_llm(item, known_names)
            for key, item in value.items()
        }
    if isinstance(value, Sequence) and not isinstance(value, (str, bytes, bytearray)):
        return [sanitize_for_llm(item, known_names) for item in value]
    return value

