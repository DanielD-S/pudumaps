import { supabase } from "../lib/supabase"

interface HeaderProps {
  email?: string   // 👈 ahora es opcional
  onLogout?: () => void
}

export default function Header({ email, onLogout }: HeaderProps) {
  async function handleLogout() {
    await supabase.auth.signOut()
    if (onLogout) onLogout()
  }

  return (
    <header className="w-full flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <h1 className="text-xl font-bold text-gray-800 dark:text-white">
        🌿 Pudumaps
      </h1>
      <div className="flex items-center gap-4">
        {email && (
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {email}
          </span>
        )}
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 text-white text-sm px-3 py-1.5 rounded-lg shadow transition"
        >
          Cerrar sesión
        </button>
      </div>
    </header>
  )
}
