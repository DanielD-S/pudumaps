import { useState } from "react"
import { supabase } from "../lib/supabase"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
    }

    setLoading(false)
  }

  const handleSignup = async () => {
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      setError(error.message)
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="card max-w-md w-full">
        <div className="text-center mb-6">
          <span className="text-4xl">🌿</span>
          <h1 className="text-2xl font-bold mt-2">Pudumaps</h1>
          <p className="text-gray-400 text-sm">Inicia sesión en tu cuenta</p>
        </div>

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

          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <button
            type="button"
            onClick={handleSignup}
            className="btn btn-secondary w-full"
            disabled={loading}
          >
            {loading ? "Creando..." : "Crear cuenta"}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          ¿Primera vez? <span className="text-green-400">Crea tu cuenta</span> y revisa tu correo para confirmar.
        </p>

        {/* 🚀 Roadmap estático */}
        <div className="mt-8 border-t border-gray-700 pt-4 text-sm text-gray-400">
          <h3 className="text-gray-200 font-semibold mb-3">🚀 Roadmap Pudumaps</h3>

          <div className="space-y-3">
            <div>
              <h4 className="text-gray-300 font-medium">✅ Ahora</h4>
              <ul className="list-disc list-inside">
                <li>Capas GeoJSON con estilos editables</li>
                <li>Capas externas WMS</li>
                <li>Exportación a KMZ y PDF</li>
              </ul>
            </div>

            <div>
              <h4 className="text-gray-300 font-medium">⏳ Próximo</h4>
              <ul className="list-disc list-inside">
                <li>Soporte ArcGIS REST</li>
                <li>Herramientas de medición y dibujo</li>
                <li>Roles y permisos por proyecto</li>
              </ul>
            </div>

            <div>
              <h4 className="text-gray-300 font-medium">🌌 Futuro</h4>
              <ul className="list-disc list-inside">
                <li>Compartir proyectos públicos</li>
                <li>Estadísticas y filtros por atributos</li>
                <li>Infraestructura optimizada para grandes capas</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
