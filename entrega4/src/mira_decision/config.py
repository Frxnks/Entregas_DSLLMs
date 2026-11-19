"""Repositorio de umbrales por cliente (T-2, AC-14). Sin valores por defecto."""
from .models import UmbralesCliente


class ClienteSinConfiguracion(Exception):
    def __init__(self, cliente_id: str):
        self.cliente_id = cliente_id
        super().__init__(f"Falta la configuración de umbrales del cliente {cliente_id}")


class RepositorioUmbrales:
    def __init__(self, umbrales: dict[str, UmbralesCliente] | None = None):
        self._umbrales = dict(umbrales or {})

    def obtener(self, cliente_id: str) -> UmbralesCliente:
        try:
            return self._umbrales[cliente_id]
        except KeyError:
            raise ClienteSinConfiguracion(cliente_id) from None
