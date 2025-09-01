import { useState, useEffect } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import type { MapViewApi } from "./MapView"

interface Props {
  mapRef: React.RefObject<MapViewApi>
}

interface LayerEntry {
  id: string
  url: string
  name: string
  layer: L.TileLayer.WMS | null
  visible: boolean
}

// --- capas predefinidas (Sernageomin) ---
const predefinedLayers: LayerEntry[] = [
  {
    id: "sernageomin-mineria-19s",
    url: "https://catastromineronline.sernageomin.cl/arcgismin/services/MINERIA/WMS_PROPIEDAD_MINERA_19S/MapServer/WMSServer",
    name: "🌐 WMS Minero 19S",
    layer: L.tileLayer.wms(
      "https://catastromineronline.sernageomin.cl/arcgismin/services/MINERIA/WMS_PROPIEDAD_MINERA_19S/MapServer/WMSServer",
      {
        layers: "0,1,2,3",
        format: "image/png",
        transparent: true,
        version: "1.3.0",
      }
    ),
    visible: false,
  },
  {
    id: "sernageomin-mineria-18s",
    url: "https://catastromineronline.sernageomin.cl/arcgismin/services/MINERIA/WMS_PROPIEDAD_MINERA_18S/MapServer/WMSServer",
    name: "🌐 WMS Minero 18S",
    layer: L.tileLayer.wms(
      "https://catastromineronline.sernageomin.cl/arcgismin/services/MINERIA/WMS_PROPIEDAD_MINERA_18S/MapServer/WMSServer",
      {
        layers: "0,1,2,3",
        format: "image/png",
        transparent: true,
        version: "1.3.0",
      }
    ),
    visible: false,
  },
]

export default function WMSLayerPanel({ mapRef }: Props) {
  const [url, setUrl] = useState("")
  const [layerName, setLayerName] = useState("")
  const [layers, setLayers] = useState<LayerEntry[]>([])
  const [msg, setMsg] = useState<{ type: "loading" | "success" | "error" | null; text: string }>({
    type: null,
    text: "",
  })

  // Inicializar con predefinidas
  useEffect(() => {
    setLayers(predefinedLayers)
  }, [])

  const showMsg = (type: "loading" | "success" | "error", text: string) => {
    setMsg({ type, text })
    if (type !== "loading") {
      setTimeout(() => setMsg({ type: null, text: "" }), 3000)
    }
  }

  // --- Agregar capa manual ---
  const addLayer = () => {
    const map = mapRef.current?.leafletMap
    if (!map || !url.trim()) return

    const serviceUrl = url.trim()
    const id = `${Date.now()}`

    showMsg("loading", "⏳ Cargando capa...")

    try {
      const layer = L.tileLayer.wms(serviceUrl, {
        layers: layerName || "0",
        format: "image/png",
        transparent: true,
        version: "1.3.0",
      })

      layer.addTo(map)
      setLayers((prev) => [
        ...prev,
        { id, url: serviceUrl, name: layerName || "0", layer, visible: true },
      ])
      showMsg("success", "✅ Capa cargada correctamente")
      setUrl("")
      setLayerName("")
    } catch (e) {
      console.error(e)
      showMsg("error", "❌ Error al cargar la capa")
    }
  }

  // --- Toggle visible ---
  const toggleVisibility = (id: string) => {
    const map = mapRef.current?.leafletMap
    if (!map) return

    setLayers((prev) =>
      prev.map((entry) => {
        if (entry.id === id) {
          if (entry.visible && entry.layer) {
            map.removeLayer(entry.layer)
          } else {
            if (entry.layer) entry.layer.addTo(map)
          }
          return { ...entry, visible: !entry.visible }
        }
        return entry
      })
    )
  }

  // --- Eliminar capa manual ---
  const removeLayer = (id: string) => {
    const map = mapRef.current?.leafletMap
    if (!map) return

    setLayers((prev) => {
      const entry = prev.find((e) => e.id === id)
      if (entry && entry.layer) map.removeLayer(entry.layer)
      return prev.filter((e) => e.id !== id)
    })
  }

  return (
    <div className="p-5 text-white bg-[#1e293b] h-full flex flex-col rounded-lg">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        🌐 Capas externas
      </h2>

      {/* Input manual */}
      <div className="flex flex-col gap-3 mb-4">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="🔗 URL WMS"
          className="px-3 py-2 rounded-md text-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          value={layerName}
          onChange={(e) => setLayerName(e.target.value)}
          placeholder="📌 Nombre/ID de capa (ej: 0 o 0,1,2)"
          className="px-3 py-2 rounded-md text-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={addLayer}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md font-medium shadow transition"
        >
          ➕ Agregar
        </button>
      </div>

      {msg.type && (
        <div
          className={`mb-4 text-sm px-3 py-2 rounded-md font-medium ${
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

      {/* Lista de capas */}
      <h3 className="text-md font-semibold mb-3">📋 Capas activas</h3>

      {/* Grupo Sernageomin */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-300 mb-2">Capas Sernageomin</h4>
        <ul className="space-y-2">
          {layers
            .filter((entry) => predefinedLayers.find((pl) => pl.id === entry.id))
            .map((entry) => (
              <li
                key={entry.id}
                className="flex justify-between items-center bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-md transition"
              >
                <label className="flex items-center gap-2 truncate">
                  <input
                    type="checkbox"
                    checked={entry.visible}
                    onChange={() => toggleVisibility(entry.id)}
                    className="accent-blue-500"
                  />
                  <span className="truncate">{entry.name}</span>
                </label>
              </li>
            ))}
        </ul>
      </div>

      {/* Grupo manual */}
      <div>
        <h4 className="text-sm font-medium text-gray-300 mb-2">Capas agregadas manualmente</h4>
        <ul className="space-y-2">
          {layers.filter((entry) => !predefinedLayers.find((pl) => pl.id === entry.id)).length === 0 && (
            <li className="text-gray-400 text-sm italic">No hay capas manuales</li>
          )}
          {layers
            .filter((entry) => !predefinedLayers.find((pl) => pl.id === entry.id))
            .map((entry) => (
              <li
                key={entry.id}
                className="flex justify-between items-center bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-md transition"
              >
                <label className="flex items-center gap-2 truncate">
                  <input
                    type="checkbox"
                    checked={entry.visible}
                    onChange={() => toggleVisibility(entry.id)}
                    className="accent-blue-500"
                  />
                  <span className="truncate">{entry.name}</span>
                </label>
                <button
                  onClick={() => removeLayer(entry.id)}
                  className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs"
                >
                  ✕
                </button>
              </li>
            ))}
        </ul>
      </div>
    </div>
  )
}
