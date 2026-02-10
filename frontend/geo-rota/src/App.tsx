import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom'

import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './layout/AppLayout'
import Home from './pages/Home'
import Login from './pages/Login'
import { FuncionarioFormPage, FuncionariosPage } from './pages/funcionarios'
import { GrupoRotaFormPage, GruposRotaPage } from './pages/gruposRota'
import { GerarRotaAutomaticaPage } from './pages/rotasAutomaticas'
import { GerenciamentoRotasPage } from './pages/rotasHistorico'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Home />} />
            <Route path="/cadastro/funcionarios">
              <Route index element={<FuncionariosPage />} />
              <Route path="criar" element={<FuncionarioFormPage mode="create" />} />
              <Route path="editar/:funcionarioId" element={<FuncionarioFormPage mode="edit" />} />
            </Route>
            <Route path="/cadastro/grupos-rota">
              <Route index element={<GruposRotaPage />} />
              <Route path="criar" element={<GrupoRotaFormPage mode="create" />} />
              <Route path="editar/:grupoId" element={<GrupoRotaFormPage mode="edit" />} />
            </Route>
            <Route path="/operacao/rotas">
              <Route index element={<GerarRotaAutomaticaPage />} />
              <Route path="gerenciamento" element={<GerenciamentoRotasPage />} />
              <Route path="historico" element={<Navigate to="/operacao/rotas/gerenciamento" replace />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
