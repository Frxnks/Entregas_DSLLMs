from types import SimpleNamespace

import pytest
from google.genai import types

from mira_cu1.config import Settings
from mira_cu1.evaluate_generation import DocumentaryGateway
from mira_cu1.provider import GeminiProvider


@pytest.mark.asyncio
async def test_documentary_evaluation_denies_operational_tools():
    gateway = DocumentaryGateway(None, "sections", 4)
    result = await gateway.call("solicitar_antecedentes", {"confirmation_token": "forged"})
    assert not result["ok"]
    assert result["data"] is None


@pytest.mark.asyncio
async def test_confirmation_token_reaches_local_ui_but_not_model():
    provider = GeminiProvider(Settings(gemini_api_key="test-not-a-real-key"), [])
    captured = []
    call = SimpleNamespace(name="preparar_solicitud_antecedentes", args={"caso_id": "C-013", "documentos": ["foto"], "motivo": "verificar"})

    async def generate(model, contents):
        captured.append(contents[-1])
        if len(captured) == 1:
            return SimpleNamespace(candidates=[SimpleNamespace(content=types.Content(role="model", parts=[types.Part.from_function_call(name=call.name, args=call.args)]))], function_calls=[call])
        return SimpleNamespace(candidates=[SimpleNamespace(content=types.Content(role="model", parts=[types.Part.from_text(text="ESTADO: evidencia\nConfirme la propuesta.")]))], function_calls=[], text="ESTADO: evidencia\nConfirme la propuesta.")

    class Gateway:
        async def call(self, name, args):
            return {"ok": True, "data": {"token": "local-secret", "case_id": "C-013"}}

    provider._generate = generate
    try:
        result = await provider.answer("Preparar solicitud", Gateway())
        assert result.tool_results[0]["result"]["data"]["token"] == "local-secret"
        assert captured[1].parts[0].function_response.response["data"]["token"] == "[EXCLUIDO]"
    finally:
        await provider.client.aio.aclose()


@pytest.mark.asyncio
async def test_model_cannot_execute_unlisted_write_tool():
    provider = GeminiProvider(Settings(gemini_api_key="test-not-a-real-key"), [])

    async def generate(model, contents):
        return SimpleNamespace(candidates=[SimpleNamespace(content=types.Content(role="model", parts=[]))], function_calls=[SimpleNamespace(name="solicitar_antecedentes", args={})])

    provider._generate = generate
    try:
        with pytest.raises(RuntimeError, match="no permitida"):
            await provider.answer("Escribe", None)
    finally:
        await provider.client.aio.aclose()
