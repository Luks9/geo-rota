import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth'

function Topbar() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <nav className="navbar topbar custom-navbar" role="navigation" aria-label="main navigation">
      <div className="navbar-brand">
        <Link className="navbar-item has-text-weight-semibold is-size-5" to="/">
          Geo-Rota Joao Henry
        </Link>
      </div>
      <div className="navbar-menu is-active">
        <div className="navbar-end pr-4">
          {user && (
            <div className="navbar-item">
              <div className="mr-4">
                <p className="has-text-weight-semibold is-size-6">{user.nome}</p>
              </div>
              <button type="button" className="button is-small logout-button" onClick={handleLogout}>
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Topbar
