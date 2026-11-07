import argparse
import asyncio
import json

from fastmcp import Client

from .config import get_settings


async def run(tool: str, arguments: dict) -> None:
    async with Client(get_settings().mcp_url) as client:
        result = await client.call_tool(tool, arguments)
        data = getattr(result, "data", None) or getattr(result, "structured_content", None)
        print(json.dumps(data, ensure_ascii=False, indent=2, default=str))


def main() -> None:
    parser = argparse.ArgumentParser(description="Cliente externo de demostración para el servidor MCP")
    parser.add_argument("tool", choices=["buscar_reglas", "consultar_caso", "listar_senales", "consultar_evidencias", "consultar_solicitudes", "consultar_cambios_umbral"])
    parser.add_argument("--session", required=True)
    parser.add_argument("--case")
    parser.add_argument("--org")
    parser.add_argument("--question")
    args = parser.parse_args()
    arguments = {"session_id": args.session}
    if args.case:
        arguments["caso_id"] = args.case
    if args.org:
        arguments["org_id"] = args.org
    if args.question:
        arguments["pregunta"] = args.question
    asyncio.run(run(args.tool, arguments))


if __name__ == "__main__":
    main()
