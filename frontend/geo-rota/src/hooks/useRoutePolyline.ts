import { useEffect, useMemo, useState } from 'react'

import type { AtribuicaoRota, RotaGerada } from '../pages/rotasAutomaticas/services/rotaAutomaticaService'

export function useRoutePolyline(
  atribuicoes: AtribuicaoRota[],
  destino: RotaGerada['destino'] | null | undefined,
) {
  const coordenadas = useMemo(() => {
    const coords: Array<[number, number]> = []
    atribuicoes.forEach((atribuicao) => {
      if (atribuicao.latitude != null && atribuicao.longitude != null) {
        coords.push([atribuicao.latitude, atribuicao.longitude])
      }
    })
    if (destino && destino.latitude != null && destino.longitude != null) {
      coords.push([destino.latitude, destino.longitude])
    }
    return coords
  }, [atribuicoes, destino])

  const [polyline, setPolyline] = useState<Array<[number, number]>>([])
  const [polylineErro, setPolylineErro] = useState<string | null>(null)

  useEffect(() => {
    if (coordenadas.length < 2) {
      setPolyline([])
      setPolylineErro(null)
      return
    }

    const controller = new AbortController()
    const query = coordenadas.map(([lat, lon]) => `${lon},${lat}`).join(';')

    fetch(`https://router.project-osrm.org/route/v1/driving/${query}?overview=full&geometries=geojson`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Falha ao calcular rota no mapa.')
        }
        const data = await response.json()
        const geometry = data.routes?.[0]?.geometry?.coordinates
        if (!geometry) {
          throw new Error('Trajeto indisponível para os pontos informados.')
        }
        const pontos = geometry.map(([lon, lat]: [number, number]) => [lat, lon] as [number, number])
        setPolyline(pontos)
        setPolylineErro(null)
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        console.error(error)
        setPolyline([])
        setPolylineErro('Não foi possível calcular o trajeto pela estrada. Exibindo linhas retas como fallback.')
      })

    return () => controller.abort()
  }, [coordenadas])

  const linha = polyline.length > 0 ? polyline : coordenadas

  return {
    coordenadas,
    linha,
    polylineErro,
  }
}
