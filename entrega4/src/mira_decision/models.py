"""Modelos de datos (T-1; AC-11: Decision no contiene RECHAZAR)."""
from enum import Enum

from pydantic import BaseModel, Field


class Decision(str, Enum):
    APROBAR = "APROBAR"
    DERIVAR_A_REVISION = "DERIVAR_A_REVISION"


class Motivo(str, Enum):
    FRAUDE = "FRAUDE"
    SIN_SENALES = "SIN_SENALES"
    SENAL_BAJO_MINIMO = "SENAL_BAJO_MINIMO"
    PUNTAJE_BAJO_UMBRAL = "PUNTAJE_BAJO_UMBRAL"
    PUNTAJE_SOBRE_UMBRAL = "PUNTAJE_SOBRE_UMBRAL"


class Senal(BaseModel):
    puntaje: float = Field(ge=0, le=100)
    es_fraude: bool = False


class CasoAnalizado(BaseModel):
    cliente_id: str = Field(min_length=1)
    senales: list[Senal] = Field(default_factory=list)


class UmbralesCliente(BaseModel):
    umbral_aprobacion: float = Field(ge=0, le=100)
    minimo_por_senal: float = Field(ge=0, le=100)


class ResultadoDecision(BaseModel):
    decision: Decision
    motivo: Motivo
    puntaje: float | None = None
