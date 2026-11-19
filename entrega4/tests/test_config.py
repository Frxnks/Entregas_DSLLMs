"""Pruebas del repositorio de umbrales (AC-14)."""
import pytest

from mira_decision.config import ClienteSinConfiguracion, RepositorioUmbrales
from mira_decision.models import UmbralesCliente


def test_ac14_cliente_sin_configuracion_lanza_error():
    repo = RepositorioUmbrales({})
    with pytest.raises(ClienteSinConfiguracion):
        repo.obtener("cliente-x")


def test_ac14_cliente_configurado_se_obtiene():
    u = UmbralesCliente(umbral_aprobacion=80, minimo_por_senal=50)
    assert RepositorioUmbrales({"a": u}).obtener("a") == u
