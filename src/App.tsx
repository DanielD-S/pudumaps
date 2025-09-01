import './styles.css'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import AuthGate from './components/AuthGate'
import { HashRouter, Routes, Route } from 'react-router-dom'
import ProjectPage from './components/ProjectPage'

export default function App() {
  return (
    <HashRouter basename="/">
      <Routes>
        {/* Ruta pública */}
        <Route path="/login" element={<Login />} />

        {/* Rutas protegidas */}
        <Route
          path="/dashboard"
          element={
            <AuthGate fallback={<Login />}>
              {(session) => (
                <Dashboard email={session.user.email ?? 'sin-email'} />
              )}
            </AuthGate>
          }
        />
        <Route
          path="/project/:projectId"
          element={
            <AuthGate fallback={<Login />}>
              {() => <ProjectPage />}
            </AuthGate>
          }
        />

        {/* Redirección por defecto */}
        <Route path="*" element={<Login />} />
      </Routes>
    </HashRouter>
  )
}
