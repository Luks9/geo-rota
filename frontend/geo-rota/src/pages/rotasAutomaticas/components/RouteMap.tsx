import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useCallback, useMemo, useState, useEffect } from 'react'
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet'

import { useRoutePolyline } from '../../../hooks/useRoutePolyline'
import type { Funcionario } from '../../funcionarios/services/funcionarioService'
import type { AtribuicaoRota, RotaGerada } from '../services/rotaAutomaticaService'

type RotaVisualizacao = {
  rota: RotaGerada
  atribuicoesOrdenadas: AtribuicaoRota[]
  color: string
}

type RouteMapProps = {
  rotas: RotaVisualizacao[]
  funcionariosPorId: Map<number, Funcionario>
}

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

type RoutePolylineLayerProps = {
  rota: RotaVisualizacao
  funcionariosPorId: Map<number, Funcionario>
  onPolylineStatus: (rotaId: number, mensagem: string | null) => void
}

function RoutePolylineLayer({ rota, funcionariosPorId, onPolylineStatus }: RoutePolylineLayerProps) {
  const { linha, polylineErro } = useRoutePolyline(rota.atribuicoesOrdenadas, rota.rota.destino)

  useEffect(() => {
    onPolylineStatus(rota.rota.id, polylineErro ? `Rota #${rota.rota.id}: ${polylineErro}` : null)
  }, [rota.rota.id, polylineErro, onPolylineStatus])

  if (linha.length === 0) {
    return null
  }

  return (
    <>
      <Polyline positions={linha} color={rota.color} weight={4} />
      {rota.atribuicoesOrdenadas.map((atribuicao) => {
        if (atribuicao.latitude == null || atribuicao.longitude == null) {
          return null
        }
        return (
          <CircleMarker
            key={atribuicao.id}
            center={[atribuicao.latitude, atribuicao.longitude]}
            radius={8}
            pathOptions={{ color: rota.color, fillColor: rota.color, fillOpacity: 0.85 }}
          >
            <Popup>
              <strong>
                {funcionariosPorId.get(atribuicao.funcionario_id)?.nome_completo ??
                  `Funcionário #${atribuicao.funcionario_id}`}
              </strong>
              <br />
              Papel: {atribuicao.papel}
              {atribuicao.ordem_embarque != null && (
                <>
                  <br />
                  Ordem: {atribuicao.ordem_embarque}
                </>
              )}
            </Popup>
          </CircleMarker>
        )
      })}
      {rota.rota.destino && rota.rota.destino.latitude != null && rota.rota.destino.longitude != null && (
        <Marker position={[rota.rota.destino.latitude, rota.rota.destino.longitude]}>
          <Popup>
            <strong>{rota.rota.destino.nome}</strong>
            <br />
            Destino final
          </Popup>
        </Marker>
      )}
    </>
  )
}

function RouteMap({ rotas, funcionariosPorId }: RouteMapProps) {
  const [errosPolylines, setErrosPolylines] = useState<Record<number, string | null>>({})

  const onPolylineStatus = useCallback((rotaId: number, mensagem: string | null) => {
    setErrosPolylines((prev) => {
      if (prev[rotaId] === mensagem) {
        return prev
      }
      return { ...prev, [rotaId]: mensagem }
    })
  }, [])

  const posicaoInicial = useMemo(() => {
    for (const item of rotas) {
      const ponto = item.atribuicoesOrdenadas.find(
        (atribuicao) => atribuicao.latitude != null && atribuicao.longitude != null,
      )
      if (ponto && ponto.latitude != null && ponto.longitude != null) {
        return [ponto.latitude, ponto.longitude] as [number, number]
      }
      if (item.rota.destino && item.rota.destino.latitude != null && item.rota.destino.longitude != null) {
        return [item.rota.destino.latitude, item.rota.destino.longitude] as [number, number]
      }
    }
    return null
  }, [rotas])

  const mensagensErro = useMemo(
    () =>
      Object.values(errosPolylines)
        .filter((mensagem): mensagem is string => Boolean(mensagem))
        .slice(0, 3),
    [errosPolylines],
  )

  if (typeof window === 'undefined' || rotas.length === 0 || !posicaoInicial) {
    return null
  }

  return (
    <div className="box mt-4">
      <div className="level">
        <div className="level-left">
          <h2 className="title is-5 mb-0">
            Visualização das rotas ({rotas.length === 1 ? '1 rota' : `${rotas.length} rotas`})
          </h2>
        </div>
        {mensagensErro.length > 0 && (
          <div className="level-right">
            <div className="has-text-danger">
              {mensagensErro.map((mensagem) => (
                <p key={mensagem}>{mensagem}</p>
              ))}
            </div>
          </div>
        )}
      </div>
      <MapContainer
        center={posicaoInicial}
        zoom={12}
        style={{ height: '420px', width: '100%' }}
        scrollWheelZoom={false}
        doubleClickZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {rotas.map((rota) => (
          <RoutePolylineLayer
            key={rota.rota.id}
            rota={rota}
            funcionariosPorId={funcionariosPorId}
            onPolylineStatus={onPolylineStatus}
          />
        ))}
      </MapContainer>
    </div>
  )
}

export default RouteMap
