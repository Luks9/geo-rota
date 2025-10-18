import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom'

import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './layout/AppLayout'
import Home from './pages/Home'
import Login from './pages/Login'
import { FuncionariosPage } from './pages/funcionarios/index'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Home />} />
            <Route path="/cadastro/funcionarios" element={<FuncionariosPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
