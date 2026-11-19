"""API mínima (T-7)."""
from fastapi import FastAPI
from fastapi.responses import JSONResponse

from .config import ClienteSinConfiguracion, RepositorioUmbrales
from .decision import decidir
from .models import CasoAnalizado, ResultadoDecision


def create_app(repositorio: RepositorioUmbrales) -> FastAPI:
    app = FastAPI(title="MIRA decisión")

    @app.post("/decisiones", response_model=ResultadoDecision)
    def post_decision(caso: CasoAnalizado):
        try:
            umbrales = repositorio.obtener(caso.cliente_id)
        except ClienteSinConfiguracion as e:
            return JSONResponse(
                status_code=404,
                content={"error": "CLIENTE_SIN_CONFIGURACION", "detalle": str(e)},
            )
        return decidir(caso, umbrales)

    return app
