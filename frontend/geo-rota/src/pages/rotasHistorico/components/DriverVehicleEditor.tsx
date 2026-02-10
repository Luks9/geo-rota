import { useEffect, useState } from 'react'

import type { Funcionario } from '../../funcionarios/services/funcionarioService'
import type { Veiculo } from '../../rotasAutomaticas/services/veiculoService'
import type { Rota } from '../services/rotaService'

type DriverVehicleEditorProps = {
  rota: Rota
  motoristas: Funcionario[]
  veiculos: Veiculo[]
  onSalvarMotorista: (motoristaId: number | null) => void
  onSalvarVeiculo: (veiculoId: number | null) => void
  salvandoMotorista: boolean
  salvandoVeiculo: boolean
  onEditarFuncionario: (funcionarioId: number) => void
  onEditarVeiculo: (veiculoId: number) => void
}

function DriverVehicleEditor({
  rota,
  motoristas,
  veiculos,
  onSalvarMotorista,
  onSalvarVeiculo,
  salvandoMotorista,
  salvandoVeiculo,
  onEditarFuncionario,
  onEditarVeiculo,
}: DriverVehicleEditorProps) {
  const [motoristaSelecionado, setMotoristaSelecionado] = useState<number | ''>(rota.motorista_id ?? '')
  const [veiculoSelecionado, setVeiculoSelecionado] = useState<number | ''>(rota.veiculo_id ?? '')

  useEffect(() => {
    setMotoristaSelecionado(rota.motorista_id ?? '')
    setVeiculoSelecionado(rota.veiculo_id ?? '')
  }, [rota.motorista_id, rota.veiculo_id])

  return (
    <div className="box mb-4">
      <div className="columns">
        <div className="column">
          <p className="title is-6">Motorista</p>
          <div className="field has-addons">
            <div className="control is-expanded">
              <div className="select is-fullwidth">
                <select value={motoristaSelecionado} onChange={(event) => setMotoristaSelecionado(event.target.value ? Number(event.target.value) : '')}>
                  <option value="">Selecionar automaticamente</option>
                  {motoristas.map((funcionario) => (
                    <option key={funcionario.id} value={funcionario.id}>
                      {funcionario.nome_completo}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="control">
              <button
                type="button"
                className={`button is-primary ${salvandoMotorista ? 'is-loading' : ''}`}
                onClick={() => onSalvarMotorista(motoristaSelecionado === '' ? null : motoristaSelecionado)}
              >
                Salvar
              </button>
            </div>
          </div>
          {rota.motorista_id && (
            <button type="button" className="button is-text is-small" onClick={() => onEditarFuncionario(rota.motorista_id!)}>
              Editar motorista
            </button>
          )}
        </div>
        <div className="column">
          <p className="title is-6">Veículo</p>
          <div className="field has-addons">
            <div className="control is-expanded">
              <div className="select is-fullwidth">
                  <select value={veiculoSelecionado} onChange={(event) => setVeiculoSelecionado(event.target.value ? Number(event.target.value) : '')}>
                    <option value="">Selecionar automaticamente</option>
                    {veiculos.map((veiculo) => (
                      <option key={veiculo.id} value={veiculo.id}>
                      {veiculo.placa} - {veiculo.tipo}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="control">
              <button
                type="button"
                className={`button is-primary ${salvandoVeiculo ? 'is-loading' : ''}`}
                onClick={() => onSalvarVeiculo(veiculoSelecionado === '' ? null : veiculoSelecionado)}
              >
                Salvar
              </button>
            </div>
          </div>
          {rota.veiculo_id && (
            <button type="button" className="button is-text is-small" onClick={() => onEditarVeiculo(rota.veiculo_id!)}>
              Editar veículo
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default DriverVehicleEditor
