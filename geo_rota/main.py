import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from geo_rota.core.config import settings
from geo_rota.routers import incluir_rotas

app = FastAPI(title="GeoRota")
logger = logging.getLogger("geo_rota.api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

incluir_rotas(app)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Retorna mensagem de validação amigável ao frontend."""
    erros = []
    for erro in exc.errors():
        caminho = [str(item) for item in erro.get("loc", []) if item != "body"]
        campo = ".".join(caminho) if caminho else "payload"
        mensagem = erro.get("msg", "valor inválido")
        if mensagem == "field required":
            mensagem = "campo obrigatório"
        erros.append({"campo": campo, "mensagem": mensagem})

    logger.warning("Erro de validação em %s: %s", request.url.path, erros)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"mensagem": "Os dados enviados não são válidos.", "erros": erros},
    )


@app.get("/")
def root():
    return {"message": "GeoRota API funcionando com SQLite!"}
