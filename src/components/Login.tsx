import { useState } from "react"
import { supabase } from "../lib/supabase"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)

  async function signIn(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) alert(error.message)
  }

  async function signUp(e: React.MouseEvent) {
    e.preventDefault()
    setBusy(true)
    const { error } = await supabase.auth.signUp({ email, password })
    setBusy(false)
    if (error) alert(error.message)
    else alert("Revisa tu correo para confirmar la cuenta.")
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-100 to-blue-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        {/* Logo / Título */}
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
          🌿 Pudumaps
        </h1>
        <h2 className="text-lg text-center text-gray-500 mb-8">
          Inicia sesión en tu cuenta
        </h2>

        {/* Formulario */}
        <form className="space-y-4" onSubmit={signIn}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tucorreo@dominio.com"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
            />
          </div>

          {/* Botones */}
          <div className="flex flex-col gap-3">
            <button
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-xl transition disabled:opacity-60"
              type="submit"
              disabled={busy}
            >
              {busy ? "Ingresando…" : "Entrar"}
            </button>

            <button
              onClick={signUp}
              disabled={busy}
              className="w-full border border-gray-300 hover:border-gray-400 text-gray-700 font-medium py-2 rounded-xl transition"
            >
              Crear cuenta
            </button>
          </div>
        </form>

        {/* Mensaje */}
        <p className="text-center text-sm text-gray-500 mt-6">
          ¿Primera vez? <span className="font-medium">Crea tu cuenta</span> y revisa tu correo para confirmar.
        </p>
      </div>
       <div className="min-h-screen bg-red-500 flex items-center justify-center">
      <h1 className="text-5xl font-bold text-white">Tailwind funciona 🚀</h1>
    </div>
    </div>
  )
}
