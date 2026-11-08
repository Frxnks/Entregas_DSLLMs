import json
from types import SimpleNamespace

import pytest

from mira_cu1.config import ENTREGA_ROOT, KIT_ROOT, Settings
from mira_cu1.corpus import load_corpus
from mira_cu1.evaluate import validate_golden
from mira_cu1.security import sanitize_for_llm, sanitize_text


def test_corpus_keeps_versions_and_current_conflict():
    documents, chunks = load_corpus(KIT_ROOT / "corpus")
    assert len(documents) == 6
    versions = {(doc["code"], doc["version"], doc["status"]) for doc in documents}
    assert ("POL-DEC", "1", "derogada") in versions
    assert ("POL-DEC", "2", "vigente") in versions
    assert any(chunk["code"] == "MAN-REV" and "80 o más" in chunk["text"] for chunk in chunks)
    assert any(chunk["code"] == "POL-DEC" and chunk["version"] == "2" and "85 o más" in chunk["text"] for chunk in chunks)


def test_golden_set_has_official_composition():
    golden = json.loads((ENTREGA_ROOT / "evaluacion" / "golden_set.json").read_text(encoding="utf-8"))
    report = validate_golden(golden, KIT_ROOT / "corpus")
    assert report["counts"] == {"answerable": 12, "unanswerable": 4, "current_conflict": 2, "version_change": 2}


def test_default_rag_top_k_includes_fifth_relevant_chunk():
    assert Settings.model_fields["rag_top_k"].default == 5


def test_mcp_rule_search_uses_server_configured_top_k(monkeypatch):
    from mira_cu1 import mcp_server
    from mira_cu1.provider import TOOL_DECLARATIONS

    class ToolsStub:
        def buscar_reglas(self, session_id: str, pregunta: str, top_k: int) -> dict:
            return {"session_id": session_id, "pregunta": pregunta, "top_k": top_k}

    monkeypatch.setattr(mcp_server, "get_settings", lambda: SimpleNamespace(rag_top_k=5))
    monkeypatch.setattr(mcp_server, "get_tools", lambda: ToolsStub())

    search_tool = next(tool for tool in TOOL_DECLARATIONS if tool["name"] == "buscar_reglas")
    assert "top_k" not in search_tool["parameters"]["properties"]
    assert mcp_server.buscar_reglas("session-1", "consulta") == {
        "session_id": "session-1",
        "pregunta": "consulta",
        "top_k": 5,
    }


def test_pii_sanitizer_masks_common_identifiers():
    text = "Paula Rojas, RUT 18.234.567-8, paula@example.com, teléfono +56 9 1234 5678"
    clean = sanitize_text(text, ["Paula Rojas"])
    assert "Paula Rojas" not in clean
    assert "18.234.567-8" not in clean
    assert "paula@example.com" not in clean
    assert "1234 5678" not in clean


def test_sensitive_keys_are_excluded():
    result = sanitize_for_llm({"session_id": "secret", "api_key": "secret", "caso_id": "C-011"})
    assert result == {"session_id": "[EXCLUIDO]", "api_key": "[EXCLUIDO]", "caso_id": "C-011"}


def test_original_kit_rows_are_immutable(database):
    import sqlite3
    with database.connect() as connection, pytest.raises(sqlite3.IntegrityError, match="inmutables"):
        connection.execute("UPDATE casos SET puntaje=1 WHERE caso_id='C-011'")
