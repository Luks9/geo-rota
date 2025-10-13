from fastapi import FastAPI

from geo_rota.routers import incluir_rotas

app = FastAPI(title="GeoRota")
incluir_rotas(app)


@app.get("/")
def root():
    return {"message": "GeoRota API funcionando com SQLite!"}
