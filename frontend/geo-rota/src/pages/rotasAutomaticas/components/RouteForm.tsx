import type { ChangeEvent, FormEvent } from 'react'

import type { Empresa } from '../../funcionarios/services/empresaService'
import type { Funcionario } from '../../funcionarios/services/funcionarioService'
import type { GrupoRota } from '../../gruposRota/services/grupoRotaService'
import type { DestinoRota } from '../services/destinoService'
import type { TurnoTrabalho } from '../services/rotaAutomaticaService'
import type { Veiculo } from '../services/veiculoService'

const MODO_OPTIONS: Array<{ value: 'simples' | 'vrp'; label: string }> = [
  { value: 'simples', label: 'Geração Simples (1 rota)' },
  { value: 'vrp', label: 'Geração Corporativa (Multi-Rotas / VRP)' },
]

export type FormValues = {
  empresaId: string
  grupoRotaId: string
  dataAgendada: string
  turno: TurnoTrabalho
  modoGeracao: 'simples' | 'vrp'
  motoristaId: string
  veiculoId: string
  usarDestinoManual: boolean
  destinoId: string
  destinoNome: string
  destinoLogradouro: string
  destinoNumero: string
  destinoComplemento: string
  destinoBairro: string
  destinoCidade: string
  destinoEstado: string
  destinoCep: string
}

export type FormErrors = Partial<Record<keyof FormValues, string>>

type RouteFormProps = {
  values: FormValues
  errors: FormErrors
  empresas: Empresa[]
  gruposDisponiveis: GrupoRota[]
  motoristasElegiveis: Funcionario[]
  veiculosDisponiveis: Veiculo[]
  destinosDisponiveis: DestinoRota[]
  TURNO_OPTIONS: { value: TurnoTrabalho; label: string }[]
  loadingEmpresas: boolean
  loadingDependencias: boolean
  submitting: boolean
  turnoBloqueado?: boolean
  destinoBloqueado?: boolean
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onFieldChange: (
    field: keyof FormValues,
  ) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
}

function RouteForm({
  values,
  errors,
  empresas,
  gruposDisponiveis,
  motoristasElegiveis,
  veiculosDisponiveis,
  destinosDisponiveis,
  TURNO_OPTIONS,
  loadingEmpresas,
  loadingDependencias,
  submitting,
  turnoBloqueado = false,
  destinoBloqueado = false,
  onSubmit,
  onFieldChange,
}: RouteFormProps) {
  const destinoSelecionado = destinosDisponiveis.find((destino) => String(destino.id) === values.destinoId)

  return (
    <div className="box">
      <form onSubmit={onSubmit}>
        <div className="columns is-multiline">
          <div className="column is-half">
            <div className="field">
              <label className="label" htmlFor="empresa">
                Empresa
              </label>
              <div className="control">
                <div className={`select is-fullwidth ${errors.empresaId ? 'is-danger' : ''}`}>
                  <select
                    id="empresa"
                    value={values.empresaId}
                    onChange={onFieldChange('empresaId')}
                    disabled={loadingEmpresas || submitting}
                  >
                    <option value="">Selecione...</option>
                    {empresas.map((empresa) => (
                      <option key={empresa.id} value={empresa.id}>
                        {empresa.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {errors.empresaId && <p className="help is-danger">{errors.empresaId}</p>}
              {loadingEmpresas && <p className="help">Carregando empresas...</p>}
            </div>
          </div>

          <div className="column is-half">
            <div className="field">
              <label className="label" htmlFor="grupoRota">
                Grupo de rota
              </label>
              <div className="control">
                <div className={`select is-fullwidth ${errors.grupoRotaId ? 'is-danger' : ''}`}>
                  <select
                    id="grupoRota"
                    value={values.grupoRotaId}
                    onChange={onFieldChange('grupoRotaId')}
                    disabled={!values.empresaId || loadingDependencias || submitting}
                  >
                    <option value="">Selecione...</option>
                    {gruposDisponiveis.map((grupo) => (
                      <option key={grupo.id} value={grupo.id}>
                        {grupo.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {errors.grupoRotaId && <p className="help is-danger">{errors.grupoRotaId}</p>}
            </div>
          </div>

          <div className="column is-half">
            <div className="field">
              <label className="label" htmlFor="modoGeracao">
                Modo de geração
              </label>
              <div className="control">
                <div className="select is-fullwidth">
                  <select
                    id="modoGeracao"
                    value={values.modoGeracao}
                    onChange={onFieldChange('modoGeracao')}
                    disabled={submitting}
                  >
                    {MODO_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="column is-one-quarter">
            <div className="field">
              <label className="label" htmlFor="dataAgendada">
                Data
              </label>
              <div className="control">
                <input
                  id="dataAgendada"
                  type="date"
                  className={`input ${errors.dataAgendada ? 'is-danger' : ''}`}
                  value={values.dataAgendada}
                  onChange={onFieldChange('dataAgendada')}
                  disabled={submitting}
                />
              </div>
              {errors.dataAgendada && <p className="help is-danger">{errors.dataAgendada}</p>}
            </div>
          </div>

          <div className="column is-one-quarter">
            <div className="field">
              <label className="label" htmlFor="turno">
                Turno
              </label>
              <div className="control">
                <div className="select is-fullwidth">
                  <select
                    id="turno"
                    value={values.turno}
                    onChange={onFieldChange('turno')}
                    disabled={submitting || turnoBloqueado}
                  >
                    {TURNO_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {errors.turno && <p className="help is-danger">{errors.turno}</p>}
              {turnoBloqueado && <p className="help">Turno fixo definido pela operação (manhã).</p>}
            </div>
          </div>

          <div className="column is-half">
            <div className="field">
              <label className="label" htmlFor="motorista">
                Motorista (opcional)
              </label>
              <div className="control">
                <div className="select is-fullwidth">
                  <select
                    id="motorista"
                    value={values.motoristaId}
                    onChange={onFieldChange('motoristaId')}
                    disabled={!values.empresaId || loadingDependencias || submitting || motoristasElegiveis.length === 0}
                  >
                    <option value="">Selecione...</option>
                    {motoristasElegiveis.map((funcionario) => (
                      <option key={funcionario.id} value={funcionario.id}>
                        {funcionario.nome_completo}
                      </option>
                    ))}
                  </select>
                </div>
                {motoristasElegiveis.length === 0 && values.empresaId && !loadingDependencias && (
                  <p className="help">Nenhum motorista disponível cadastrado.</p>
                )}
              </div>
            </div>
          </div>

          <div className="column is-half">
            <div className="field">
              <label className="label" htmlFor="veiculo">
                Veículo (opcional)
              </label>
              <div className="control">
                <div className="select is-fullwidth">
                  <select
                    id="veiculo"
                    value={values.veiculoId}
                    onChange={onFieldChange('veiculoId')}
                    disabled={!values.empresaId || loadingDependencias || submitting || veiculosDisponiveis.length === 0}
                  >
                    <option value="">Selecione...</option>
                    {veiculosDisponiveis.map((veiculo) => (
                      <option key={veiculo.id} value={veiculo.id}>
                        {`${veiculo.placa} - ${veiculo.tipo} (${veiculo.capacidade_passageiros} lugares)`}
                      </option>
                    ))}
                  </select>
                </div>
                {veiculosDisponiveis.length === 0 && values.empresaId && !loadingDependencias && (
                  <p className="help">Nenhum veículo ativo cadastrado para esta empresa.</p>
                )}
              </div>
            </div>
          </div>

          <div className="column is-full">
            <div className="field">
              <label className="label">Destino</label>
              {destinoBloqueado ? (
                <div className="notification is-light">
                  <p className="mb-1">Destino fixo definido pela operação. Não é possível alterá-lo manualmente.</p>
                  {destinoSelecionado ? (
                    <p className="is-size-7 has-text-grey">
                      {destinoSelecionado.nome} — {destinoSelecionado.cidade}/{destinoSelecionado.estado}
                    </p>
                  ) : (
                    <p className="is-size-7 has-text-grey">Destino será preenchido automaticamente após carregar os dados.</p>
                  )}
                </div>
              ) : (
                <>
                  <div className="control mb-3">
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={values.usarDestinoManual}
                        onChange={onFieldChange('usarDestinoManual')}
                        disabled={submitting}
                      />
                      <span className="ml-2">Informar destino manualmente</span>
                    </label>
                  </div>

                  {!values.usarDestinoManual && (
                    <>
                      <div className="select is-fullwidth">
                        <select
                          value={values.destinoId}
                          onChange={onFieldChange('destinoId')}
                          disabled={!values.empresaId || loadingDependencias || submitting || destinosDisponiveis.length === 0}
                        >
                          <option value="">Selecione um destino cadastrado</option>
                          {destinosDisponiveis.map((destino) => (
                            <option key={destino.id} value={destino.id}>
                              {destino.nome} - {destino.cidade}/{destino.estado}
                            </option>
                          ))}
                        </select>
                      </div>
                      {errors.destinoId && <p className="help is-danger">{errors.destinoId}</p>}
                      {destinosDisponiveis.length === 0 && values.empresaId && !loadingDependencias && (
                        <p className="help">Nenhum destino cadastrado para esta empresa.</p>
                      )}
                    </>
                  )}

                  {values.usarDestinoManual && (
                    <div className="box mt-3">
                      <div className="columns is-multiline">
                        <div className="column is-half">
                          <div className="field">
                            <label className="label" htmlFor="destinoNome">
                              Nome
                            </label>
                            <div className="control">
                              <input
                                id="destinoNome"
                                className={`input ${errors.destinoNome ? 'is-danger' : ''}`}
                                type="text"
                                value={values.destinoNome}
                                onChange={onFieldChange('destinoNome')}
                                disabled={submitting}
                              />
                            </div>
                            {errors.destinoNome && <p className="help is-danger">{errors.destinoNome}</p>}
                          </div>
                        </div>
                        <div className="column is-half">
                          <div className="field">
                            <label className="label" htmlFor="destinoLogradouro">
                              Logradouro
                            </label>
                            <div className="control">
                              <input
                                id="destinoLogradouro"
                                className={`input ${errors.destinoLogradouro ? 'is-danger' : ''}`}
                                type="text"
                                value={values.destinoLogradouro}
                                onChange={onFieldChange('destinoLogradouro')}
                                disabled={submitting}
                              />
                            </div>
                            {errors.destinoLogradouro && <p className="help is-danger">{errors.destinoLogradouro}</p>}
                          </div>
                        </div>
                        <div className="column is-one-quarter">
                          <div className="field">
                            <label className="label" htmlFor="destinoNumero">
                              Número
                            </label>
                            <div className="control">
                              <input
                                id="destinoNumero"
                                className={`input ${errors.destinoNumero ? 'is-danger' : ''}`}
                                type="text"
                                value={values.destinoNumero}
                                onChange={onFieldChange('destinoNumero')}
                                disabled={submitting}
                              />
                            </div>
                            {errors.destinoNumero && <p className="help is-danger">{errors.destinoNumero}</p>}
                          </div>
                        </div>
                        <div className="column is-three-quarters">
                          <div className="field">
                            <label className="label" htmlFor="destinoComplemento">
                              Complemento
                            </label>
                            <div className="control">
                              <input
                                id="destinoComplemento"
                                className="input"
                                type="text"
                                value={values.destinoComplemento}
                                onChange={onFieldChange('destinoComplemento')}
                                disabled={submitting}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="column is-half">
                          <div className="field">
                            <label className="label" htmlFor="destinoBairro">
                              Bairro
                            </label>
                            <div className="control">
                              <input
                                id="destinoBairro"
                                className={`input ${errors.destinoBairro ? 'is-danger' : ''}`}
                                type="text"
                                value={values.destinoBairro}
                                onChange={onFieldChange('destinoBairro')}
                                disabled={submitting}
                              />
                            </div>
                            {errors.destinoBairro && <p className="help is-danger">{errors.destinoBairro}</p>}
                          </div>
                        </div>
                        <div className="column is-half">
                          <div className="field">
                            <label className="label" htmlFor="destinoCidade">
                              Cidade
                            </label>
                            <div className="control">
                              <input
                                id="destinoCidade"
                                className={`input ${errors.destinoCidade ? 'is-danger' : ''}`}
                                type="text"
                                value={values.destinoCidade}
                                onChange={onFieldChange('destinoCidade')}
                                disabled={submitting}
                              />
                            </div>
                            {errors.destinoCidade && <p className="help is-danger">{errors.destinoCidade}</p>}
                          </div>
                        </div>
                        <div className="column is-one-quarter">
                          <div className="field">
                            <label className="label" htmlFor="destinoEstado">
                              UF
                            </label>
                            <div className="control">
                              <input
                                id="destinoEstado"
                                className={`input ${errors.destinoEstado ? 'is-danger' : ''}`}
                                type="text"
                                maxLength={2}
                                value={values.destinoEstado}
                                onChange={onFieldChange('destinoEstado')}
                                disabled={submitting}
                              />
                            </div>
                            {errors.destinoEstado && <p className="help is-danger">{errors.destinoEstado}</p>}
                          </div>
                        </div>
                        <div className="column is-one-quarter">
                          <div className="field">
                            <label className="label" htmlFor="destinoCep">
                              CEP
                            </label>
                            <div className="control">
                              <input
                                id="destinoCep"
                                className={`input ${errors.destinoCep ? 'is-danger' : ''}`}
                                type="text"
                                value={values.destinoCep}
                                onChange={onFieldChange('destinoCep')}
                                disabled={submitting}
                              />
                            </div>
                            {errors.destinoCep && <p className="help is-danger">{errors.destinoCep}</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="buttons is-right">
          <button type="submit" className={`button is-primary ${submitting ? 'is-loading' : ''}`} disabled={submitting}>
            {submitting ? 'Gerando...' : 'Gerar rota'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default RouteForm
