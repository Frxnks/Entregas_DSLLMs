import json

import pytest

from mira_cu1.config import ENTREGA_ROOT, KIT_ROOT
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

