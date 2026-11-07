import json

from fastmcp import FastMCP

from .config import get_settings
from .corpus import load_corpus
from .runtime import get_tools


mcp = FastMCP("MIRA CU-1")


@mcp.tool
def crear_sesion(usuario_id: str) -> dict:
    """Crea una sesión técnica para un usuario ficticio del kit. La API la invoca fuera del LLM."""
    return get_tools().crear_sesion(usuario_id)


@mcp.tool
def contexto_sesion(session_id: str) -> dict:
    """Valida una sesión y devuelve identidad mínima. No debe ofrecerse como herramienta al LLM."""
    return get_tools().contexto_sesion(session_id)


@mcp.tool
def consultar_trazas(session_id: str, limit: int = 30) -> dict:
    """Devuelve la auditoría sanitizada de la sesión para la interfaz."""
    return get_tools().consultar_trazas(session_id, limit)


@mcp.tool
def buscar_reglas(session_id: str, pregunta: str, top_k: int = 4) -> dict:
    """Busca reglas documentales y devuelve fragmentos con fuente, sección, versión y vigencia."""
    return get_tools().buscar_reglas(session_id, pregunta, top_k)


@mcp.tool
def consultar_caso(session_id: str, caso_id: str) -> dict:
    """Consulta un caso autorizado y los umbrales de su organización. No produce efectos."""
    return get_tools().consultar_caso(session_id, caso_id)


@mcp.tool
def listar_senales(session_id: str, caso_id: str) -> dict:
    """Lista señales de un caso autorizado. No produce efectos."""
    return get_tools().listar_senales(session_id, caso_id)


@mcp.tool
def consultar_evidencias(session_id: str, caso_id: str) -> dict:
    """Devuelve extractos sanitizados de las evidencias de un caso autorizado."""
    return get_tools().consultar_evidencias(session_id, caso_id)


@mcp.tool
def consultar_solicitudes(session_id: str, caso_id: str) -> dict:
    """Lista solicitudes existentes de un caso autorizado."""
    return get_tools().consultar_solicitudes(session_id, caso_id)


@mcp.tool
def consultar_cambios_umbral(session_id: str, org_id: str) -> dict:
    """Consulta cambios de umbral de la organización del usuario."""
    return get_tools().consultar_cambios_umbral(session_id, org_id)


@mcp.tool
def preparar_solicitud_antecedentes(session_id: str, caso_id: str, documentos: list[str], motivo: str) -> dict:
    """Valida y prepara una solicitud sin escribir. Devuelve una propuesta que una persona debe confirmar."""
    return get_tools().preparar_solicitud_antecedentes(session_id, caso_id, documentos, motivo)


@mcp.tool
def solicitar_antecedentes(session_id: str, confirmation_token: str) -> dict:
    """Registra una solicitud previamente confirmada. Revalida permisos, estado y límites en el servidor."""
    return get_tools().solicitar_antecedentes(session_id, confirmation_token)


@mcp.resource("mira://corpus/inventario")
def corpus_inventory() -> str:
    """Inventario del corpus ficticio de CU-1."""
    documents, _ = load_corpus(get_settings().corpus_path)
    return json.dumps(documents, ensure_ascii=False, indent=2)


@mcp.prompt
def explicar_caso(caso_id: str) -> str:
    """Plantilla controlada para explicar un caso sin tomar la decisión humana."""
    return (
        f"Explica por qué el caso {caso_id} fue derivado. Consulta el caso y sus señales, "
        "busca las reglas pertinentes, cita fuente, sección y versión, y presenta conflictos sin resolverlos. "
        "No apruebes ni rechaces el caso."
    )


def main() -> None:
    settings = get_settings()
    mcp.run(transport="http", host=settings.mcp_host, port=settings.mcp_port)


if __name__ == "__main__":
    main()
