import { forwardRef, useImperativeHandle, useMemo, useRef, useState, useEffect } from "react"
import {
  MapContainer, TileLayer,
  LayersControl, ZoomControl, ScaleControl
} from "react-leaflet"
import L, { LatLng, LatLngBoundsExpression, Map as LeafletMap } from "leaflet"
import type { ProjectLayer, LayerStyle } from "../types"

import JSZip from "jszip"
import tokml from "tokml"
import jsPDF from "jspdf"
import leafletImage from "leaflet-image"

import "@geoman-io/leaflet-geoman-free"
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css"
import "leaflet-geometryutil"

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
      } catch (err) {
        console.error("❌ Error en zoomTo:", err)
      }
    },
    get leafletMap() {
      return mapRef.current
    },
  }))

  // --- Función para calcular medidas
  function getMeasurement(layer: any, shape: string): string {
    if (shape === "Polygon") {
      const area = L.GeometryUtil.geodesicArea(layer.getLatLngs()[0])
      const perimetro = L.GeometryUtil.length(layer.getLatLngs()[0])
      const ha = area / 10000
      return `📐 Polígono → Área: ${ha.toFixed(2)} ha | Perímetro: ${(perimetro / 1000).toFixed(2)} km`
    }

    if (shape === "Line") {
      const latlngs = layer.getLatLngs()
      const length = L.GeometryUtil.length(latlngs)
      return `📏 Línea → ${length < 1000 ? length.toFixed(1) + " m" : (length / 1000).toFixed(2)} km`
    }

    if (shape === "Circle") {
      const radius = layer.getRadius()
      const area = Math.PI * radius * radius
      const ha = area / 10000
      return `⭕ Círculo → Radio: ${radius.toFixed(1)} m | Área: ${ha.toFixed(2)} ha`
    }

    return ""
  }

  // --- Inicializar Geoman
  useEffect(() => {
    if (!mapRef.current) return
    const map = mapRef.current

    if (map.pm) {
      map.pm.addControls({
        position: "topleft",
        drawCircle: true,
        drawMarker: false,
        drawText: false,
        editMode: false,
        dragMode: false,
        cutPolygon: false,
      })

      map.on("pm:create", (e: any) => {
        const shape = e.shape === "Line" || e.shape === "Polyline" ? "Line" : e.shape
        const msg = getMeasurement(e.layer, shape)

        if (msg) {
          e.layer.bindPopup(msg).openPopup()
          setToast({ msg, type: "info" })
        }

        setDrawing(null)
      })
    }
  }, [])

  // --- Activar herramienta de dibujo
  function startDrawing(shape: "Line" | "Polygon" | "Circle") {
    if (!mapRef.current) return
    const map = mapRef.current
    map.pm.disableDraw()
    map.pm.enableDraw(shape, { snappable: true })
    setDrawing(shape)
    setToast({ msg: `✏️ Dibujo de ${shape} iniciado`, type: "info" })
  }

  // --- Cancelar dibujo y limpiar
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

  // --- Exportar KMZ
  async function exportKMZ() {
    try {
      const zip = new JSZip()
      const kml = tokml({
        type: "FeatureCollection",
        features: layers.map((l) => l.geojson).flat(),
      })
      zip.file("doc.kml", kml)
      const blob = await zip.generateAsync({ type: "blob" })
      triggerDownload(blob, "mapa.kmz")
      setToast({ msg: "✅ Exportado a KMZ", type: "success" })
    } catch (err) {
      setToast({ msg: "❌ Error exportando KMZ", type: "error" })
    }
  }

  // --- Exportar PDF
  function exportPDF() {
    if (!mapRef.current) return
    leafletImage(mapRef.current, (err: any, canvas: HTMLCanvasElement) => {
      if (err) {
        setToast({ msg: "❌ Error al generar PDF", type: "error" })
        return
      }
      const pdf = new jsPDF("landscape", "pt", "a4")
      const imgData = canvas.toDataURL("image/png")
      pdf.addImage(imgData, "PNG", 20, 20, 800, 500)
      pdf.save("mapa.pdf")
      setToast({ msg: "✅ Exportado a PDF", type: "success" })
    })
  }

  // --- Helpers
  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="relative w-full rounded-xl border shadow-lg overflow-hidden">
      {/* Toast flotante */}
      {toast && (
        <div className="fixed top-4 right-4 z-[2000]">
          <Toast message={toast.msg} type={toast.type} duration={3000} onClose={() => setToast(null)} />
        </div>
      )}

      {/* Toolbar flotante */}
      <div className="absolute top-2 left-2 z-[1000] flex flex-wrap gap-2 p-2 
                      bg-black/70 backdrop-blur rounded-lg shadow-md max-w-[95vw] overflow-x-auto">
        <button onClick={fitChile} className="btn-map">↺ Chile</button>
        <button onClick={goToMyLocation} className="btn-map">📍</button>
        <button onClick={toggleFullscreen} className="btn-map">⛶</button>

        {/* Botones de dibujo */}
        <button onClick={() => startDrawing("Polygon")} className={`btn-map ${drawing === "Polygon" ? "btn-map-active" : ""}`}>📐 Polígono</button>
        <button onClick={() => startDrawing("Line")} className={`btn-map ${drawing === "Line" ? "btn-map-active" : ""}`}>📏 Línea</button>
        <button onClick={() => startDrawing("Circle")} className={`btn-map ${drawing === "Circle" ? "btn-map-active" : ""}`}>⭕ Círculo</button>
        {drawing && <button onClick={cancelDrawing} className="btn-map btn-map-danger">❌ Cancelar</button>}

        {/* Exportación */}
        <button onClick={exportKMZ} className="btn-map btn-map-kmz">🌍 KMZ</button>
        <button onClick={exportPDF} className="btn-map btn-map-pdf">📄 PDF</button>
      </div>

      {/* Mapa */}
      <MapContainer
        center={[chileCenter.lat, chileCenter.lng]}
        zoom={5}
        className="w-full h-[70vh] rounded-xl"
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
