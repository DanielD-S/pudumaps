import { useState } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import * as EL from "esri-leaflet"
import type { MapViewApi } from "./MapView"

interface Props {
  mapRef: React.RefObject<MapViewApi>
}

export default function WMSLayerPanel({ mapRef }: Props) {
  const [url, setUrl] = useState("")
  const [layers, setLayers] = useState<Record<string, L.Layer>>({})
  const [msg, setMsg] = useState<{ type: "loading" | "success" | "error" | null; text: string }>({
    type: null,
    text: "",
  })

  const addLayer = () => {
    const map = mapRef.current?.leafletMap
    if (!map || !url.trim()) return

    setMsg({ type: "loading", text: "⏳ Cargando capa..." })

    try {
      let layer: L.Layer | null = null

      if (/\/MapServer(\/\d+)?$/i.test(url)) {
        // ArcGIS REST (MapServer completo o sublayer)
        layer = EL.dynamicMapLayer({
          url,
          opacity: 0.8,
        })
      } else if (/\/WMSServer/i.test(url)) {
        // ArcGIS WMS
        layer = L.tileLayer.wms(url, {
          layers: "0", // 👈 puedes dejar fijo o permitir seleccionar
          format: "image/png",
          transparent: true,
        })
      } else if (/service=WMS/i.test(url) || url.toLowerCase().includes("wms")) {
        // WMS genérico
        layer = L.tileLayer.wms(url, {
          layers: "",
          format: "image/png",
          transparent: true,
        })
      }

      if (layer) {
        const id = `${Date.now()}`
        layer.addTo(map)
        setLayers((prev) => ({ ...prev, [id]: layer }))
        setMsg({ type: "success", text: "✅ Capa cargada correctamente" })
      } else {
        setMsg({ type: "error", text: "⚠️ No se pudo reconocer la URL como ArcGIS REST o WMS" })
      }
    } catch (e) {
      console.error(e)
      setMsg({ type: "error", text: "❌ Error al cargar la capa" })
    }
  }

  const removeLayer = (id: string) => {
    const map = mapRef.current?.leafletMap
    if (!map) return
    const layer = layers[id]
    if (layer) {
      map.removeLayer(layer)
      setLayers((prev) => {
        const c = { ...prev }
        delete c[id]
        return c
      })
    }
  }

  return (
    <div className="p-4 text-white bg-[#1e293b] h-full flex flex-col">
      <h2 className="text-lg font-semibold mb-3">🌐 Capas externas</h2>

      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="URL WMS o ArcGIS REST"
          className="flex-1 px-2 py-1 rounded text-black"
        />
        <button
          onClick={addLayer}
          className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded"
        >
          Agregar
        </button>
      </div>

      {/* Mensajes */}
      {msg.type && (
        <div
          className={`mb-3 text-sm px-2 py-1 rounded ${
            msg.type === "loading"
              ? "bg-yellow-600"
              : msg.type === "success"
              ? "bg-green-600"
              : "bg-red-600"
          }`}
        >
          {msg.text}
        </div>
      )}

      <h3 className="text-md font-medium mb-2">Capas activas</h3>
      <ul className="space-y-2">
        {Object.keys(layers).length === 0 && (
          <li className="text-gray-400 text-sm">No hay capas cargadas</li>
        )}
        {Object.entries(layers).map(([id, _]) => (
          <li
            key={id}
            className="flex justify-between items-center bg-gray-700 px-2 py-1 rounded"
          >
            <span className="truncate">Capa {id}</span>
            <button
              onClick={() => removeLayer(id)}
              className="bg-red-600 hover:bg-red-700 px-2 py-0.5 rounded text-sm"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
