import { useState } from "react"
import type { ProjectLayer, LayerStyle } from "../types"

interface Props {
  layers: ProjectLayer[]
  styles: Record<string, LayerStyle>
  onLocalChange: (layerId: string, patch: Partial<LayerStyle>) => void
}

export default function LayerStylePanel({ layers, styles, onLocalChange }: Props) {
  const [open, setOpen] = useState(false)

  if (layers.length === 0) return null

  return (
    <div className="mt-4">
      {/* Botón para desplegar/esconder */}
      <button
        onClick={() => setOpen(!open)}
        className="btn btn-secondary w-full flex justify-between items-center text-sm sm:text-base"
      >
        🎨 Estilos de capas
        <span>{open ? "▲" : "▼"}</span>
      </button>

      {/* Contenido desplegable */}
      {open && (
        <div className="mt-4 bg-gray-800 rounded-xl shadow-md p-4 sm:p-6 space-y-6">
          {layers.map((layer) => {
            const st = styles[layer.id] || {}
            return (
              <div
                key={layer.id}
                className="border-b border-gray-700 pb-4 last:border-0 last:pb-0"
              >
                <h4 className="font-semibold text-gray-100 mb-2 text-sm sm:text-base">
                  {layer.name}
                </h4>

                {/* Color de borde */}
                <label className="block mb-3 text-xs sm:text-sm text-gray-200">
                  Borde
                  <input
                    type="color"
                    value={st.color || "#000000"}
                    onChange={(e) => onLocalChange(layer.id, { color: e.target.value })}
                    className="ml-2 w-10 h-6 border border-gray-600 rounded cursor-pointer"
                  />
                </label>

                {/* Opacidad */}
                <label className="block mb-3 text-xs sm:text-sm text-gray-200">
                  Opacidad
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={st.opacity ?? 1}
                      onChange={(e) =>
                        onLocalChange(layer.id, { opacity: parseFloat(e.target.value) })
                      }
                      className="w-full accent-green-500"
                    />
                    <span className="text-gray-300">
                      {Math.round((st.opacity ?? 1) * 100)}%
                    </span>
                  </div>
                </label>

                {/* Relleno */}
                <label className="block mb-3 text-xs sm:text-sm text-gray-200">
                  Relleno
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={st.fillColor || "#000000"}
                      onChange={(e) => onLocalChange(layer.id, { fillColor: e.target.value })}
                      className="w-10 h-6 border border-gray-600 rounded cursor-pointer"
                    />
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={st.fillOpacity ?? 0.5}
                      onChange={(e) =>
                        onLocalChange(layer.id, { fillOpacity: parseFloat(e.target.value) })
                      }
                      className="w-full accent-green-500"
                    />
                    <span className="text-gray-300">
                      {Math.round((st.fillOpacity ?? 0.5) * 100)}%
                    </span>
                  </div>
                </label>

                {/* Radio */}
                <label className="block mb-2 text-xs sm:text-sm text-gray-200">
                  Radio
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={1}
                      max={20}
                      step={1}
                      value={st.radius ?? 5}
                      onChange={(e) =>
                        onLocalChange(layer.id, { radius: parseInt(e.target.value) })
                      }
                      className="w-full accent-green-500"
                    />
                    <span className="text-gray-300">{st.radius ?? 5}px</span>
                  </div>
                </label>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
