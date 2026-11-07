import json
from typing import Any, Protocol

from fastmcp import Client

from .tools import ToolService


class Gateway(Protocol):
    async def call(self, name: str, arguments: dict[str, Any]) -> dict: ...


class McpGateway:
    """La API usa el protocolo MCP; no abre SQLite."""

    def __init__(self, url: str, session_id: str):
        self.url = url
        self.session_id = session_id

    @staticmethod
    async def system_call(url: str, name: str, arguments: dict[str, Any]) -> dict:
        """Llama herramientas técnicas que no se exponen al modelo."""
        return await _call_mcp(url, name, arguments)

    async def call(self, name: str, arguments: dict[str, Any]) -> dict:
        # La identidad se inyecta en el servidor de la API, no se acepta desde el modelo.
        safe_arguments = {key: value for key, value in arguments.items() if key != "session_id"}
        safe_arguments["session_id"] = self.session_id
        return await _call_mcp(self.url, name, safe_arguments)


async def _call_mcp(url: str, name: str, arguments: dict[str, Any]) -> dict:
    async with Client(url) as client:
        result = await client.call_tool(name, arguments)
    if getattr(result, "data", None) is not None:
        return result.data
    if getattr(result, "structured_content", None) is not None:
        return result.structured_content
    content = getattr(result, "content", [])
    if content and hasattr(content[0], "text"):
        try:
            return json.loads(content[0].text)
        except json.JSONDecodeError:
            return {"ok": True, "data": content[0].text}
    raise RuntimeError(f"Respuesta MCP no interpretable para {name}")


class DirectGateway:
    """Adaptador exclusivo para pruebas aisladas del orquestador."""

    def __init__(self, tools: ToolService, session_id: str):
        self.tools = tools
        self.session_id = session_id

    async def call(self, name: str, arguments: dict[str, Any]) -> dict:
        allowed = {
            "buscar_reglas", "consultar_caso", "listar_senales", "consultar_evidencias",
            "consultar_solicitudes", "consultar_cambios_umbral",
            "preparar_solicitud_antecedentes", "solicitar_antecedentes",
        }
        if name not in allowed:
            raise ValueError(f"Herramienta no permitida: {name}")
        return getattr(self.tools, name)(self.session_id, **arguments)

