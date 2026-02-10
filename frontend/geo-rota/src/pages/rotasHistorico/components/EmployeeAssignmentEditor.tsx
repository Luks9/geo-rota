import { useEffect, useMemo, useState } from 'react'

import type { Funcionario } from '../../funcionarios/services/funcionarioService'
import type { AtribuicaoRota } from '../../rotasAutomaticas/services/rotaAutomaticaService'
import type { Rota, FuncionarioRotaEdicaoPayload } from '../services/rotaService'

type EmployeeAssignmentEditorProps = {
  rota: Rota
  atribuicoes: AtribuicaoRota[]
  funcionariosEmpresa: Funcionario[]
  funcionariosPorId: Map<number, Funcionario>
  rotasParaRemanejamento: Rota[]
  onSalvar: (payload: FuncionarioRotaEdicaoPayload[]) => void
  salvando: boolean
  onRemanejar: (funcionariosIds: number[], rotaDestinoId: number) => void
  remanejando: boolean
  onEditarFuncionario: (funcionarioId: number) => void
}

type Item = {
  funcionario_id: number
  papel: AtribuicaoRota['papel']
  ordem_embarque: number
}

function EmployeeAssignmentEditor({
  rota,
  atribuicoes,
  funcionariosEmpresa,
  funcionariosPorId,
  rotasParaRemanejamento,
  onSalvar,
  salvando,
  onRemanejar,
  remanejando,
  onEditarFuncionario,
}: EmployeeAssignmentEditorProps) {
  const [itens, setItens] = useState<Item[]>([])
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [novoFuncionarioId, setNovoFuncionarioId] = useState<number | ''>('')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [rotaDestinoId, setRotaDestinoId] = useState<number | ''>('')

  useEffect(() => {
    const ordenados = [...atribuicoes]
      .sort((a, b) => {
        if (a.ordem_embarque == null && b.ordem_embarque == null) return 0
        if (a.ordem_embarque == null) return 1
        if (b.ordem_embarque == null) return -1
        return a.ordem_embarque - b.ordem_embarque
      })
      .map((atribuicao, index) => ({
        funcionario_id: atribuicao.funcionario_id,
        papel: atribuicao.papel,
        ordem_embarque: atribuicao.ordem_embarque ?? index,
      }))
    setItens(ordenados)
    setSelectedIds(new Set())
  }, [atribuicoes])

  const funcionariosDisponiveis = useMemo(() => {
    const idsNaRota = new Set(itens.map((item) => item.funcionario_id))
    return funcionariosEmpresa.filter((funcionario) => !idsNaRota.has(funcionario.id))
  }, [funcionariosEmpresa, itens])

  const handleDragStart = (index: number) => {
    setDragIndex(index)
  }

  const handleDrop = (index: number) => {
    if (dragIndex === null || dragIndex === index) return
    const novaLista = [...itens]
    const [movido] = novaLista.splice(dragIndex, 1)
    novaLista.splice(index, 0, movido)
    const comOrdem = novaLista.map((item, ordem) => ({ ...item, ordem_embarque: ordem }))
    setItens(comOrdem)
    setDragIndex(null)
  }

  const handleAdicionar = () => {
    if (!novoFuncionarioId) return
    const novoItem: Item = {
      funcionario_id: Number(novoFuncionarioId),
      papel: 'passageiro',
      ordem_embarque: itens.length,
    }
    setItens((prev) => [...prev, novoItem])
    setNovoFuncionarioId('')
  }

  const handleRemover = (funcionarioId: number) => {
    setItens((prev) => prev.filter((item) => item.funcionario_id != funcionarioId).map((item, index) => ({ ...item, ordem_embarque: index })))
    setSelectedIds((prev) => {
      const clone = new Set(prev)
      clone.delete(funcionarioId)
      return clone
    })
  }

  const handleSalvar = () => {
    const payload = itens.map((item) => ({
      funcionario_id: item.funcionario_id,
      papel: item.papel,
      ordem_embarque: item.ordem_embarque,
    }))
    onSalvar(payload)
  }

  const toggleSelecionado = (funcionarioId: number) => {
    setSelectedIds((prev) => {
      const clone = new Set(prev)
      if (clone.has(funcionarioId)) {
        clone.delete(funcionarioId)
      } else {
        clone.add(funcionarioId)
      }
      return clone
    })
  }

  const handleRemanejar = () => {
    if (!rotaDestinoId || selectedIds.size === 0) {
      return
    }
    onRemanejar(Array.from(selectedIds), Number(rotaDestinoId))
  }

  return (
    <div className="box mb-4">
      <p className="title is-5">Passageiros e ordem de embarque</p>
      <div className="columns">
        <div className="column is-two-thirds">
          <div className="table-container">
            <table className="table is-hoverable is-fullwidth">
              <thead>
                <tr>
                  <th />
                  <th>Ordem</th>
                  <th>Nome</th>
                  <th>Papel</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {itens.map((item, index) => {
                  const funcionario = funcionariosPorId.get(item.funcionario_id)
                  return (
                    <tr
                      key={item.funcionario_id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => handleDrop(index)}
                    >
                      <td>
                        <label className="checkbox">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(item.funcionario_id)}
                            onChange={() => toggleSelecionado(item.funcionario_id)}
                          />
                        </label>
                      </td>
                      <td>{index + 1}</td>
                      <td>
                        <button
                          type="button"
                          className="button is-ghost is-small"
                          onClick={() => onEditarFuncionario(item.funcionario_id)}
                        >
                          {funcionario?.nome_completo ?? `Funcionário #${item.funcionario_id}`}
                        </button>
                      </td>
                      <td>
                        <div className="select is-small">
                          <select
                            value={item.papel}
                            onChange={(event) =>
                              setItens((prev) =>
                                prev.map((registro) =>
                                  registro.funcionario_id === item.funcionario_id
                                    ? { ...registro, papel: event.target.value as AtribuicaoRota['papel'] }
                                    : registro,
                                ),
                              )
                            }
                          >
                            <option value="motorista">Motorista</option>
                            <option value="passageiro">Passageiro</option>
                            <option value="reserva">Reserva</option>
                          </select>
                        </div>
                      </td>
                      <td className="has-text-right">
                        <button type="button" className="button is-text is-small" onClick={() => handleRemover(item.funcionario_id)}>
                          Remover
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {itens.length === 0 && (
                  <tr>
                    <td colSpan={5} className="has-text-centered has-text-grey">
                      Nenhum funcionário vinculado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="field has-addons mt-3">
            <div className="control is-expanded">
              <div className="select is-fullwidth is-small">
                <select
                  value={novoFuncionarioId}
                  onChange={(event) => setNovoFuncionarioId(event.target.value ? Number(event.target.value) : '')}
                >
                  <option value="">Adicionar funcionário...</option>
                  {funcionariosDisponiveis.map((funcionario) => (
                    <option key={funcionario.id} value={funcionario.id}>
                      {funcionario.nome_completo}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="control">
              <button type="button" className="button is-link is-small" onClick={handleAdicionar} disabled={!novoFuncionarioId}>
                Incluir
              </button>
            </div>
          </div>
          <button
            type="button"
            className={`button is-primary mt-3 ${salvando ? 'is-loading' : ''}`}
            onClick={handleSalvar}
            disabled={salvando || itens.length === 0}
          >
            Salvar ordem/papéis
          </button>
        </div>
        <div className="column">
          <p className="title is-6">Remanejar para outra rota</p>
          <div className="field">
            <label className="label is-size-7">Funcionários selecionados</label>
            <p className="has-text-grey is-size-7">{selectedIds.size} selecionados</p>
          </div>
          <div className="field">
            <label className="label is-size-7">Rota destino</label>
            <div className="select is-fullwidth is-small">
              <select value={rotaDestinoId} onChange={(event) => setRotaDestinoId(event.target.value ? Number(event.target.value) : '')}>
                <option value="">Selecione...</option>
                {rotasParaRemanejamento
                  .filter((rotaDestino) => rotaDestino.id !== rota.id)
                  .map((rotaDestino) => (
                    <option key={rotaDestino.id} value={rotaDestino.id}>
                      #{rotaDestino.id} - {rotaDestino.data_agendada} ({rotaDestino.turno})
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <button
            type="button"
            className={`button is-warning is-light ${remanejando ? 'is-loading' : ''}`}
            onClick={handleRemanejar}
            disabled={selectedIds.size === 0 || !rotaDestinoId || remanejando}
          >
            Remanejar selecionados
          </button>
        </div>
      </div>
    </div>
  )
}

export default EmployeeAssignmentEditor
