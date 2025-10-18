import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import AppLayout from './layout/AppLayout'
import Home from './pages/Home'
import Rotas from './pages/Rotas'

function App() {
  return (
    <Router>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/rotas" element={<Rotas />} />
        </Routes>
      </AppLayout>
    </Router>
  )
}

export default App
