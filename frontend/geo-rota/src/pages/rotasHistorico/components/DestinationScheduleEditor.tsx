import type { DestinoRota } from '../../rotasAutomaticas/services/destinoService'
import type { Rota } from '../services/rotaService'

type DestinationScheduleEditorProps = {
  rota: Rota
  destinos: DestinoRota[]
  turnoOptions: Array<{ value: Rota['turno']; label: string }>
  onEditarDestino: (destinoId: number) => void
}

function DestinationScheduleEditor({
  rota,
  destinos,
  turnoOptions,
  onEditarDestino,
}: DestinationScheduleEditorProps) {
  const destinoAtual = destinos.find((destino) => destino.id === rota.destino_id)

  return (
    <div className="box mb-4">
      <div className="columns">
        <div className="column is-half">
          <p className="title is-6">Destino</p>
          <div className="notification is-light">
            {destinoAtual ? (
              <>
                <p className="mb-1">
                  <strong>{destinoAtual.nome}</strong>
                </p>
                <p className="is-size-7 has-text-grey">
                  {destinoAtual.logradouro}, {destinoAtual.numero} - {destinoAtual.bairro}
                </p>
                <p className="is-size-7 has-text-grey">
                  {destinoAtual.cidade}/{destinoAtual.estado} • CEP {destinoAtual.cep}
                </p>
              </>
            ) : (
              <p className="is-size-7 has-text-grey">Destino fixo configurado para esta rota.</p>
            )}
            {rota.destino_id && (
              <button type="button" className="button is-ghost is-small mt-2" onClick={() => onEditarDestino(rota.destino_id!)}>
                Abrir destino
              </button>
            )}
          </div>
        </div>
        <div className="column is-half">
          <p className="title is-6">Data e turno</p>
          <div className="notification is-light">
            <p className="mb-1">
              <strong>Data:</strong> {rota.data_agendada}
            </p>
            <p className="mb-1">
              <strong>Turno:</strong> {turnoOptions.find((option) => option.value === rota.turno)?.label ?? rota.turno}
            </p>
            <p className="is-size-7 has-text-grey">Campo fixo — operações apenas no turno da manhã.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DestinationScheduleEditor
