import { forwardRef, useImperativeHandle, useMemo, useRef, useState, useEffect } from "react"
import {
  MapContainer, TileLayer, GeoJSON as GeoJSONLayer,
  LayersControl, ZoomControl, ScaleControl, useMapEvents
} from "react-leaflet"
import L, { LatLng, LatLngBoundsExpression, Map as LeafletMap } from "leaflet"
import type { ProjectLayer, LayerStyle } from "../types"
import JSZip from "jszip"
import tokml from "tokml"
import jsPDF from "jspdf"
import leafletImage from "leaflet-image"

// 👉 geoman para dibujo
import "@geoman-io/leaflet-geoman-free"
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css"

// 👉 geometryutil para cálculos
import "leaflet-geometryutil"

// 👉 Toast elegante
import Toast from "./Toast"

export type MapViewApi = {
  zoomTo: (gj: any) => void
  readonly leafletMap: LeafletMap | null
  readonly wmsLayers: L.Layer[]
}

export default forwardRef<MapViewApi, {
  layers: ProjectLayer[]
  visible: Record<string, boolean>
  styles: Record<string, LayerStyle>
}>(function MapView({ layers, visible, styles }, ref) {
  const mapRef = useRef<LeafletMap | null>(null)
  const [wmsLayers, setWmsLayers] = useState<L.Layer[]>([])
  const [drawing, setDrawing] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type?: "success" | "error" | "info" } | null>(null)

  // 👉 Estado para mapa base
  const [activeBase, setActiveBase] = useState<"osm" | "esri">("osm")

  const chileCenter = useMemo(() => ({ lat: -33.45, lng: -70.65 }), [])

  // 👉 Exponer API
  useImperativeHandle(ref, () => ({
    zoomTo(gj: any) {
      if (!mapRef.current) return
      try {
        const f = L.geoJSON(gj)
        const b = f.getBounds()
        if (b.isValid())
          mapRef.current.fitBounds(b as LatLngBoundsExpression, { padding: [20, 20] })
      } catch {}
    },
    get leafletMap() {
      return mapRef.current
    },
    get wmsLayers() {
      return wmsLayers
    },
  }))

  // --- Función para calcular medidas con estilo bonito
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
      return `📏 Línea → ${length < 1000 ? length.toFixed(1) + " m" : (length / 1000).toFixed(2) + " km"}`
    }

    if (shape === "Circle") {
      const radius = e.layer.getRadius()
      const area = Math.PI * radius * radius
      const ha = area / 10000
      return `⭕ Círculo → Radio: ${radius.toFixed(1)} m | Área: ${ha.toFixed(2)} ha`
    }

    return ""
  }

  // --- Inicializar geoman y eventos de medición
  useEffect(() => {
    if (!mapRef.current) return
    const map = mapRef.current

    // Asegurar que Geoman tiene controles
    map.pm.addControls({
      position: "topleft",
      drawCircle: true,
      drawMarker: false,
      drawText: false,
    })

    map.on("pm:create", (e: any) => {
      console.log("✅ Evento pm:create recibido")
      console.log("Shape detectado:", e.shape || e.layer?.pm?._shape)

      const msg = getMeasurement(e)

      if (msg) {
        console.log("Popup generado:", msg)
        e.layer.bindPopup(msg).openPopup()
      } else {
        console.warn("⚠️ No se pudo calcular medición para:", e)
      }
      setDrawing(null)
    })
  }, [])

  // --- Activar herramienta de dibujo
  function startDrawing(shape: string) {
    if (!mapRef.current) return
    mapRef.current.pm.enableDraw(shape)
    setDrawing(shape)
  }

  // --- Cancelar dibujo y borrar geometrías
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
  async function exportVisibleAsKMZ() {
    try {
      const active = layers.filter((l) => visible[l.id])
      if (active.length === 0) {
        setToast({ msg: "❌ No hay capas visibles para exportar", type: "error" })
        return
      }

      const folderKmls = active
        .map((l) => {
          const fc =
            l.geojson.type === "FeatureCollection"
              ? l.geojson
              : { type: "FeatureCollection", features: [l.geojson] }
          const kmlBody = tokml(fc)
          const inner = kmlBody.replace(/^.*?<Document>/s, "").replace(/<\/Document>.*$/s, "")
          return `<Folder><name>${escapeXml(l.name || "Capa")}</name>${inner}</Folder>`
        })
        .join("\n")

      const fullKml =
        `<?xml version="1.0" encoding="UTF-8"?>` +
        `<kml xmlns="http://www.opengis.net/kml/2.2">` +
        `<Document><name>Pudumaps export</name>${folderKmls}</Document></kml>`

      const zip = new JSZip()
      zip.file("doc.kml", fullKml)
      const blob = await zip.generateAsync({ type: "blob" })
      triggerDownload(blob, `pudumaps_${Date.now()}.kmz`)
      setToast({ msg: "✅ Exportado a KMZ", type: "success" })
    } catch (e: any) {
      console.error(e)
      setToast({ msg: "❌ No se pudo exportar KMZ", type: "error" })
    }
  }

  // --- Exportar PDF
  async function exportAsPDF() {
    try {
      if (!mapRef.current) {
        setToast({ msg: "❌ No se encontró el mapa", type: "error" })
        return
      }

      leafletImage(mapRef.current, (err: any, canvas: HTMLCanvasElement) => {
        if (err) {
          console.error(err)
          setToast({ msg: "❌ No se pudo exportar PDF", type: "error" })
          return
        }

        const imgData = canvas.toDataURL("image/png")
        const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" })
        const pageW = pdf.internal.pageSize.getWidth()
        const imgH = (canvas.height / canvas.width) * pageW

        pdf.addImage(imgData, "PNG", 0, 0, pageW, imgH)
        pdf.save(`pudumaps_${Date.now()}.pdf`)
        setToast({ msg: "✅ Exportado a PDF", type: "success" })
      })
    } catch (e: any) {
      console.error(e)
      setToast({ msg: "❌ No se pudo exportar PDF", type: "error" })
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
        <button onClick={fitChile} className="btn-map">↺ Chile</button>
        <button onClick={goToMyLocation} className="btn-map">📍</button>
        <button onClick={toggleFullscreen} className="btn-map">{isFullscreen ? "⛶" : "⛶"}</button>

        {/* Desktop: herramientas */}
        <div className="hidden sm:flex gap-2">
          <button onClick={() => startDrawing("Polygon")} className={`btn-map ${drawing === "Polygon" ? "btn-map-active" : ""}`}>✏️ Polígono</button>
          <button onClick={() => startDrawing("Line")} className={`btn-map ${drawing === "Line" ? "btn-map-active" : ""}`}>📏 Línea</button>
          <button onClick={() => startDrawing("Circle")} className={`btn-map ${drawing === "Circle" ? "btn-map-active" : ""}`}>⭕ Círculo</button>
          {drawing && <button onClick={cancelDrawing} className="btn-map btn-map-danger">❌ Cancelar</button>}
        </div>

        {/* Exportaciones */}
        <div className="hidden sm:flex gap-2">
          <button onClick={exportVisibleAsKMZ} className="btn-map btn-map-export btn-map-kmz">⬇️ KMZ</button>
          <button onClick={exportAsPDF} className="btn-map btn-map-export btn-map-pdf">🖨️ PDF</button>
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
            <LayersControl.BaseLayer checked={activeBase === "osm"} name="OpenStreetMap">
              <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" crossOrigin="anonymous" />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer checked={activeBase === "esri"} name="Esri World Imagery">
              <TileLayer attribution="Tiles &copy; Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" crossOrigin="anonymous" />
            </LayersControl.BaseLayer>
          </LayersControl>
        </div>

        {activeBase === "osm" && (
          <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" crossOrigin="anonymous" />
        )}
        {activeBase === "esri" && (
          <TileLayer attribution="Tiles &copy; Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" crossOrigin="anonymous" />
        )}

        {/* Capas GeoJSON */}
        {layers.filter((l) => visible[l.id]).map((l) => {
          const st = styles[l.id]
          return (
            <GeoJSONLayer
              key={l.id}
              data={l.geojson as any}
              style={() => ({
                color: st?.color ?? "#374151",
                weight: st?.weight ?? 2,
                opacity: st?.opacity ?? 1,
                fillColor: st?.fillColor ?? "#1f2937",
                fillOpacity: st?.fillOpacity ?? 0.2,
              })}
              pointToLayer={(_f, latlng) => L.circleMarker(latlng, { radius: st?.radius ?? 5 })}
            />
          )
        })}

        <WMSClickInfo layers={wmsLayers} />
      </MapContainer>
    </div>
  )

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }
  function escapeXml(s: string) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;")
  }
})

// --- Popup GetFeatureInfo ---
function WMSClickInfo({ layers }: { layers: L.Layer[] }) {
  const map = useMapEvents({
    click(e) {
      layers.forEach((layer: any) => {
        if (!layer.wmsParams) return
        const url =
          `${layer._url}?` +
          `service=WMS&request=GetFeatureInfo&` +
          `layers=${layer.wmsParams.layers}&query_layers=${layer.wmsParams.layers}&` +
          `info_format=application/json&feature_count=5&` +
          `crs=EPSG:4326&` +
          `x=${Math.floor(map.latLngToContainerPoint(e.latlng).x)}&` +
          `y=${Math.floor(map.latLngToContainerPoint(e.latlng).y)}&` +
          `height=${map.getSize().y}&width=${map.getSize().x}&` +
          `bbox=${map.getBounds().toBBoxString()}`

        fetch(url)
          .then((r) => r.json())
          .then((data) => {
            if (data.features && data.features.length > 0) {
              const props = data.features[0].properties
              let html = `<div><b>Info WMS</b></div><table style="font-size:12px">`
              for (const [k, v] of Object.entries(props)) {
                html += `<tr><td><b>${k}</b></td><td>${v}</td></tr>`
              }
              html += `</table>`
              L.popup().setLatLng(e.latlng).setContent(html).openOn(map)
            }
          })
          .catch(() => {})
      })
    },
  })
  return null
}
