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
  const [layerName, setLayerName] = useState("")
  const [layers, setLayers] = useState<Record<string, L.Layer>>({})
  const [msg, setMsg] = useState<{ type: "loading" | "success" | "error" | null; text: string }>({
    type: null,
    text: "",
  })

  const addLayer = () => {
    const map = mapRef.current?.leafletMap
    if (!map || !url.trim()) return

    // Normalizar URL: /MapServer → /WMSServer?
    let serviceUrl = url.trim()
    if (/\/MapServer$/i.test(serviceUrl)) {
      serviceUrl = serviceUrl.replace(/\/MapServer$/i, "/WMSServer?")
    }

    if (Object.values(layers).some((l: any) => l._url === serviceUrl && l._layerName === layerName)) {
      setMsg({ type: "error", text: "⚠️ Esta capa ya está cargada" })
      return
    }

    setMsg({ type: "loading", text: "⏳ Cargando capa..." })

    try {
      let layer: L.Layer | null = null

      if (/\/WMSServer/i.test(serviceUrl)) {
        layer = L.tileLayer.wms(serviceUrl, {
          layers: layerName || "0",
          format: "image/png",
          transparent: true,
        })
      } else if (/\/MapServer(\/\d+)?/i.test(serviceUrl)) {
        const ids = layerName
          ? layerName.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n))
          : undefined
        layer = EL.dynamicMapLayer({
          url: serviceUrl,
          opacity: 0.8,
          ...(ids ? { layers: ids } : {}),
        })
      }

      if (layer) {
        const id = `${Date.now()}`
        ;(layer as any)._url = serviceUrl
        ;(layer as any)._layerName = layerName
        layer.addTo(map)
        setLayers((prev) => ({ ...prev, [id]: layer }))
        setMsg({ type: "success", text: "✅ Capa cargada correctamente" })
        setTimeout(() => setMsg({ type: null, text: "" }), 3000)
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

      <div className="flex flex-col gap-2 mb-3">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="URL WMS o ArcGIS REST"
          className="px-2 py-1 rounded text-black"
        />
        <input
          type="text"
          value={layerName}
          onChange={(e) => setLayerName(e.target.value)}
          placeholder="Nombre/id de capa (ej: 0 o 0,1,2)"
          className="px-2 py-1 rounded text-black"
        />
        <button onClick={addLayer} className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded">
          Agregar
        </button>
      </div>

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
        {Object.entries(layers).map(([id, l]) => (
          <li key={id} className="flex justify-between items-center bg-gray-700 px-2 py-1 rounded">
            <span className="truncate">
              {(l as any)._url} ({(l as any)._layerName || "default"})
            </span>
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
