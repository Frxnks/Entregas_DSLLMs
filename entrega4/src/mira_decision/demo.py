"""Arranque de demostración: dos clientes ficticios (no es parte de la lógica de decisión)."""
from .api import create_app
from .config import RepositorioUmbrales
from .models import UmbralesCliente

repositorio = RepositorioUmbrales(
    {
        "cliente-a": UmbralesCliente(umbral_aprobacion=70, minimo_por_senal=50),
        "cliente-b": UmbralesCliente(umbral_aprobacion=90, minimo_por_senal=50),
    }
)

app = create_app(repositorio)
