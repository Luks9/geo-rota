import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useNotification } from '../../hooks/useNotification'
import RouteMap from '../rotasAutomaticas/components/RouteMap'
import destinoService, { type DestinoRota } from '../rotasAutomaticas/services/destinoService'
import veiculoService, { type Veiculo } from '../rotasAutomaticas/services/veiculoService'
import type { Funcionario } from '../funcionarios/services/funcionarioService'
import funcionarioService from '../funcionarios/services/funcionarioService'
import type { Rota } from './services/rotaService'
import rotaService, {
  type FuncionarioRotaEdicaoPayload,
  type RemanejamentoPayload,
} from './services/rotaService'
import DriverVehicleEditor from './components/DriverVehicleEditor'
import DestinationScheduleEditor from './components/DestinationScheduleEditor'
import EmployeeAssignmentEditor from './components/EmployeeAssignmentEditor'
import RouteStatusPanel from './components/RouteStatusPanel'

const STATUS_OPTIONS: { value: Rota['status']; label: string }[] = [
  { value: 'rascunho', label: 'Rascunho' },
  { value: 'agendada', label: 'Agendada' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'concluida', label: 'Concluída' },
  { value: 'cancelada', label: 'Cancelada' },
]

const TURNO_OPTIONS: { value: Rota['turno']; label: string }[] = [
  { value: 'manha', label: 'Manhã' },
  { value: 'tarde', label: 'Tarde' },
  { value: 'noite', label: 'Noite' },
]

const ROTA_COLORS = ['#3273dc', '#e76f51', '#2a9d8f', '#f4a261', '#9b5de5', '#219ebc']

function GerenciamentoRotasPage() {
  const { danger, success } = useNotification()
  const navigate = useNavigate()
  const [rotas, setRotas] = useState<Rota[]>([])
  const [empresaFiltro, setEmpresaFiltro] = useState<string>('')
  const [dataFiltro, setDataFiltro] = useState<string>('')
  const [loadingRotas, setLoadingRotas] = useState(false)
  const [selectedRota, setSelectedRota] = useState<Rota | null>(null)
  const selectedRotaRef = useRef<Rota | null>(null)
  const [funcionariosEmpresa, setFuncionariosEmpresa] = useState<Funcionario[]>([])
  const [veiculosEmpresa, setVeiculosEmpresa] = useState<Veiculo[]>([])
  const [destinosEmpresa, setDestinosEmpresa] = useState<DestinoRota[]>([])
  const [salvandoStatus, setSalvandoStatus] = useState(false)
  const [recalculando, setRecalculando] = useState(false)
  const [salvandoMotorista, setSalvandoMotorista] = useState(false)
  const [salvandoVeiculo, setSalvandoVeiculo] = useState(false)
  const [salvandoFuncionarios, setSalvandoFuncionarios] = useState(false)
  const [remanejando, setRemanejando] = useState(false)
  const [statusSelecionado, setStatusSelecionado] = useState<Rota['status']>('rascunho')

  const buscarRotas = useCallback(async () => {
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
      danger('Não foi possível carregar as rotas.')
    } finally {
      setLoadingRotas(false)
    }
  }, [empresaFiltro, dataFiltro, danger])

  const carregarDependenciasEmpresa = useCallback(
    async (empresaId: number) => {
      try {
        const [funcs, veiculos, destinos] = await Promise.all([
          funcionarioService.listar({ empresaId }),
          veiculoService.listar({ empresaId }),
          destinoService.listar({ empresaId }),
        ])
        setFuncionariosEmpresa(funcs)
        setVeiculosEmpresa(veiculos)
        setDestinosEmpresa(destinos)
      } catch (error) {
        console.error(error)
        danger('Não foi possível carregar dados complementares da empresa selecionada.')
      }
    },
    [danger],
  )

  useEffect(() => {
    void buscarRotas()
  }, [buscarRotas])

  useEffect(() => {
    selectedRotaRef.current = selectedRota
    if (selectedRota) {
      setStatusSelecionado(selectedRota.status)
      void carregarDependenciasEmpresa(selectedRota.empresa_id)
    }
  }, [selectedRota, carregarDependenciasEmpresa])

  const funcionariosPorId = useMemo(() => {
    const map = new Map<number, Funcionario>()
    funcionariosEmpresa.forEach((func) => map.set(func.id, func))
    return map
  }, [funcionariosEmpresa])

  const rotasParaMapa = useMemo(() => {
    if (!selectedRota) return []
    return [
      {
        rota: selectedRota,
        atribuicoesOrdenadas: [...selectedRota.atribuicoes].sort((a, b) => {
          if (a.ordem_embarque == null && b.ordem_embarque == null) return 0
          if (a.ordem_embarque == null) return 1
          if (b.ordem_embarque == null) return -1
          return a.ordem_embarque - b.ordem_embarque
        }),
        color: ROTA_COLORS[0],
      },
    ]
  }, [selectedRota])

  const atualizarRotaEmMemoria = (rotaAtualizada: Rota) => {
    setRotas((prev) => prev.map((rota) => (rota.id === rotaAtualizada.id ? rotaAtualizada : rota)))
    setSelectedRota(rotaAtualizada)
  }

  const handleStatusSave = async () => {
    if (!selectedRota) return
    setSalvandoStatus(true)
    try {
      const rotaAtualizada = await rotaService.atualizarStatus(selectedRota.id, { status: statusSelecionado })
      atualizarRotaEmMemoria(rotaAtualizada)
      success('Status atualizado com sucesso.')
    } catch (error) {
      console.error(error)
      danger('Não foi possível atualizar o status.')
    } finally {
      setSalvandoStatus(false)
    }
  }

  const handleRecalcular = async () => {
    if (!selectedRota) return
    setRecalculando(true)
    try {
      const rotaAtualizada = await rotaService.recalcular(selectedRota.id, { motivo: 'Recalculo manual pelo painel' })
      atualizarRotaEmMemoria(rotaAtualizada)
      success('Recalculo concluído.')
    } catch (error) {
      console.error(error)
      danger('Falha ao recalcular a rota.')
    } finally {
      setRecalculando(false)
    }
  }

  const salvarMotorista = async (motoristaId: number | null) => {
    if (!selectedRota) return
    setSalvandoMotorista(true)
    try {
      const rotaAtualizada = await rotaService.atualizarMotorista(selectedRota.id, { motorista_id: motoristaId })
      atualizarRotaEmMemoria(rotaAtualizada)
      success('Motorista atualizado.')
    } catch (error) {
      console.error(error)
      danger('Falha ao atualizar o motorista.')
    } finally {
      setSalvandoMotorista(false)
    }
  }

  const salvarVeiculo = async (veiculoId: number | null) => {
    if (!selectedRota) return
    setSalvandoVeiculo(true)
    try {
      const rotaAtualizada = await rotaService.atualizarVeiculo(selectedRota.id, { veiculo_id: veiculoId })
      atualizarRotaEmMemoria(rotaAtualizada)
      success('Veículo atualizado.')
    } catch (error) {
      console.error(error)
      danger('Falha ao atualizar o veículo.')
    } finally {
      setSalvandoVeiculo(false)
    }
  }

  const salvarFuncionarios = async (atribuicoesAtualizadas: FuncionarioRotaEdicaoPayload[]) => {
    if (!selectedRota) return
    setSalvandoFuncionarios(true)
    try {
      const rotaAtualizada = await rotaService.atualizarFuncionarios(selectedRota.id, {
        atribuicoes: atribuicoesAtualizadas,
      })
      atualizarRotaEmMemoria(rotaAtualizada)
      success('Atribuições atualizadas.')
    } catch (error) {
      console.error(error)
      danger('Falha ao atualizar atribuições.')
    } finally {
      setSalvandoFuncionarios(false)
    }
  }

  const remanejarFuncionarios = async (funcionariosIds: number[], rotaDestinoId: number) => {
    if (!selectedRota) return
    setRemanejando(true)
    try {
      const payload: RemanejamentoPayload = {
        rota_origem_id: selectedRota.id,
        rota_destino_id: rotaDestinoId,
        funcionarios_ids: funcionariosIds,
      }
      const [rotaOrigem, rotaDestino] = await rotaService.remanejarFuncionarios(payload)
      atualizarRotaEmMemoria(rotaOrigem.id === selectedRota.id ? rotaOrigem : rotaDestino)
      success('Funcionários remanejados.')
      void buscarRotas()
    } catch (error) {
      console.error(error)
      danger('Falha ao remanejar funcionários.')
    } finally {
      setRemanejando(false)
    }
  }

  const rotasParaRemanejamento = useMemo(() => {
    if (!selectedRota) return []
    return rotas.filter(
      (rota) => rota.data_agendada === selectedRota.data_agendada && rota.turno === selectedRota.turno,
    )
  }, [rotas, selectedRota])

  const voltarAoInicio = () => {
    setSelectedRota(null)
  }

  const abrirFuncionario = (funcionarioId: number) => {
    navigate(`/cadastro/funcionarios/editar/${funcionarioId}`)
  }

  const abrirVeiculo = (veiculoId: number) => {
    navigate(`/cadastro/veiculos/editar/${veiculoId}`)
  }

  const abrirDestino = (destinoId: number) => {
    navigate(`/cadastro/destinos/editar/${destinoId}`)
  }

  return (
    <section className="section">
      <div className="level">
        <div className="level-left">
          <div>
            <h1 className="title is-4">Gerenciamento de rotas</h1>
            <p className="subtitle is-6 has-text-grey">Controle completo das rotas geradas e suas atribuições.</p>
          </div>
        </div>
        <div className="level-right">
          <button type="button" className="button is-light" onClick={() => buscarRotas()} disabled={loadingRotas}>
            <span className="icon">
              <i className="fas fa-sync-alt" aria-hidden="true" />
            </span>
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      <div className="box mb-4">
        <div className="columns">
          <div className="column is-one-quarter">
            <div className="field">
              <label className="label">Empresa</label>
              <div className="control">
                <input
                  type="number"
                  className="input"
                  placeholder="ID da empresa"
                  value={empresaFiltro}
                  onChange={(event) => setEmpresaFiltro(event.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="column is-one-quarter">
            <div className="field">
              <label className="label">Data</label>
              <div className="control">
                <input
                  type="date"
                  className="input"
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
                  <span className={`tag is-light ${selectedRota?.id === rota.id ? 'is-link' : ''}`}>{rota.status}</span>
                </td>
                <td className="has-text-right">
                  <button type="button" className="button is-small is-link is-light" onClick={() => setSelectedRota(rota)}>
                    Gerenciar
                  </button>
                </td>
              </tr>
            ))}
            {rotas.length === 0 && !loadingRotas && (
              <tr>
                <td colSpan={7} className="has-text-centered has-text-grey">
                  Nenhuma rota encontrada.
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
        <div className="box mt-5">
          <div className="level mb-3">
            <div className="level-left">
              <h2 className="title is-5 mb-0">Rota #{selectedRota.id}</h2>
            </div>
            <div className="level-right">
              <button type="button" className="button is-text" onClick={voltarAoInicio}>
                Voltar
              </button>
            </div>
          </div>

          <RouteStatusPanel
            rota={selectedRota}
            statusOptions={STATUS_OPTIONS}
            statusSelecionado={statusSelecionado}
            onStatusChange={setStatusSelecionado}
            onSalvarStatus={handleStatusSave}
            salvandoStatus={salvandoStatus}
            onRecalcular={handleRecalcular}
            recalculando={recalculando}
          />

          <DriverVehicleEditor
            rota={selectedRota}
            motoristas={funcionariosEmpresa.filter((funcionario) => funcionario.apto_dirigir && funcionario.possui_cnh)}
            veiculos={veiculosEmpresa}
            onSalvarMotorista={salvarMotorista}
            onSalvarVeiculo={salvarVeiculo}
            salvandoMotorista={salvandoMotorista}
            salvandoVeiculo={salvandoVeiculo}
            onEditarFuncionario={abrirFuncionario}
            onEditarVeiculo={abrirVeiculo}
          />

          <DestinationScheduleEditor
            rota={selectedRota}
            destinos={destinosEmpresa}
            turnoOptions={TURNO_OPTIONS}
            onEditarDestino={abrirDestino}
          />

          <EmployeeAssignmentEditor
            rota={selectedRota}
            atribuicoes={selectedRota.atribuicoes}
            funcionariosEmpresa={funcionariosEmpresa}
            funcionariosPorId={funcionariosPorId}
            rotasParaRemanejamento={rotasParaRemanejamento}
            onSalvar={salvarFuncionarios}
            salvando={salvandoFuncionarios}
            onRemanejar={remanejarFuncionarios}
            remanejando={remanejando}
            onEditarFuncionario={abrirFuncionario}
          />

          <RouteMap rotas={rotasParaMapa} funcionariosPorId={funcionariosPorId} />
        </div>
      )}
    </section>
  )
}

export default GerenciamentoRotasPage
