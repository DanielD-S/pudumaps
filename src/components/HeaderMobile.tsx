import { supabase } from "../lib/supabase"
import pudulogo from "../assets/pudulogo.png"
import { useNavigate } from "react-router-dom"

interface HeaderMobileProps {
  email?: string
  onLogout?: () => void
}

export default function HeaderMobile({ email, onLogout }: HeaderMobileProps) {
  const navigate = useNavigate()

  async function handleLogout() {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error("Error cerrando sesión:", err)
    }

    if (onLogout) onLogout()

    // 👇 Redirige al login
    navigate("/login", { replace: true })
  }

  return (
    <header className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      {/* Logo + título */}
      <div className="flex items-center gap-2">
        <img src={pudulogo} alt="Pudumaps logo" className="w-8 h-8" />
        <h1 className="text-lg font-bold text-gray-800 dark:text-white">
          Pudumaps
        </h1>
      </div>

      {/* Info usuario y botón logout */}
      <div className="flex items-center gap-3">
        {email && (
          <span className="hidden sm:block text-sm text-gray-600 dark:text-gray-300">
            {email}
          </span>
        )}
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 text-white text-sm px-3 py-1.5 rounded-lg transition"
        >
          ⎋
        </button>
      </div>
    </header>
  )
}
