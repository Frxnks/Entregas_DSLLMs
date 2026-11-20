"""Lógica de decisión automática de MIRA (sin dependencias de FastAPI).

Reglas:
- MIRA solo puede APROBAR o DERIVAR a revisión. Nunca rechaza.
- Sin configuración del cliente: no decide (error).
- Sin señales: deriva.
- Cualquier señal de fraude: deriva, sin importar el puntaje.
- Promedio simple de señales < umbral de aprobación: deriva.
- Alguna señal < mínimo por señal del cliente: deriva, aunque el promedio alcance.
- En otro caso: aprueba (promedio >= umbral).
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from enum import StrEnum


class Decision(StrEnum):
    APROBAR = "APROBAR"
    REVISION = "REVISION"


class ClientConfigMissing(Exception):
    def __init__(self, client_id: str) -> None:
        super().__init__(f"Falta la configuración del cliente '{client_id}'")
        self.client_id = client_id


def _check_score(value: float, what: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{what} debe ser numérico")
    if math.isnan(value) or not 0 <= value <= 100:
        raise ValueError(f"{what} debe estar entre 0 y 100")
    return float(value)


@dataclass(frozen=True)
class ClientConfig:
    approval_threshold: float
    min_signal_score: float

    def __post_init__(self) -> None:
        _check_score(self.approval_threshold, "approval_threshold")
        _check_score(self.min_signal_score, "min_signal_score")


@dataclass(frozen=True)
class Signal:
    name: str
    score: float
    is_fraud: bool = False

    def __post_init__(self) -> None:
        _check_score(self.score, f"El puntaje de la señal '{self.name}'")


@dataclass(frozen=True)
class Result:
    decision: Decision
    score: float | None
    reasons: tuple[str, ...]


def decide(signals: list[Signal], config: ClientConfig) -> Result:
    if not signals:
        return Result(Decision.REVISION, None, ("sin_senales",))

    score = sum(s.score for s in signals) / len(signals)
    reasons: list[str] = []

    if any(s.is_fraud for s in signals):
        reasons.append("senal_de_fraude")
    if score < config.approval_threshold:
        reasons.append("puntaje_bajo_umbral")
    if any(s.score < config.min_signal_score for s in signals):
        reasons.append("senal_bajo_minimo")

    if reasons:
        return Result(Decision.REVISION, score, tuple(reasons))
    return Result(Decision.APROBAR, score, ())
