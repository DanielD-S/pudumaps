import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import {
  MapContainer, TileLayer, GeoJSON as GeoJSONLayer,
  LayersControl, ZoomControl, ScaleControl, Polyline, useMapEvents
} from 'react-leaflet'
import L, { LatLng, LatLngBoundsExpression, Map as LeafletMap } from 'leaflet'
import type { ProjectLayer, LayerStyle } from '../types'
import JSZip from 'jszip'
import tokml from 'tokml'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import "../css/MapView.css"

export type MapViewApi = { zoomTo: (gj: any) => void }

export default forwardRef<MapViewApi, {
  layers: ProjectLayer[]
  visible: Record<string, boolean>
  styles: Record<string, LayerStyle>
}>(function MapView({ layers, visible, styles }, ref) {
  const mapRef = useRef<LeafletMap | null>(null)
  const mapBoxRef = useRef<HTMLDivElement | null>(null)

  const chileCenter = useMemo(() => ({ lat: -33.45, lng: -70.65 }), [])

  useImperativeHandle(ref, () => ({
    zoomTo(gj: any) {
      if (!mapRef.current) return
      try {
        const f = L.geoJSON(gj)
        const b = f.getBounds()
        if (b.isValid()) mapRef.current.fitBounds(b as LatLngBoundsExpression, { padding: [20, 20] })
      } catch { }
    }
  }), [])

  // --- Controles extra
  function fitChile() {
    if (!mapRef.current) return
    const bounds: LatLngBoundsExpression = [[-56, -76], [-17.5, -66]]
    mapRef.current.fitBounds(bounds, { padding: [20, 20] })
  }

  async function goToMyLocation() {
    if (!mapRef.current) return
    if (!('geolocation' in navigator)) { alert('Geolocalización no disponible.'); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latlng = new LatLng(pos.coords.latitude, pos.coords.longitude)
        mapRef.current!.setView(latlng, 13)
        L.circleMarker(latlng, { radius: 6 }).addTo(mapRef.current!)
      },
      (err) => alert('No se pudo obtener tu ubicación: ' + err.message),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const [isFullscreen, setIsFullscreen] = useState(false)
  function toggleFullscreen() {
    const el = mapBoxRef.current
    if (!el) return
    if (!document.fullscreenElement) {
      el.requestFullscreen?.()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen?.()
      setIsFullscreen(false)
    }
  }

  // --- Herramientas
  const [measureOn, setMeasureOn] = useState(false)
  const [drawMode, setDrawMode] = useState<'none' | 'line' | 'polygon'>('none')

  // --- Exportar KMZ (capas visibles) y PDF
  async function exportVisibleAsKMZ() {
    try {
      const active = layers.filter(l => visible[l.id])
      if (active.length === 0) { alert('No hay capas visibles para exportar.'); return }

      const folderKmls = active.map(l => {
        const fc = (l.geojson.type === 'FeatureCollection')
          ? l.geojson
          : { type: 'FeatureCollection', features: [l.geojson] }
        const kmlBody = tokml(fc)
        const inner = kmlBody.replace(/^.*?<Document>/s, '').replace(/<\/Document>.*$/s, '')
        return `<Folder><name>${escapeXml(l.name || 'Capa')}</name>${inner}</Folder>`
      }).join('\n')

      const fullKml =
        `<?xml version="1.0" encoding="UTF-8"?>` +
        `<kml xmlns="http://www.opengis.net/kml/2.2">` +
        `<Document><name>Pudumaps export</name>${folderKmls}</Document></kml>`

      const zip = new JSZip()
      zip.file('doc.kml', fullKml)
      const blob = await zip.generateAsync({ type: 'blob' })
      triggerDownload(blob, `pudumaps_${Date.now()}.kmz`)
    } catch (e: any) {
      console.error(e); alert('No se pudo exportar KMZ: ' + (e?.message || e))
    }
  }

  async function exportAsPDF() {
    try {
      if (!mapBoxRef.current) { alert('No se encontró el contenedor del mapa.'); return }
      const canvas = await html2canvas(mapBoxRef.current, { useCORS: true, backgroundColor: '#ffffff', scale: 2 })
      const imgData = canvas.toDataURL('image/png')

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const margin = 24
      const imgW = pageW - margin * 2
      const imgH = imgW * (canvas.height / canvas.width)
      const yStart = 60

      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(16)
      pdf.text('Pudumaps — Export', margin, 32)
      pdf.addImage(imgData, 'PNG', margin, yStart, imgW, Math.min(imgH, pageH - yStart - 100))

      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(11)
      const vis = layers.filter(l => visible[l.id]).map(l => `• ${l.name}`).join('\n') || '— (sin capas visibles)'
      pdf.text('Capas visibles:', margin, pageH - 70)
      const textLines = pdf.splitTextToSize(vis, pageW - margin * 2)
      pdf.text(textLines, margin, pageH - 52)

      pdf.save(`pudumaps_${Date.now()}.pdf`)
    } catch (e: any) {
      console.error(e); alert('No se pudo exportar PDF: ' + (e?.message || e))
    }
  }

  return (
    <div className="map-wrapper" ref={mapBoxRef}>
      {/* Barra de herramientas */}
      <div className="map-toolbar">
        <button onClick={fitChile}>↺ Chile</button>
        <button onClick={goToMyLocation}>📍 Mi ubicación</button>
        <button onClick={toggleFullscreen}>
          {isFullscreen ? '⛶ Salir pantalla completa' : '⛶ Pantalla completa'}
        </button>
        <button
          onClick={() => setMeasureOn(v => !v)}
          className={measureOn ? "active" : ""}
        >
          📏 Medir
        </button>
        <button
          onClick={() => setDrawMode(m => m === 'line' ? 'none' : 'line')}
          className={drawMode === 'line' ? "active" : ""}
        >
          ✏️ Línea
        </button>
        <button
          onClick={() => setDrawMode(m => m === 'polygon' ? 'none' : 'polygon')}
          className={drawMode === 'polygon' ? "active" : ""}
        >
          ▰ Polígono
        </button>
        <button onClick={() => setDrawMode('none')}>❌ Limpiar dibujo</button>
        <button onClick={exportVisibleAsKMZ}>⬇️ Exportar KMZ</button>
        <button onClick={exportAsPDF}>🖨️ Exportar PDF</button>
      </div>

      {/* Panel estilos de capas */}
      <div className="map-layers-panel">
        <h4>🎨 Estilos de capas</h4>
        {/* Aquí va tu dropdown o componente de estilos */}
      </div>

      {/* Mapa */}
      <MapContainer
        center={[chileCenter.lat, chileCenter.lng]}
        zoom={5}
        style={{ height: '60vh', width: '100%' }}
        preferCanvas
        zoomControl={false}
        ref={(m) => { if (m) mapRef.current = m }}
      >
        <ZoomControl position="topright" />
        <ScaleControl position="bottomleft" />

        {/* Bases */}
        <LayersControl position="topleft">
          <LayersControl.BaseLayer checked name="OpenStreetMap">
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              crossOrigin="anonymous"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Esri World Imagery">
            <TileLayer
              attribution='Tiles &copy; Esri'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              crossOrigin="anonymous"
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        {/* Capas visibles */}
        {layers.filter(l => visible[l.id]).map(l => {
          const st = styles[l.id]
          const color = st?.color ?? '#1f2937'
          const weight = st?.weight ?? 2
          const opacity = st?.opacity ?? 1
          const fillColor = st?.fillColor ?? '#1f2937'
          const fillOpacity = st?.fillOpacity ?? 0.2
          const radius = st?.radius ?? 5
          const styleSig = `${color}|${weight}|${opacity}|${fillColor}|${fillOpacity}|${radius}`

          return (
            <GeoJSONLayer
              key={`${l.id}-${styleSig}`}
              data={l.geojson as any}
              style={() => ({
                color,
                weight,
                opacity,
                fillColor,
                fillOpacity,
              })}
              pointToLayer={(_f, latlng) => L.circleMarker(latlng, { radius: radius })}
              onEachFeature={(feature, layer) => {
                const props = feature.properties || {}
                let html = `<div><strong>${l.name}</strong></div><table style="font-size:12px">`
                for (const [k, v] of Object.entries(props)) {
                  html += `<tr><td><b>${k}</b></td><td>${v}</td></tr>`
                }
                html += `</table>`
                layer.bindPopup(html)
              }}
            />
          )
        })}

        {/* Herramientas */}
        <MeasureLayer enabled={measureOn} />
        <SketchLayer mode={drawMode} />
      </MapContainer>
    </div>
  )
})

// ---------- herramientas internas ----------
function MeasureLayer({ enabled }: { enabled: boolean }) {
  const [pts, setPts] = useState<LatLng[]>([])
  const [total, setTotal] = useState(0)
  const [lastSeg, setLastSeg] = useState(0)

  useMapEvents({
    click(e) { if (enabled) setPts(prev => [...prev, e.latlng]) },
    dblclick() { if (enabled) { setPts([]); setTotal(0); setLastSeg(0) } }
  })

  useEffect(() => {
    if (pts.length < 2) { setTotal(0); setLastSeg(0); return }
    let d = 0; for (let i = 1; i < pts.length; i++) d += pts[i - 1].distanceTo(pts[i])
    setTotal(d); setLastSeg(pts[pts.length - 2].distanceTo(pts[pts.length - 1]))
  }, [pts])

  if (!enabled) return null
  return <Polyline positions={pts} />
}

function SketchLayer({ mode }: { mode: 'none' | 'line' | 'polygon' }) {
  const [vertices, setVertices] = useState<LatLng[]>([])
  useMapEvents({
    click(e) { if (mode !== 'none') setVertices(v => [...v, e.latlng]) },
    dblclick() { if (mode !== 'none') setVertices([]) }
  })
  if (mode === 'none') return null
  const poly = vertices.map(v => [v.lat, v.lng]) as any
  return <Polyline positions={poly} />
}

// utils
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}
function escapeXml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}
