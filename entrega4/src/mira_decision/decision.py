"""Decisión de un caso analizado (T-3 a T-5; RN-1 a RN-11)."""
from .models import (
    CasoAnalizado,
    Decision,
    Motivo,
    ResultadoDecision,
    UmbralesCliente,
)


def _derivar(motivo: Motivo, puntaje: float | None = None) -> ResultadoDecision:
    return ResultadoDecision(
        decision=Decision.DERIVAR_A_REVISION, motivo=motivo, puntaje=puntaje
    )


def decidir(caso: CasoAnalizado, umbrales: UmbralesCliente) -> ResultadoDecision:
    if any(s.es_fraude for s in caso.senales):
        return _derivar(Motivo.FRAUDE)
    if not caso.senales:
        return _derivar(Motivo.SIN_SENALES)

    puntaje = sum(s.puntaje for s in caso.senales) / len(caso.senales)

    if any(s.puntaje < umbrales.minimo_por_senal for s in caso.senales):
        return _derivar(Motivo.SENAL_BAJO_MINIMO, puntaje)
    if puntaje >= umbrales.umbral_aprobacion:
        return ResultadoDecision(
            decision=Decision.APROBAR,
            motivo=Motivo.PUNTAJE_SOBRE_UMBRAL,
            puntaje=puntaje,
        )
    return _derivar(Motivo.PUNTAJE_BAJO_UMBRAL, puntaje)
