import pytest
from fastapi import HTTPException

from mira_cu1 import main
from mira_cu1.schemas import ChatRequest


@pytest.mark.asyncio
async def test_chat_reports_mcp_unavailable_without_running_generation(monkeypatch):
    async def unavailable(*args, **kwargs):
        raise RuntimeError("MCP no está disponible")

    monkeypatch.setattr(main.McpGateway, "system_call", unavailable)

    with pytest.raises(HTTPException) as raised:
        await main.chat(ChatRequest(session_id="session-1", message="¿Qué dice la política?"))

    assert raised.value.status_code == 503
    assert "MCP no está disponible" in raised.value.detail


@pytest.mark.asyncio
async def test_chat_reports_provider_failure_without_fabricating_an_answer(monkeypatch):
    async def valid_session(*args, **kwargs):
        return {
            "ok": True,
            "data": {"display_name": "Operador de prueba"},
        }

    class FailedOrchestrator:
        def __init__(self, settings, known_names):
            pass

        async def chat(self, message, gateway):
            raise RuntimeError("El proveedor de IA no respondió")

    monkeypatch.setattr(main.McpGateway, "system_call", valid_session)
    monkeypatch.setattr(main, "Orchestrator", FailedOrchestrator)

    with pytest.raises(HTTPException) as raised:
        await main.chat(ChatRequest(session_id="session-1", message="¿Qué dice la política?"))

    assert raised.value.status_code == 503
    assert "El proveedor de IA no respondió" in raised.value.detail
