"""Pruebas de decidir() para AC-1 a AC-13."""
import pytest

from mira_decision.decision import decidir
from mira_decision.models import (
    CasoAnalizado,
    Decision,
    Motivo,
    Senal,
    UmbralesCliente,
)


def caso(*puntajes, fraude_en=()):
    return CasoAnalizado(
        cliente_id="c",
        senales=[Senal(puntaje=p, es_fraude=(i in fraude_en)) for i, p in enumerate(puntajes)],
    )


def umbrales(umbral, minimo):
    return UmbralesCliente(umbral_aprobacion=umbral, minimo_por_senal=minimo)


def test_ac1_puntaje_es_promedio_simple():
    r = decidir(caso(95, 93), umbrales(90, 50))
    assert r.puntaje == 94


def test_ac2_aprueba_sobre_umbral():
    r = decidir(caso(95, 93), umbrales(90, 50))
    assert r.decision == Decision.APROBAR
    assert r.motivo == Motivo.PUNTAJE_SOBRE_UMBRAL


def test_ac3_aprueba_con_puntaje_igual_al_umbral():
    r = decidir(caso(80, 90), umbrales(85, 50))
    assert r.decision == Decision.APROBAR
    assert r.motivo == Motivo.PUNTAJE_SOBRE_UMBRAL


def test_ac4_deriva_bajo_umbral():
    r = decidir(caso(80, 88), umbrales(85, 50))
    assert r.decision == Decision.DERIVAR_A_REVISION
    assert r.motivo == Motivo.PUNTAJE_BAJO_UMBRAL


def test_ac5_deriva_por_senal_bajo_minimo_aunque_promedio_alcance():
    r = decidir(caso(100, 100, 40), umbrales(70, 50))
    assert r.decision == Decision.DERIVAR_A_REVISION
    assert r.motivo == Motivo.SENAL_BAJO_MINIMO


def test_ac6_senal_igual_al_minimo_no_deriva():
    r = decidir(caso(100, 50), umbrales(70, 50))
    assert r.decision == Decision.APROBAR
    assert r.motivo == Motivo.PUNTAJE_SOBRE_UMBRAL


def test_ac7_senal_bajo_minimo_precede_a_puntaje_bajo_umbral():
    r = decidir(caso(40, 60), umbrales(85, 50))
    assert r.decision == Decision.DERIVAR_A_REVISION
    assert r.motivo == Motivo.SENAL_BAJO_MINIMO
    assert r.motivo != Motivo.PUNTAJE_BAJO_UMBRAL


def test_ac8_fraude_deriva_con_puntaje_alto():
    r = decidir(caso(99, 99, fraude_en=(0,)), umbrales(85, 50))
    assert r.decision == Decision.DERIVAR_A_REVISION
    assert r.motivo == Motivo.FRAUDE


def test_ac9_fraude_precede_a_otros_motivos():
    r = decidir(caso(10, 20, fraude_en=(0,)), umbrales(85, 50))
    assert r.decision == Decision.DERIVAR_A_REVISION
    assert r.motivo == Motivo.FRAUDE
    assert r.motivo not in (Motivo.SENAL_BAJO_MINIMO, Motivo.PUNTAJE_BAJO_UMBRAL)


def test_ac10_sin_senales_deriva():
    r = decidir(caso(), umbrales(85, 50))
    assert r.decision == Decision.DERIVAR_A_REVISION
    assert r.motivo == Motivo.SIN_SENALES


def test_ac11_nunca_rechaza():
    r = decidir(caso(0, 0), umbrales(85, 0))
    assert r.decision == Decision.DERIVAR_A_REVISION
    assert r.decision != "RECHAZAR"
    assert r.decision.value != "RECHAZAR"


def test_ac12_mismo_caso_distinto_umbral_por_cliente():
    c = caso(80, 80)
    a = decidir(c, umbrales(70, 50))
    b = decidir(c, umbrales(90, 50))
    assert a.decision == Decision.APROBAR
    assert b.decision == Decision.DERIVAR_A_REVISION


def test_ac13_mismo_caso_distinto_minimo_por_cliente():
    c = caso(100, 100, 60)
    a = decidir(c, umbrales(80, 50))
    b = decidir(c, umbrales(80, 70))
    assert a.decision == Decision.APROBAR
    assert b.decision == Decision.DERIVAR_A_REVISION
    assert b.motivo == Motivo.SENAL_BAJO_MINIMO


def test_puntaje_fuera_de_rango_se_rechaza_en_modelo():
    with pytest.raises(ValueError):
        Senal(puntaje=101)
