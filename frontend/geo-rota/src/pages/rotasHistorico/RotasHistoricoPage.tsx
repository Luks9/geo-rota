import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useNotification } from '../../hooks/useNotification'
import empresaService, { type Empresa } from '../funcionarios/services/empresaService'
import funcionarioService, { type Funcionario } from '../funcionarios/services/funcionarioService'
import type { Rota } from './services/rotaService'
import rotaService from './services/rotaService'

const STATUS_OPTIONS: { value: Rota['status']; label: string }[] = [
  { value: 'rascunho', label: 'Rascunho' },
  { value: 'agendada', label: 'Agendada' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'concluida', label: 'Concluída' },
  { value: 'cancelada', label: 'Cancelada' },
]

function RotasHistoricoPage() {
  const { danger, success } = useNotification()
  const [rotas, setRotas] = useState<Rota[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [selectedRota, setSelectedRota] = useState<Rota | null>(null)
  const selectedRotaRef = useRef<Rota | null>(null)
  const [loadingRotas, setLoadingRotas] = useState(false)
  const [loadingEmpresas, setLoadingEmpresas] = useState(true)
  const [empresaFiltro, setEmpresaFiltro] = useState('')
  const [dataFiltro, setDataFiltro] = useState('')
  const [editingRotaId, setEditingRotaId] = useState<number | null>(null)
  const [novoStatus, setNovoStatus] = useState<Rota['status']>('rascunho')
  const [salvando, setSalvando] = useState(false)

  const funcionariosMap = useMemo(() => {
    const map = new Map<number, Funcionario>()
    funcionarios.forEach((func) => map.set(func.id, func))
    return map
  }, [funcionarios])

  const carregarEmpresasEFuncionarios = useCallback(async () => {
    try {
      const [empresasLista, funcionariosLista] = await Promise.all([
        empresaService.listar(),
        funcionarioService.listar(),
      ])
      setEmpresas(empresasLista)
      setFuncionarios(funcionariosLista)
    } catch (error) {
      console.error(error)
      danger('Não foi possível carregar empresas ou funcionários.')
    } finally {
      setLoadingEmpresas(false)
    }
  }, [danger])

  const carregarRotas = useCallback(async () => {
    setLoadingRotas(true)
    try {
      const lista = await rotaService.listar({
        empresaId: empresaFiltro ? Number(empresaFiltro) : undefined,
        dataReferencia: dataFiltro || undefined,
      })
      setRotas(lista)
      if (selectedRotaRef.current) {
        const atualizada = lista.find((rota) => rota.id === selectedRotaRef.current?.id)
        setSelectedRota(atualizada ?? null)
      }
    } catch (error) {
      console.error(error)
      danger('Não foi possível carregar o histórico de rotas.')
    } finally {
      setLoadingRotas(false)
    }
  }, [empresaFiltro, dataFiltro, danger])

  useEffect(() => {
    void carregarEmpresasEFuncionarios()
  }, [carregarEmpresasEFuncionarios])

  useEffect(() => {
    void carregarRotas()
  }, [carregarRotas])

  useEffect(() => {
    selectedRotaRef.current = selectedRota
  }, [selectedRota])

  const iniciarEdicao = (rota: Rota) => {
    setEditingRotaId(rota.id)
    setNovoStatus(rota.status)
  }

  const cancelarEdicao = () => {
    setEditingRotaId(null)
    setNovoStatus('rascunho')
  }

  const salvarEdicao = async (rota: Rota) => {
    setSalvando(true)
    try {
      const atualizada = await rotaService.atualizar(rota.id, { status: novoStatus })
      setRotas((prev) => prev.map((item) => (item.id === rota.id ? atualizada : item)))
      if (selectedRota?.id === rota.id) {
        setSelectedRota(atualizada)
      }
      success('Rota atualizada com sucesso.')
      cancelarEdicao()
    } catch (error) {
      console.error(error)
      danger('Não foi possível atualizar a rota.')
    } finally {
      setSalvando(false)
    }
  }

  const removerRota = async (rota: Rota) => {
    const confirmed = window.confirm(`Deseja remover a rota #${rota.id}?`)
    if (!confirmed) return
    try {
      await rotaService.remover(rota.id)
      setRotas((prev) => prev.filter((item) => item.id !== rota.id))
      if (selectedRota?.id === rota.id) {
        setSelectedRota(null)
      }
      success('Rota removida.')
    } catch (error) {
      console.error(error)
      danger('Não foi possível remover a rota.')
    }
  }

  const renderDestino = () => {
    if (!selectedRota?.destino) return <p>Nenhum destino associado.</p>
    const destino = selectedRota.destino
    return (
      <>
        <p>
          <strong>{destino.nome}</strong>
        </p>
        <p>
          {destino.logradouro}, {destino.numero}
          {destino.complemento ? ` - ${destino.complemento}` : ''}
        </p>
        <p>
          {destino.bairro} - {destino.cidade}/{destino.estado}
        </p>
        <p>CEP: {destino.cep}</p>
      </>
    )
  }

  const renderAtribuicoes = () => {
    if (!selectedRota || selectedRota.atribuicoes.length === 0) {
      return <p className="has-text-grey">Nenhuma pessoa atribuída.</p>
    }
    const ordenadas = [...selectedRota.atribuicoes].sort((a, b) => {
      if (a.ordem_embarque == null && b.ordem_embarque == null) return 0
      if (a.ordem_embarque == null) return 1
      if (b.ordem_embarque == null) return -1
      return a.ordem_embarque - b.ordem_embarque
    })
    return (
      <div className="table-container">
        <table className="table is-striped is-hoverable is-fullwidth">
          <thead>
            <tr>
              <th>Ordem</th>
              <th>Nome</th>
              <th>Papel</th>
            </tr>
          </thead>
          <tbody>
            {ordenadas.map((atribuicao) => (
              <tr key={atribuicao.id}>
                <td>{atribuicao.ordem_embarque ?? '-'}</td>
                <td>
                  {funcionariosMap.get(atribuicao.funcionario_id)?.nome_completo ??
                    `Funcionário #${atribuicao.funcionario_id}`}
                </td>
                <td>{atribuicao.papel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <section className="section">
      <div className="level">
        <div className="level-left">
          <div>
            <h1 className="title is-4">Histórico de rotas</h1>
            <p className="subtitle is-6 has-text-grey">Consulte, atualize ou remova rotas geradas no sistema.</p>
          </div>
        </div>
        <div className="level-right">
          <button type="button" className="button is-light" onClick={() => carregarRotas()} disabled={loadingRotas}>
            <span className="icon">
              <i className="fas fa-sync-alt" aria-hidden="true" />
            </span>
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      <div className="box mb-4">
        <div className="columns is-multiline">
          <div className="column is-one-quarter">
            <div className="field">
              <label className="label" htmlFor="empresaFiltro">
                Empresa
              </label>
              <div className="control">
                <div className="select is-fullwidth">
                  <select
                    id="empresaFiltro"
                    value={empresaFiltro}
                    onChange={(event) => setEmpresaFiltro(event.target.value)}
                    disabled={loadingEmpresas}
                  >
                    <option value="">Todas</option>
                    {empresas.map((empresa) => (
                      <option key={empresa.id} value={empresa.id}>
                        {empresa.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
          <div className="column is-one-quarter">
            <div className="field">
              <label className="label" htmlFor="dataFiltro">
                Data
              </label>
              <div className="control">
                <input
                  id="dataFiltro"
                  className="input"
                  type="date"
                  value={dataFiltro}
                  onChange={(event) => setDataFiltro(event.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="table is-fullwidth is-striped is-hoverable">
          <thead>
            <tr>
              <th>ID</th>
              <th>Empresa</th>
              <th>Grupo</th>
              <th>Data</th>
              <th>Turno</th>
              <th>Status</th>
              <th className="has-text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rotas.map((rota) => (
              <tr key={rota.id}>
                <td>{rota.id}</td>
                <td>{rota.empresa_id}</td>
                <td>{rota.grupo_rota_id}</td>
                <td>{rota.data_agendada}</td>
                <td>{rota.turno}</td>
                <td>
                  {editingRotaId === rota.id ? (
                    <div className="select is-small">
                      <select value={novoStatus} onChange={(event) => setNovoStatus(event.target.value as Rota['status'])}>
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <span className="tag is-light">{rota.status}</span>
                  )}
                </td>
                <td className="has-text-right">
                  <div className="buttons are-small is-right">
                    <button type="button" className="button is-link is-light" onClick={() => setSelectedRota(rota)}>
                      Detalhes
                    </button>
                    {editingRotaId === rota.id ? (
                      <>
                        <button
                          type="button"
                          className={`button is-success ${salvando ? 'is-loading' : ''}`}
                          onClick={() => salvarEdicao(rota)}
                          disabled={salvando}
                        >
                          Salvar
                        </button>
                        <button type="button" className="button" onClick={cancelarEdicao} disabled={salvando}>
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <button type="button" className="button is-warning is-light" onClick={() => iniciarEdicao(rota)}>
                        Editar
                      </button>
                    )}
                    <button type="button" className="button is-danger is-light" onClick={() => removerRota(rota)}>
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rotas.length === 0 && !loadingRotas && (
              <tr>
                <td colSpan={7} className="has-text-centered has-text-grey">
                  Nenhuma rota encontrada para os filtros informados.
                </td>
              </tr>
            )}
            {loadingRotas && (
              <tr>
                <td colSpan={7} className="has-text-centered has-text-grey">
                  Carregando...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedRota && (
        <div className="box mt-4">
          <div className="level">
            <div className="level-left">
              <h2 className="title is-5 mb-3">Detalhes da rota #{selectedRota.id}</h2>
            </div>
            <div className="level-right">
              <button type="button" className="button is-small" onClick={() => setSelectedRota(null)}>
                Fechar
              </button>
            </div>
          </div>

          <div className="columns is-multiline">
            <div className="column is-one-third">
              <p>
                <strong>Status:</strong> {selectedRota.status}
              </p>
              <p>
                <strong>Data:</strong> {selectedRota.data_agendada} - {selectedRota.turno}
              </p>
              <p>
                <strong>Empresa:</strong> {selectedRota.empresa_id}
              </p>
              <p>
                <strong>Grupo:</strong> {selectedRota.grupo_rota_id}
              </p>
            </div>
            <div className="column is-one-third">
              <p>
                <strong>Motorista:</strong> {selectedRota.motorista_id ?? 'N/A'}
              </p>
              <p>
                <strong>Veículo:</strong> {selectedRota.veiculo_id ?? 'N/A'}
              </p>
              <p>
                <strong>Modo:</strong> {selectedRota.modo_geracao}
              </p>
              <p>
                <strong>Observações:</strong> {selectedRota.observacoes ?? '---'}
              </p>
            </div>
            <div className="column is-one-third">
              <strong>Destino:</strong>
              <div className="mt-2">{renderDestino()}</div>
            </div>
          </div>

          <div className="mt-4">
            <h3 className="title is-6">Ordem das pessoas</h3>
            {renderAtribuicoes()}
          </div>
        </div>
      )}
    </section>
  )
}

export default RotasHistoricoPage
