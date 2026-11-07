def count_requests(database, case_id: str) -> int:
    return database.query_one("SELECT COUNT(*) AS total FROM solicitudes_antecedentes WHERE caso_id=?", (case_id,))["total"]


def test_indicator_role_cannot_prepare_request(tools, sessions, database):
    before = count_requests(database, "C-011")
    result = tools.preparar_solicitud_antecedentes(sessions["U-03"], "C-011", ["boleta legible"], "Se requiere verificar el total")
    assert result["ok"] is False
    assert "operador o supervisor" in result["error"]
    assert count_requests(database, "C-011") == before


def test_automatically_approved_case_is_blocked(tools, sessions, database):
    before = count_requests(database, "C-010")
    result = tools.preparar_solicitud_antecedentes(sessions["U-01"], "C-010", ["boleta"], "Falta una página")
    assert result["ok"] is False
    assert "aprobado automáticamente" in result["error"]
    assert count_requests(database, "C-010") == before


def test_third_request_requires_supervisor(tools, sessions, database):
    assert count_requests(database, "C-016") == 2
    denied = tools.preparar_solicitud_antecedentes(sessions["U-01"], "C-016", ["fotografía legible"], "La imagen no permite leer el total")
    assert denied["ok"] is False
    assert "supervisor" in denied["error"]
    assert count_requests(database, "C-016") == 2


def test_supervisor_confirmation_writes_once_and_preserves_original_case(tools, sessions, database):
    proposal = tools.preparar_solicitud_antecedentes(sessions["U-02"], "C-016", ["fotografía completa y legible"], "No se puede leer el total")
    assert proposal["ok"] is True
    token = proposal["data"]["token"]
    first = tools.solicitar_antecedentes(sessions["U-02"], token)
    second = tools.solicitar_antecedentes(sessions["U-02"], token)
    assert first["ok"] is True and first["data"]["idempotent_replay"] is False
    assert second["ok"] is True and second["data"]["idempotent_replay"] is True
    assert count_requests(database, "C-016") == 3
    original = database.query_one("SELECT estado FROM casos WHERE caso_id='C-016'")
    event = database.query_one("SELECT estado_resultante FROM caso_eventos WHERE caso_id='C-016'")
    assert original["estado"] == "solicitud_antecedentes"
    assert event["estado_resultante"] == "solicitud_antecedentes"


def test_other_organization_is_not_disclosed(tools, sessions):
    result = tools.consultar_caso(sessions["U-01"], "C-020")
    assert result["ok"] is False
    assert "fuera del alcance" in result["error"]
    assert "ORG-02" not in result["error"]


def test_read_does_not_create_business_events(tools, sessions, database):
    before = database.query_one("SELECT COUNT(*) AS total FROM caso_eventos")["total"]
    assert tools.consultar_caso(sessions["U-01"], "C-011")["ok"] is True
    after = database.query_one("SELECT COUNT(*) AS total FROM caso_eventos")["total"]
    assert after == before

