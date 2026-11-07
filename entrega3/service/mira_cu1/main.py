from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .gateway import McpGateway
from .orchestrator import Orchestrator
from .schemas import ChatRequest, ChatResponse, ConfirmRequest, SessionRequest, SessionResponse


settings = get_settings()
app = FastAPI(title="MIRA CU-1 API", version="3.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.mira_cors_origin], allow_credentials=False,
    allow_methods=["GET", "POST"], allow_headers=["Content-Type"],
)


@app.get("/api/health")
def health() -> dict:
    return {
        "status": "ok", "version": "3.0.0", "provider": settings.llm_provider,
        "model": settings.gemini_model if settings.llm_provider == "gemini" else "demo-determinista",
        "gemini_configured": bool(settings.gemini_api_key), "mcp_url": settings.mcp_url,
    }


@app.post("/api/sessions", response_model=SessionResponse)
async def create_session(request: SessionRequest) -> dict:
    try:
        result = await McpGateway.system_call(settings.mcp_url, "crear_sesion", {"usuario_id": request.user_id})
        if not result.get("ok"):
            raise HTTPException(status_code=403, detail=result.get("error"))
        return result["data"]
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    try:
        context = await McpGateway.system_call(
            settings.mcp_url, "contexto_sesion", {"session_id": request.session_id}
        )
        if not context.get("ok"):
            raise HTTPException(status_code=403, detail=context.get("error"))
        gateway = McpGateway(settings.mcp_url, request.session_id)
        return await Orchestrator(settings, [context["data"]["display_name"]]).chat(request.message, gateway)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.post("/api/acciones/confirmar")
async def confirm(request: ConfirmRequest) -> dict:
    try:
        result = await McpGateway(settings.mcp_url, request.session_id).call(
            "solicitar_antecedentes", {"confirmation_token": request.token}
        )
        if not result.get("ok"):
            raise HTTPException(status_code=409, detail=result.get("error"))
        return result
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.get("/api/traces/{session_id}")
async def traces(session_id: str) -> list[dict]:
    try:
        result = await McpGateway.system_call(
            settings.mcp_url, "consultar_trazas", {"session_id": session_id, "limit": 50}
        )
        if not result.get("ok"):
            raise HTTPException(status_code=403, detail=result.get("error"))
        return result["data"]
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


def run() -> None:
    import uvicorn
    uvicorn.run(app, host=settings.api_host, port=settings.api_port)


if __name__ == "__main__":
    run()

