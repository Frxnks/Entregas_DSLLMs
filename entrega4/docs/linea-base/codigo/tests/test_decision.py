import pytest
from fastapi.testclient import TestClient

from mira.api import create_app
from mira.decision import ClientConfig, Decision, Signal, decide

CFG = ClientConfig(approval_threshold=80, min_signal_score=50)


def S(score, fraud=False):
    return Signal("s", score, fraud)


# ---- lógica ----
def test_aprueba_si_promedio_alcanza_umbral_exacto():
    r = decide([S(80), S(80)], CFG)
    assert r.decision is Decision.APROBAR and r.score == 80


def test_deriva_si_promedio_bajo_umbral():
    r = decide([S(79), S(80)], CFG)
    assert r.decision is Decision.REVISION and "puntaje_bajo_umbral" in r.reasons


def test_minimo_por_senal_deriva_aunque_promedio_alcance():
    r = decide([S(100), S(100), S(49)], ClientConfig(80, 50))
    assert r.score >= 80
    assert r.decision is Decision.REVISION and r.reasons == ("senal_bajo_minimo",)


def test_senal_igual_al_minimo_no_deriva():
    assert decide([S(50), S(100)], ClientConfig(70, 50)).decision is Decision.APROBAR


def test_fraude_manda_sobre_puntaje_perfecto():
    r = decide([S(100), S(100, fraud=True)], CFG)
    assert r.decision is Decision.REVISION and "senal_de_fraude" in r.reasons


def test_sin_senales_deriva():
    r = decide([], CFG)
    assert r.decision is Decision.REVISION and r.score is None


def test_nunca_rechaza():
    assert {d.value for d in Decision} == {"APROBAR", "REVISION"}
    assert decide([S(0, True)], CFG).decision is Decision.REVISION


@pytest.mark.parametrize("bad", [-1, 101, float("nan"), True, "80"])
def test_validacion_de_puntajes(bad):
    with pytest.raises(ValueError):
        Signal("x", bad)
    with pytest.raises(ValueError):
        ClientConfig(bad, 10)


# ---- API ----
@pytest.fixture
def client():
    return TestClient(create_app())


def cfg(c, cid, thr, mn):
    r = c.put(f"/clients/{cid}/config", json={"approval_threshold": thr, "min_signal_score": mn})
    assert r.status_code == 200


def case(*items):
    return {"signals": [{"name": f"s{i}", "score": s, "is_fraud": f} for i, (s, f) in enumerate(items)]}


def test_sin_config_devuelve_error_y_no_decide(client):
    r = client.post("/clients/x/decision", json=case((100, False)))
    assert r.status_code == 404
    assert r.json()["detail"]["error"] == "client_config_missing"
    assert client.get("/clients/x/config").status_code == 404


def test_sin_config_error_incluso_con_fraude_o_sin_senales(client):
    assert client.post("/clients/x/decision", json=case((0, True))).status_code == 404
    assert client.post("/clients/x/decision", json={"signals": []}).status_code == 404


def test_umbrales_propios_por_cliente(client):
    cfg(client, "a", 90, 0)
    cfg(client, "b", 60, 0)
    c = case((70, False), (70, False))
    assert client.post("/clients/a/decision", json=c).json()["decision"] == "REVISION"
    assert client.post("/clients/b/decision", json=c).json()["decision"] == "APROBAR"
    assert client.get("/clients/a/config").json() == {"approval_threshold": 90, "min_signal_score": 0}


def test_api_minimo_por_senal_y_fraude(client):
    cfg(client, "a", 80, 50)
    r = client.post("/clients/a/decision", json=case((100, False), (100, False), (40, False))).json()
    assert r["decision"] == "REVISION" and r["reasons"] == ["senal_bajo_minimo"]
    r = client.post("/clients/a/decision", json=case((100, True))).json()
    assert r["decision"] == "REVISION" and r["reasons"] == ["senal_de_fraude"]


def test_api_sin_senales_deriva(client):
    cfg(client, "a", 80, 50)
    r = client.post("/clients/a/decision", json={"signals": []}).json()
    assert r == {"decision": "REVISION", "score": None, "reasons": ["sin_senales"]}


def test_api_aprueba(client):
    cfg(client, "a", 80, 50)
    r = client.post("/clients/a/decision", json=case((90, False), (80, False))).json()
    assert r == {"decision": "APROBAR", "score": 85.0, "reasons": []}


@pytest.mark.parametrize("body", [
    {"approval_threshold": 101, "min_signal_score": 10},
    {"approval_threshold": 80, "min_signal_score": -1},
    {"approval_threshold": 80},
])
def test_api_config_invalida(client, body):
    assert client.put("/clients/a/config", json=body).status_code == 422


def test_api_senal_invalida(client):
    cfg(client, "a", 80, 50)
    assert client.post("/clients/a/decision", json=case((101, False))).status_code == 422
