import './styles.css'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import AuthGate from './components/AuthGate'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ProjectPage from './pages/ProjectPage'

export default function App() {
  return (
    <AuthGate
      fallback={<Login />}
    >
      {(session) => (
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Dashboard email={session.user.email ?? 'sin-email'} />} />
            <Route path="/project/:projectId" element={<ProjectPage />} />
          </Routes>
        </BrowserRouter>
      )}
    </AuthGate>
  )
}
