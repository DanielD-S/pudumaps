import { useState } from "react"
import { supabase } from "../lib/supabase"
import pudulogo from "../assets/pudulogo.png"
import { useNavigate } from "react-router-dom"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loadingLogin, setLoadingLogin] = useState(false)
  const [loadingSignup, setLoadingSignup] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoadingLogin(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
    } else {
      navigate("/dashboard", { replace: true }) // ✅ redirige al dashboard
    }
    setLoadingLogin(false)
  }

  const handleSignup = async () => {
    setLoadingSignup(true)
    setError(null)

    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
    } else {
      // Redirige directo al dashboard (aunque el correo quede pendiente de confirmar)
      navigate("/dashboard", { replace: true })
    }
    setLoadingSignup(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="card max-w-md w-full">
        {/* Logo + título */}
        <div className="text-center mb-6">
          <img src={pudulogo} alt="Pudumaps logo" className="w-16 h-16 mx-auto" />
          <h1 className="text-2xl font-bold mt-2">Pudumaps</h1>
          <p className="text-gray-400 text-sm">Inicia sesión o crea tu cuenta</p>
        </div>

        {/* Formulario */}
        <form className="space-y-5" onSubmit={handleLogin}>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Correo electrónico</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ejemplo@correo.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Contraseña</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              required
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button type="submit" className="btn btn-primary w-full" disabled={loadingLogin}>
            {loadingLogin ? "Entrando..." : "Entrar"}
          </button>

          <button
            type="button"
            onClick={handleSignup}
            className="btn btn-secondary w-full"
            disabled={loadingSignup}
          >
            {loadingSignup ? "Creando..." : "Crear cuenta"}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          ¿Primera vez?{" "}
          <span className="text-green-400">Crea tu cuenta</span> y revisa tu correo para confirmar.
        </p>

        {/* 🚀 Roadmap actualizado */}
        <div className="mt-8 border-t border-gray-700 pt-4 text-sm text-gray-400">
          <h3 className="text-gray-200 font-semibold mb-3">🚀 Roadmap Pudumaps</h3>

          <div className="space-y-3">
            <div>
              <h4 className="text-gray-300 font-medium">✅ Ahora</h4>
              <ul className="list-disc list-inside">
                <li>Gestión de proyectos (crear, editar, eliminar, favoritos)</li>
                <li>Capas GeoJSON con estilos editables y persistentes</li>
                <li>Capas externas WMS con consulta GetFeatureInfo</li>
                <li>Exportación de mapas a KMZ y PDF</li>
              </ul>
            </div>

            <div>
              <h4 className="text-gray-300 font-medium">⏳ Próximo</h4>
              <ul className="list-disc list-inside">
                <li>Soporte para servicios ArcGIS REST</li>
                <li>Herramientas de medición y dibujo en el mapa</li>
                <li>Compartir proyectos de forma pública/privada</li>
              </ul>
            </div>

            <div>
              <h4 className="text-gray-300 font-medium">🌌 Futuro</h4>
              <ul className="list-disc list-inside">
                <li>Roles y permisos colaborativos por proyecto</li>
                <li>Filtros y estadísticas por atributos</li>
                <li>Optimización para grandes volúmenes de datos</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
