import type { Rota } from '../services/rotaService'

type Option = {
  value: Rota['status']
  label: string
}

type RouteStatusPanelProps = {
  rota: Rota
  statusOptions: Option[]
  statusSelecionado: Rota['status']
  onStatusChange: (value: Rota['status']) => void
  onSalvarStatus: () => void
  salvandoStatus: boolean
  onRecalcular: () => void
  recalculando: boolean
}

function RouteStatusPanel({
  rota,
  statusOptions,
  statusSelecionado,
  onStatusChange,
  onSalvarStatus,
  salvandoStatus,
  onRecalcular,
  recalculando,
}: RouteStatusPanelProps) {
  return (
    <div className="box mb-4">
      <div className="columns is-vcentered">
        <div className="column is-half">
          <p className="title is-5 mb-2">Status operacional</p>
          <div className="field has-addons">
            <div className="control is-expanded">
              <div className="select is-fullwidth">
                <select value={statusSelecionado} onChange={(event) => onStatusChange(event.target.value as Rota['status'])}>
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="control">
              <button type="button" className={`button is-primary ${salvandoStatus ? 'is-loading' : ''}`} onClick={onSalvarStatus}>
                Atualizar
              </button>
            </div>
          </div>
          <p className="has-text-grey is-size-7">
            Rota #{rota.id} • {rota.data_agendada} • {rota.turno}
          </p>
        </div>
        <div className="column is-flex is-justify-content-flex-end">
          <button
            type="button"
            className={`button is-light mr-2 ${recalculando ? 'is-loading' : ''}`}
            onClick={onRecalcular}
            disabled={recalculando}
          >
            <span className="icon">
              <i className="fas fa-sync-alt" aria-hidden="true" />
            </span>
            <span>Recalcular rota</span>
          </button>
          <div className="tags has-addons is-align-self-center">
            <span className="tag is-dark">Modo</span>
            <span className="tag is-info">{rota.modo_geracao}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RouteStatusPanel
