import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useNotification } from '../../hooks/useNotification'
import GruposRotaTable from './components/GruposRotaTable'
import grupoRotaService, { type GrupoRota } from './services/grupoRotaService'

function GruposRotaPage() {
  const [grupos, setGrupos] = useState<GrupoRota[]>([])
  const [loading, setLoading] = useState(true)
  const { danger, success } = useNotification()
  const navigate = useNavigate()

  const carregarGrupos = useCallback(async () => {
    setLoading(true)
    try {
      const lista = await grupoRotaService.listar()
      setGrupos(lista)
    } catch (error) {
      console.error(error)
      danger('Falha ao carregar os grupos de rota. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [danger])

  useEffect(() => {
    void carregarGrupos()
  }, [carregarGrupos])

  const handleNavigateToCreate = () => {
    navigate('/cadastro/grupos-rota/criar')
  }

  const handleNavigateToEdit = (grupo: GrupoRota) => {
    navigate(`/cadastro/grupos-rota/editar/${grupo.id}`)
  }

  const handleRemove = async (grupo: GrupoRota) => {
    const confirmed = window.confirm(`Deseja remover o grupo ${grupo.nome}?`)
    if (!confirmed) return

    try {
      await grupoRotaService.remover(grupo.id)
      setGrupos((prev) => prev.filter((item) => item.id !== grupo.id))
      success('Grupo removido com sucesso.')
    } catch (error) {
      console.error(error)
      danger('Não foi possível remover o grupo de rota. Tente novamente.')
    }
  }

  return (
    <section className="section">
      <div className="level">
        <div className="level-left">
          <div>
            <h1 className="title is-4">Grupos de rota</h1>
            <p className="subtitle is-6 has-text-grey">Gerencie os grupos disponíveis para roteirização.</p>
          </div>
        </div>
        <div className="level-right">
          <button type="button" className="button is-success" onClick={handleNavigateToCreate}>
            <span className="icon">
              <i className="fas fa-plus" aria-hidden="true" />
            </span>
            <span>Novo grupo</span>
          </button>
        </div>
      </div>

      <GruposRotaTable grupos={grupos} loading={loading} onEdit={handleNavigateToEdit} onDelete={handleRemove} />
    </section>
  )
}

export default GruposRotaPage
