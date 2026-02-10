from geo_rota.utils.geocode import GeocodeError, geocode_address


def retornar_rota(endereco: str) -> dict:
    try:
        lat, lon = geocode_address(endereco)
        return {"endereco": endereco, "latitude": lat, "longitude": lon}
    except GeocodeError as exc:  # pragma: no cover - depende de serviço externo
        raise ValueError(f"Erro ao geocodificar o endereço de origem: {exc}") from exc


if __name__ == "__main__":
    retornar_rota("Rua Central, 1000, São Paulo - SP, 01000-000")