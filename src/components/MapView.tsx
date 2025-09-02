import { forwardRef, useImperativeHandle, useMemo, useRef, useState, useEffect } from "react"
import {
  MapContainer, TileLayer,
  LayersControl, ZoomControl, ScaleControl
} from "react-leaflet"
import L, { LatLng, LatLngBoundsExpression, Map as LeafletMap } from "leaflet"
import type { ProjectLayer, LayerStyle } from "../types"

// 👉 Geoman (Leaflet.PM) para dibujo
import "@geoman-io/leaflet-geoman-free"
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css"

// 👉 Leaflet.Measure para medición rápida
import "leaflet-measure"
import "leaflet-measure/dist/leaflet-measure.css"

// 👉 Geometry util para cálculos
import "leaflet-geometryutil"

// 👉 Toast elegante
import Toast from "./Toast"

export type MapViewApi = {
  zoomTo: (gj: any) => void
  readonly leafletMap: LeafletMap | null
}

export default forwardRef<MapViewApi, {
  layers: ProjectLayer[]
  visible: Record<string, boolean>
  styles: Record<string, LayerStyle>
}>(function MapView({ layers, visible, styles }, ref) {
  const mapRef = useRef<LeafletMap | null>(null)
  const [drawing, setDrawing] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type?: "success" | "error" | "info" } | null>(null)

  const chileCenter = useMemo(() => ({ lat: -33.45, lng: -70.65 }), [])

  // Exponer API
  useImperativeHandle(ref, () => ({
    zoomTo(gj: any) {
      if (!mapRef.current) return
      try {
        const f = L.geoJSON(gj)
        const b = f.getBounds()
        if (b.isValid())
          mapRef.current.fitBounds(b as LatLngBoundsExpression, { padding: [20, 20] })
      } catch { }
    },
    get leafletMap() {
      return mapRef.current
    },
  }))

  // --- Función para calcular medidas (Geoman)
  function getMeasurement(e: any): string {
    const shape = e.shape || e.layer?.pm?._shape || "Geometry"

    if (shape === "Polygon") {
      const area = L.GeometryUtil.geodesicArea(e.layer.getLatLngs()[0])
      const perimetro = L.GeometryUtil.length(e.layer.getLatLngs()[0])
      const ha = area / 10000
      return `📐 Polígono → Área: ${ha.toFixed(2)} ha | Perímetro: ${(perimetro / 1000).toFixed(2)} km`
    }

    if (shape === "Line") {
      const latlngs = e.layer.getLatLngs()
      const length = L.GeometryUtil.length(latlngs)
      return `📏 Línea → ${length < 1000 ? length.toFixed(1) + " m" : (length / 1000).toFixed(2)} km`
    }

    if (shape === "Circle") {
      const radius = e.layer.getRadius()
      const area = Math.PI * radius * radius
      const ha = area / 10000
      return `⭕ Círculo → Radio: ${radius.toFixed(1)} m | Área: ${ha.toFixed(2)} ha`
    }

    return ""
  }

  // --- Inicializar Geoman + Leaflet.Measure
  useEffect(() => {
    if (!mapRef.current) return
    const map = mapRef.current

    // 👉 Inicializar Leaflet.Measure
    const measureControl = new (L.Control as any).Measure({
      primaryLengthUnit: "meters",
      secondaryLengthUnit: "kilometers",
      primaryAreaUnit: "sqmeters",
      secondaryAreaUnit: "hectares",
      activeColor: "#00bcd4",
      completedColor: "#4caf50",
    })
    measureControl.addTo(map)
    ;(map as any)._measureControl = measureControl

    // 👉 Inicializar Geoman
    if (map.pm) {
      map.pm.addControls({
        position: "topleft",
        drawCircle: false,
        drawMarker: false,
        drawText: false,
      })

      map.on("pm:create", (e: any) => {
        const msg = getMeasurement(e)
        if (msg) {
          e.layer.bindPopup(msg).openPopup()
        }
        setDrawing(null)
      })
    }
  }, [])

  // --- Activar herramienta de dibujo
  function startDrawing(shape: string) {
    if (!mapRef.current) return
    mapRef.current.pm.enableDraw(shape)
    setDrawing(shape)
  }

  // --- Cancelar dibujo
  function cancelDrawing() {
    if (!mapRef.current) return
    const map = mapRef.current
    map.pm.disableDraw()
    map.eachLayer((layer: any) => {
      if (layer.pm && layer.pm._shape) {
        map.removeLayer(layer)
      }
    })
    setDrawing(null)
    setToast({ msg: "🗑️ Geometrías eliminadas", type: "info" })
  }

  // --- Herramientas básicas
  function fitChile() {
    if (!mapRef.current) return
    const bounds: LatLngBoundsExpression = [[-56, -76], [-17.5, -66]]
    mapRef.current.fitBounds(bounds, { padding: [20, 20] })
  }

  async function goToMyLocation() {
    if (!mapRef.current) return
    if (!("geolocation" in navigator)) {
      setToast({ msg: "❌ Geolocalización no disponible", type: "error" })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latlng = new LatLng(pos.coords.latitude, pos.coords.longitude)
        mapRef.current!.setView(latlng, 13)
        L.circleMarker(latlng, { radius: 6 }).addTo(mapRef.current!)
        setToast({ msg: "📍 Ubicación encontrada", type: "success" })
      },
      (err) => setToast({ msg: "❌ No se pudo obtener tu ubicación: " + err.message, type: "error" }),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const [isFullscreen, setIsFullscreen] = useState(false)
  function toggleFullscreen() {
    const el = mapRef.current?.getContainer()
    if (!el) return
    if (!document.fullscreenElement) {
      el.requestFullscreen?.()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen?.()
      setIsFullscreen(false)
    }
  }

  return (
    <div className="relative w-full rounded-xl border shadow-lg overflow-hidden">
      {/* Toast flotante */}
      {toast && (
        <div className="fixed top-4 right-4 z-[2000]">
          <Toast message={toast.msg} type={toast.type} duration={4000} onClose={() => setToast(null)} />
        </div>
      )}

      {/* Toolbar flotante */}
      <div className="absolute top-2 left-2 z-[1000] flex flex-wrap gap-2 p-2 bg-black/70 backdrop-blur rounded-lg shadow-md max-w-[95vw]">
        <button onClick={fitChile} className="btn-map p-2 sm:px-3 sm:py-1.5 rounded-full sm:rounded-md">
          ↺ <span className="hidden sm:inline ml-1">Chile</span>
        </button>
        <button onClick={goToMyLocation} className="btn-map p-2 sm:px-3 sm:py-1.5 rounded-full sm:rounded-md">
          📍 <span className="hidden sm:inline ml-1">Ubicación</span>
        </button>
        <button onClick={toggleFullscreen} className="btn-map p-2 sm:px-3 sm:py-1.5 rounded-full sm:rounded-md">
          ⛶ <span className="hidden sm:inline ml-1">Pantalla completa</span>
        </button>
        <button
  onClick={() => {
    if (mapRef.current && (mapRef.current as any)._measureControl) {
      const ctl = (mapRef.current as any)._measureControl
      console.log("✅ Botón Medir clickeado")

      if (ctl._measuring) {
        console.log("📏 Finalizando medición actual…")
        ctl._finishPath()
      } else {
        console.log("📐 Iniciando nueva medición (línea/polígono)…")
        ctl._startMeasure()
      }
    } else {
      console.warn("❌ No se encontró el control de medición en el mapa")
    }
  }}
  className="btn-map p-2 sm:px-3 sm:py-1.5 rounded-full sm:rounded-md"
>
  🔍 <span className="hidden sm:inline ml-1">Medir</span>
</button>


        {/* Botones de dibujo */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => startDrawing("Polygon")}
            className={`btn-map p-2 sm:px-3 sm:py-1.5 rounded-full sm:rounded-md ${drawing === "Polygon" ? "btn-map-active" : ""}`}
          >
            ✏️ <span className="hidden sm:inline ml-1">Polígono</span>
          </button>
          <button
            onClick={() => startDrawing("Line")}
            className={`btn-map p-2 sm:px-3 sm:py-1.5 rounded-full sm:rounded-md ${drawing === "Line" ? "btn-map-active" : ""}`}
          >
            📏 <span className="hidden sm:inline ml-1">Línea</span>
          </button>
          <button
            onClick={() => startDrawing("Circle")}
            className={`btn-map p-2 sm:px-3 sm:py-1.5 rounded-full sm:rounded-md ${drawing === "Circle" ? "btn-map-active" : ""}`}
          >
            ⭕ <span className="hidden sm:inline ml-1">Círculo</span>
          </button>
          {drawing && (
            <button
              onClick={cancelDrawing}
              className="btn-map btn-map-danger p-2 sm:px-3 sm:py-1.5 rounded-full sm:rounded-md"
            >
              ❌ <span className="hidden sm:inline ml-1">Cancelar</span>
            </button>
          )}
        </div>
      </div>

      {/* Mapa */}
      <MapContainer
        center={[chileCenter.lat, chileCenter.lng]}
        zoom={5}
        className="w-full h-[60vh] sm:h-[70vh] rounded-xl"
        preferCanvas
        zoomControl={false}
        ref={(m) => { if (m) mapRef.current = m }}
      >
        <ZoomControl position="bottomright" />
        <ScaleControl position="bottomleft" />

        <div className="hidden sm:block">
          <LayersControl position="bottomleft">
            <LayersControl.BaseLayer checked name="OpenStreetMap">
              <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" crossOrigin="anonymous" />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Esri World Imagery">
              <TileLayer attribution="Tiles &copy; Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" crossOrigin="anonymous" />
            </LayersControl.BaseLayer>
          </LayersControl>
        </div>
      </MapContainer>
    </div>
  )
})
