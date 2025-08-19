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
        className="btn btn-secondary w-full flex justify-between items-center"
      >
        🎨 Estilos de capas
        <span>{open ? "▲" : "▼"}</span>
      </button>

      {/* Contenido desplegable */}
      {open && (
        <div className="mt-4 bg-white rounded-xl shadow-md p-6 space-y-6">
          {layers.map((layer) => {
            const st = styles[layer.id] || {}
            return (
              <div key={layer.id} className="border-b border-gray-200 pb-4 last:border-0 last:pb-0">
                <h4 className="font-semibold text-gray-700 mb-2">{layer.name}</h4>

                {/* Color de borde */}
                <label className="block mb-2">
                  <span className="text-sm text-gray-600">Borde</span>
                  <input
                    type="color"
                    value={st.color || "#000000"}
                    onChange={(e) => onLocalChange(layer.id, { color: e.target.value })}
                    className="ml-2"
                  />
                </label>

                {/* Opacidad */}
                <label className="block mb-2">
                  <span className="text-sm text-gray-600">Opacidad</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={st.opacity ?? 1}
                    onChange={(e) => onLocalChange(layer.id, { opacity: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                  <span className="text-sm ml-2">{Math.round((st.opacity ?? 1) * 100)}%</span>
                </label>

                {/* Relleno */}
                <label className="block mb-2">
                  <span className="text-sm text-gray-600">Relleno</span>
                  <input
                    type="color"
                    value={st.fillColor || "#000000"}
                    onChange={(e) => onLocalChange(layer.id, { fillColor: e.target.value })}
                    className="ml-2"
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
                    className="w-full"
                  />
                  <span className="text-sm ml-2">{Math.round((st.fillOpacity ?? 0.5) * 100)}%</span>
                </label>

                {/* Radio */}
                <label className="block mb-2">
                  <span className="text-sm text-gray-600">Radio</span>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    step={1}
                    value={st.radius ?? 5}
                    onChange={(e) => onLocalChange(layer.id, { radius: parseInt(e.target.value) })}
                    className="w-full"
                  />
                  <span className="text-sm ml-2">{st.radius ?? 5}px</span>
                </label>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
