from __future__ import annotations

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from .decision import ClientConfig, ClientConfigMissing, Decision, Signal, decide

Score = Field(ge=0, le=100, allow_inf_nan=False)


class ConfigIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    approval_threshold: float = Score
    min_signal_score: float = Score


class SignalIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1)
    score: float = Score
    is_fraud: bool = False


class CaseIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    signals: list[SignalIn] = []


class DecisionOut(BaseModel):
    decision: Decision
    score: float | None
    reasons: list[str]


def create_app() -> FastAPI:
    app = FastAPI(title="MIRA - decisión automática")
    configs: dict[str, ClientConfig] = {}  # en memoria, uno por cliente

    @app.put("/clients/{client_id}/config", response_model=ConfigIn)
    def put_config(client_id: str, body: ConfigIn) -> ConfigIn:
        configs[client_id] = ClientConfig(body.approval_threshold, body.min_signal_score)
        return body

    @app.get("/clients/{client_id}/config", response_model=ConfigIn)
    def get_config(client_id: str) -> ConfigIn:
        cfg = configs.get(client_id)
        if cfg is None:
            raise _missing(client_id)
        return ConfigIn(**vars(cfg))

    @app.post("/clients/{client_id}/decision", response_model=DecisionOut)
    def post_decision(client_id: str, case: CaseIn) -> DecisionOut:
        try:
            cfg = configs.get(client_id)
            if cfg is None:
                raise ClientConfigMissing(client_id)
        except ClientConfigMissing as exc:
            raise _missing(exc.client_id) from exc
        result = decide([Signal(s.name, s.score, s.is_fraud) for s in case.signals], cfg)
        return DecisionOut(
            decision=result.decision, score=result.score, reasons=list(result.reasons)
        )

    return app


def _missing(client_id: str) -> HTTPException:
    return HTTPException(
        status_code=404,
        detail={
            "error": "client_config_missing",
            "message": f"Falta la configuración del cliente '{client_id}'",
        },
    )


app = create_app()
