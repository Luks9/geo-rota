import { Link } from 'react-router-dom'

function Topbar() {
  return (
    <nav className="navbar is-success topbar" role="navigation" aria-label="main navigation">
      <div className="navbar-brand">
        <Link className="navbar-item has-text-weight-semibold is-size-5" to="/">
          Geo-Rota Joao Henry
        </Link>
      </div>
    </nav>
  )
}

export default Topbar