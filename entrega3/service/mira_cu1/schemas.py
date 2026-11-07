from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


ResponseState = Literal["evidencia", "abstencion", "conflicto", "error"]


class Citation(BaseModel):
    chunk_id: str
    code: str
    title: str
    section: str
    version: str
    status: str
    source: str
    text: str


class ToolTrace(BaseModel):
    tool: str
    arguments: dict[str, Any]
    ok: bool
    summary: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ActionProposal(BaseModel):
    token: str
    case_id: str
    documents: list[str]
    reason: str
    expires_at: str


class ChatRequest(BaseModel):
    session_id: str
    message: str = Field(min_length=1, max_length=4000)


class ChatResponse(BaseModel):
    answer: str
    state: ResponseState
    citations: list[Citation] = Field(default_factory=list)
    traces: list[ToolTrace] = Field(default_factory=list)
    action: ActionProposal | None = None
    model: str | None = None
    notice: str | None = None


class SessionRequest(BaseModel):
    user_id: str


class SessionResponse(BaseModel):
    session_id: str
    user_id: str
    role: str
    org_id: str
    display_name: str


class ConfirmRequest(BaseModel):
    session_id: str
    token: str


class ToolResult(BaseModel):
    ok: bool
    data: Any = None
    error: str | None = None
    trace_id: str | None = None

