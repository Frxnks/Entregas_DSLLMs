"""Pruebas de la API HTTP (AC-2, AC-14)."""
from fastapi.testclient import TestClient

from mira_decision.api import create_app
from mira_decision.config import RepositorioUmbrales
from mira_decision.models import UmbralesCliente


def cliente_http():
    repo = RepositorioUmbrales(
        {"cliente-a": UmbralesCliente(umbral_aprobacion=90, minimo_por_senal=50)}
    )
    return TestClient(create_app(repo))


def test_ac2_api_aprueba_y_devuelve_motivo():
    r = cliente_http().post(
        "/decisiones",
        json={"cliente_id": "cliente-a", "senales": [{"puntaje": 95}, {"puntaje": 93}]},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["decision"] == "APROBAR"
    assert body["motivo"] == "PUNTAJE_SOBRE_UMBRAL"


def test_ac14_api_cliente_sin_configuracion_responde_error():
    r = cliente_http().post(
        "/decisiones",
        json={"cliente_id": "otro", "senales": [{"puntaje": 95}, {"puntaje": 93}]},
    )
    assert r.status_code == 404
    body = r.json()
    assert body["error"] == "CLIENTE_SIN_CONFIGURACION"
    assert "decision" not in body
    assert "otro" in body["detalle"]


def test_api_puntaje_fuera_de_rango_422():
    r = cliente_http().post(
        "/decisiones", json={"cliente_id": "cliente-a", "senales": [{"puntaje": 150}]}
    )
    assert r.status_code == 422
