import type { Funcionario } from '../../funcionarios/services/funcionarioService'
import type { AtribuicaoRota, RotaGerada } from '../services/rotaAutomaticaService'
import type { Veiculo } from '../services/veiculoService'

type RotaVisualizacao = {
  rota: RotaGerada
  atribuicoesOrdenadas: AtribuicaoRota[]
  color: string
}

type RouteDetailsProps = {
  rotas: RotaVisualizacao[]
  funcionariosPorId: Map<number, Funcionario>
  veiculosPorId: Map<number, Veiculo>
  formatarData: (iso: string) => string
  getTurnoLabel: (turno: RotaGerada['turno']) => string
}

function RouteDetails({
  rotas,
  funcionariosPorId,
  veiculosPorId,
  formatarData,
  getTurnoLabel,
}: RouteDetailsProps) {
  if (!rotas.length) {
    return null
  }

  return (
    <div className="box mt-5">
      <h2 className="title is-5 mb-4">
        Detalhes das rotas ({rotas.length === 1 ? '1 rota' : `${rotas.length} rotas`})
      </h2>
      {rotas.map(({ rota, atribuicoesOrdenadas, color }, index) => (
        <details key={rota.id} className="mb-4" open={index === 0}>
          <summary className="is-clickable has-text-weight-semibold">
            <span
              className="tag mr-2"
              style={{ backgroundColor: color, borderColor: color, color: '#fff', minWidth: '60px', textAlign: 'center' }}
            >
              Rota #{rota.id}
            </span>
            {rota.veiculo_id
              ? veiculosPorId.get(rota.veiculo_id)?.placa ?? `Veículo #${rota.veiculo_id}`
              : 'Veículo automático'}
          </summary>
          <div className="mt-3">
            {rota.observacoes && (
              <p className="mb-2">
                <strong>Observações:</strong> {rota.observacoes}
              </p>
            )}
            <p className="mb-2">
              <strong>Status:</strong> {rota.status}
            </p>
            <p className="mb-2">
              <strong>Data:</strong> {formatarData(rota.data_agendada)} - {getTurnoLabel(rota.turno)}
            </p>
            {typeof rota.distancia_total_km === 'number' && (
              <p className="mb-2">
                <strong>Distância estimada:</strong> {rota.distancia_total_km.toFixed(2)} km
              </p>
            )}
            <p className="mb-2">
              <strong>Motorista:</strong>{' '}
              {rota.motorista_id ? `ID ${rota.motorista_id}` : 'Selecionado automaticamente'}
            </p>
            <p className="mb-2">
              <strong>Veículo:</strong>{' '}
              {rota.veiculo_id
                ? veiculosPorId.get(rota.veiculo_id)
                  ? `${veiculosPorId.get(rota.veiculo_id)!.placa} - ${
                      veiculosPorId.get(rota.veiculo_id)!.tipo
                    } (${veiculosPorId.get(rota.veiculo_id)!.capacidade_passageiros} lugares)`
                  : `ID ${rota.veiculo_id}`
                : 'Selecionado automaticamente'}
            </p>

            {rota.destino && (
              <div className="mt-4">
                <h3 className="title is-6">Destino final</h3>
                <p>
                  <strong>{rota.destino.nome}</strong>
                </p>
                <p>
                  {rota.destino.logradouro}, {rota.destino.numero}
                  {rota.destino.complemento ? ` - ${rota.destino.complemento}` : ''}
                </p>
                <p>
                  {rota.destino.bairro} - {rota.destino.cidade}/{rota.destino.estado}
                </p>
                <p>CEP: {rota.destino.cep}</p>
              </div>
            )}

            {atribuicoesOrdenadas.length > 0 && (
              <div className="mt-4">
                <h3 className="title is-6">Ordem das pessoas</h3>
                <div className="table-container">
                  <table className="table is-fullwidth is-striped is-hoverable">
                    <thead>
                      <tr>
                        <th>Ordem</th>
                        <th>Nome</th>
                        <th>Papel</th>
                      </tr>
                    </thead>
                    <tbody>
                      {atribuicoesOrdenadas.map((atribuicao) => (
                        <tr key={atribuicao.id}>
                          <td>{atribuicao.ordem_embarque ?? '-'}</td>
                          <td>
                            {funcionariosPorId.get(atribuicao.funcionario_id)?.nome_completo ??
                              `Funcionário #${atribuicao.funcionario_id}`}
                          </td>
                          <td>{atribuicao.papel}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {rota.sugestoes_veiculos.length > 0 && (
              <div className="mt-4">
                <p>Sugestões adicionais de veículos:</p>
                <div className="table-container">
                  <table className="table is-fullwidth is-striped">
                    <thead>
                      <tr>
                        <th>Tipo</th>
                        <th>Quantidade</th>
                        <th>Capacidade por veículo</th>
                        <th>Pessoas atendidas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rota.sugestoes_veiculos.map((item, indexSugestao) => (
                        <tr key={`${rota.id}-${item.tipo}-${indexSugestao}`}>
                          <td>{item.tipo}</td>
                          <td>{item.quantidade}</td>
                          <td>{item.capacidade_por_veiculo}</td>
                          <td>{item.passageiros_atendidos}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </details>
      ))}
    </div>
  )
}

export default RouteDetails
