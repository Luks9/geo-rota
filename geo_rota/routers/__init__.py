from fastapi import APIRouter

from geo_rota.routers.empresa_router import router as empresa_router
from geo_rota.routers.funcionario_router import router as funcionario_router
from geo_rota.routers.grupo_rota_router import router as grupo_rota_router
from geo_rota.routers.rota_router import router as rota_router
from geo_rota.routers.veiculo_router import router as veiculo_router


def incluir_rotas(app_router: APIRouter) -> None:
    app_router.include_router(empresa_router)
    app_router.include_router(funcionario_router)
    app_router.include_router(grupo_rota_router)
    app_router.include_router(veiculo_router)
    app_router.include_router(rota_router)
