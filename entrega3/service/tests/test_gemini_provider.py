from types import SimpleNamespace

import pytest

from mira_cu1.config import Settings
from mira_cu1.orchestrator import Orchestrator
from mira_cu1.provider import GeminiProvider


@pytest.mark.asyncio
async def test_gemini_provider_retrieves_documentary_evidence_before_generation(monkeypatch):
    question = "¿Puede el asistente aprobar o rechazar un caso?"
    citation = {
        "chunk_id": "FAQ-OPE:v2:decision",
        "code": "FAQ-OPE",
        "title": "FAQ operación",
        "section": "¿Puedo pedirle al asistente que apruebe o rechace?",
        "version": "2",
        "status": "vigente",
        "source": "FAQ-OPE.md",
        "text": "El asistente no aprueba ni rechaza casos.",
    }

    class RecordingGateway:
        def __init__(self):
            self.calls = []

        async def call(self, name, arguments):
            self.calls.append((name, arguments))
            return {"ok": True, "data": [citation]}

    gateway = RecordingGateway()
    generated = {}
    monkeypatch.setattr("mira_cu1.provider.genai.Client", lambda **kwargs: object())
    settings = Settings(
        _env_file=None,
        gemini_api_key="test-key",
        llm_provider="gemini",
        gemini_min_interval_seconds=0,
    )
    provider = GeminiProvider(settings, [])

    async def generate(model, contents):
        generated["model"] = model
        generated["contents"] = contents
        return SimpleNamespace(
            candidates=[SimpleNamespace(content=object())],
            function_calls=[],
            text="ESTADO: evidencia\nEl asistente no aprueba ni rechaza casos.",
        )

    monkeypatch.setattr(provider, "_generate", generate)

    monkeypatch.setattr("mira_cu1.orchestrator.GeminiProvider", lambda settings, names: provider)
    response = await Orchestrator(settings, []).chat(question, gateway)

    assert gateway.calls == [("buscar_reglas", {"pregunta": question})]
    assert question in generated["contents"][0].parts[0].text
    assert "FAQ-OPE" in generated["contents"][0].parts[1].text
    assert "El asistente no aprueba ni rechaza casos." in generated["contents"][0].parts[1].text
    assert response.state == "evidencia"
    assert response.citations[0].chunk_id == citation["chunk_id"]
    assert response.citations[0].text == citation["text"]
    assert response.traces[0].tool == "buscar_reglas"
    assert response.traces[0].ok is True
