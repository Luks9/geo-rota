import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import '../styles/sidebar.css'

type MenuLeaf = {
  label: string
  to: string
}

type MenuItem = {
  label: string
  to?: string
  children?: MenuLeaf[]
}

type MenuSection = {
  label: string
  items: MenuItem[]
}

const sections: MenuSection[] = [
  {
    label: 'Principal',
    items: [
      { label: 'Visão geral', to: '/' },
      {
        label: 'Cadastro',
        to: '/cadastro',
        children: [
          { label: 'Funcionários', to: '/cadastro/funcionarios' },
          { label: 'Grupos de rota', to: '/cadastro/grupos-rota' },
        ],
      },
    ],
  },
  {
    label: 'Rotas',
    items: [
      {
        label: 'Operação',
        to: '/operacao',
        children: [
          { label: 'Rotas automáticas', to: '/operacao/rotas' },
          { label: 'Gerenciamento de rotas', to: '/operacao/rotas/gerenciamento' },
        ],
      },
    ],
  },
  {
    label: 'Configurações',
    items: [
      {
        label: 'Equipe',
        to: '/configuracoes',
        children: [
          { label: 'Motoristas', to: '/configuracoes/motoristas' },
          { label: 'Veículos', to: '/configuracoes/veiculos' },
        ],
      },
    ],
  },
]

function Sidebar() {
  const location = useLocation()
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({})

  // Verifica se o caminho atual corresponde à rota alvo ou seus filhos
  const isPathActive = (target: string) => {
    const normalizedTarget = target.replace(/\/+$/, '')
    const current = location.pathname.replace(/\/+$/, '')
    return current === normalizedTarget || current.startsWith(`${normalizedTarget}/`)
  }

  // Expande automaticamente o menu com base na rota ativa
  useEffect(() => {
    const expandedByRoute: Record<string, boolean> = {}
    sections.forEach((section) => {
      section.items.forEach((item) => {
        if (item.children && item.children.some((child) => isPathActive(child.to))) {
          expandedByRoute[item.label] = true
        }
      })
    })
    setOpenItems((prev) => ({ ...prev, ...expandedByRoute }))
  }, [location.pathname])

  // Alterna o estado de expansão do submenu
  const toggleItem = (label: string, forceValue?: boolean) => {
    setOpenItems((prev) => {
      const current = prev[label] ?? false
      const nextValue = forceValue ?? !current
      return { ...prev, [label]: nextValue }
    })
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-content">
        {sections.map((section) => (
          <div key={section.label} className="mb-5">
            <p className="menu-label">{section.label}</p>
            <ul className="menu-list">
              {section.items.map((item) => {
                const hasChildren = !!item.children
                const hasActiveChild = hasChildren && item.children!.some((child) => isPathActive(child.to))
                const isExpanded = openItems[item.label] ?? hasActiveChild

                const handleParentClick = () => {
                  toggleItem(item.label, !isExpanded)
                }

                return (
                  <li key={item.label}>
                    {hasChildren ? (
                      <>
                        <button
                          onClick={handleParentClick}
                          className={isExpanded ? 'active' : undefined}
                        >
                          <span>{item.label}</span>
                        </button>
                        <ul className={`submenu ${isExpanded ? 'expanded' : 'collapsed'}`}>
                          {item.children!.map((child) => (
                            <li key={child.to}>
                              <NavLink
                                to={child.to}
                                end
                                className={({ isActive }) => (isActive ? 'active' : undefined)}
                              >
                                {child.label}
                              </NavLink>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <NavLink
                        to={item.to ?? '/'}
                        className={({ isActive }) => (isActive ? 'active' : undefined)}
                      >
                        {item.label}
                      </NavLink>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  )
}

export default Sidebar
