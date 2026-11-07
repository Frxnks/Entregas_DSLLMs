from .config import Settings
from .gateway import Gateway
from .provider import DemoProvider, GeminiProvider
from .schemas import ActionProposal, ChatResponse, Citation, ToolTrace


class Orchestrator:
    def __init__(self, settings: Settings, known_names: list[str]):
        self.settings = settings
        self.known_names = known_names

    async def chat(self, message: str, gateway: Gateway) -> ChatResponse:
        provider = DemoProvider() if self.settings.llm_provider == "demo" else GeminiProvider(self.settings, self.known_names)
        result = await provider.answer(message, gateway)
        state = self._state(result.text)
        citations: dict[str, Citation] = {}
        traces: list[ToolTrace] = []
        action = None
        for item in result.tool_results:
            name = item["name"]
            tool_result = item["result"]
            traces.append(ToolTrace(
                tool=name, arguments=next((c["arguments"] for c in result.tool_calls if c["name"] == name), {}),
                ok=bool(tool_result.get("ok")), summary=tool_result.get("error") or "Operación completada",
            ))
            if name == "buscar_reglas" and tool_result.get("ok"):
                for chunk in tool_result.get("data") or []:
                    citation = Citation(
                        chunk_id=chunk["chunk_id"], code=chunk["code"], title=chunk["title"],
                        section=chunk["section"], version=str(chunk["version"]), status=chunk["status"],
                        source=chunk["source"], text=chunk["text"],
                    )
                    citations[citation.chunk_id] = citation
            if name == "preparar_solicitud_antecedentes" and tool_result.get("ok"):
                proposal = tool_result["data"]
                action = ActionProposal(
                    token=proposal["token"], case_id=proposal["case_id"], documents=proposal["documents"],
                    reason=proposal["reason"], expires_at=proposal["expires_at"],
                )
        notice = "Modo de demostración determinista: no se consultó Gemini." if result.model == "demo-determinista" else None
        return ChatResponse(
            answer=self._strip_state(result.text), state=state, citations=list(citations.values()),
            traces=traces, action=action, model=result.model, notice=notice,
        )

    @staticmethod
    def _state(text: str) -> str:
        first = text.strip().splitlines()[0].lower() if text.strip() else ""
        if "conflicto" in first:
            return "conflicto"
        if "abstencion" in first or "abstención" in first:
            return "abstencion"
        if "error" in first:
            return "error"
        return "evidencia"

    @staticmethod
    def _strip_state(text: str) -> str:
        lines = text.strip().splitlines()
        return "\n".join(lines[1:]).strip() if lines and lines[0].lower().startswith("estado:") else text.strip()

