import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
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
      { label: 'Visao geral', to: '/' },
      {
        label: 'Rotas',
        to: '/rotas',
        children: [
          { label: 'Listar rotas', to: '/rotas/lista' },
          { label: 'Planejamento', to: '/rotas/planejamento' },
        ],
      },
    ],
  },
  {
    label: 'Configuracoes',
    items: [
      {
        label: 'Equipe',
        to: '/configuracoes',
        children: [
          { label: 'Motoristas', to: '/configuracoes/motoristas' },
          { label: 'Veiculos', to: '/configuracoes/veiculos' },
        ],
      },
    ],
  },
]

function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({})

  const isPathActive = (target: string) => {
    const normalizedTarget = target.replace(/\/+$/, '')
    const current = location.pathname.replace(/\/+$/, '')
    return current === normalizedTarget || current.startsWith(`${normalizedTarget}/`)
  }

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
                  if (item.to) navigate(item.to)
                }

                return (
                  <li key={item.label}>
                    {hasChildren ? (
                      <>
                        <button onClick={handleParentClick}>
                          {item.label}
                        </button>
                        <ul className={`submenu ${isExpanded ? 'expanded' : 'collapsed'}`}>
                          {item.children!.map((child) => (
                            <li key={child.to}>
                              <NavLink
                                to={child.to}
                                className={({ isActive }) =>
                                  isActive ? 'active' : undefined
                                }
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
                        className={({ isActive }) =>
                          isActive ? 'active' : undefined
                        }
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
