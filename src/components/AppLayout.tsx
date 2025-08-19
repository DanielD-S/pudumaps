import { useState } from "react"
import Header from "./Header"
import HeaderMobile from "./HeaderMobile"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="hidden md:block">
        <Header />
      </div>
      <div className="block md:hidden">
        <HeaderMobile />
      </div>

      {/* Contenedor principal */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar en desktop */}
        <aside className="hidden lg:block w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
            Panel lateral
          </h2>
          {/* Aquí va la lista de capas / uploader / controles */}
          <div className="space-y-3">
            <button className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition">
              + Nueva capa
            </button>
            <button className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition">
              Configuración
            </button>
          </div>
        </aside>

        {/* Contenedor del mapa o contenido principal */}
        <main className="flex-1 relative overflow-hidden">
          {children}

          {/* Botón flotante para abrir el sidebar (solo en móvil/tablet) */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute top-4 left-4 z-20 lg:hidden bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-700 transition"
          >
            ☰
          </button>

          {/* Sidebar móvil (off-canvas) */}
          {sidebarOpen && (
            <div className="fixed inset-0 z-30 flex">
              {/* Fondo oscuro */}
              <div
                className="fixed inset-0 bg-black bg-opacity-50"
                onClick={() => setSidebarOpen(false)}
              ></div>

              {/* Panel lateral */}
              <aside className="relative w-72 bg-white dark:bg-gray-800 h-full p-4 shadow-xl z-40">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                    Panel lateral
                  </h2>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    ✕
                  </button>
                </div>

                {/* Contenido del sidebar */}
                <div className="space-y-3">
                  <button className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition">
                    + Nueva capa
                  </button>
                  <button className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition">
                    Configuración
                  </button>
                </div>
              </aside>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
