import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react'
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

export type MapViewApi = { 
  zoomTo: (gj: any) => void
  readonly leafletMap: LeafletMap | null   // getter dinámico
}

export default forwardRef<MapViewApi, {
  layers: ProjectLayer[]
  visible: Record<string, boolean>
  styles: Record<string, LayerStyle>
}>(function MapView({ layers, visible, styles }, ref) {
  const mapRef = useRef<LeafletMap | null>(null)
  const mapBoxRef = useRef<HTMLDivElement | null>(null)

  const chileCenter = useMemo(() => ({ lat: -33.45, lng: -70.65 }), [])

  // Exponer API al padre
  useImperativeHandle(ref, () => ({
    zoomTo(gj: any) {
      if (!mapRef.current) return
      try {
        const f = L.geoJSON(gj)
        const b = f.getBounds()
        if (b.isValid()) mapRef.current.fitBounds(b as LatLngBoundsExpression, { padding: [20, 20] })
      } catch {}
    },
    get leafletMap() {   // 👈 getter dinámico (siempre actualizado)
      return mapRef.current
    }
  }))

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

  // --- Exportar ---
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
    <div ref={mapBoxRef} className="relative w-full rounded-xl border shadow-lg overflow-hidden">
      {/* Toolbar flotante */}
      <div className="absolute top-2 left-2 z-[1000] flex flex-wrap gap-2 p-2 bg-white/90 backdrop-blur rounded-lg shadow-md">
        <button onClick={fitChile} className="px-3 py-1 rounded-lg bg-white border text-gray-700 text-sm hover:bg-gray-100">↺ Chile</button>
        <button onClick={goToMyLocation} className="px-3 py-1 rounded-lg bg-white border text-gray-700 text-sm hover:bg-gray-100">📍 Mi ubicación</button>
        <button onClick={toggleFullscreen} className="px-3 py-1 rounded-lg bg-white border text-gray-700 text-sm hover:bg-gray-100">
          {isFullscreen ? '⛶ Salir' : '⛶ Pantalla completa'}
        </button>
        <button
          onClick={() => setMeasureOn(v => !v)}
          className={`px-3 py-1 rounded-lg border text-sm ${measureOn ? 'bg-green-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
        >
          📏 Medir
        </button>
        <button
          onClick={() => setDrawMode(m => m === 'line' ? 'none' : 'line')}
          className={`px-3 py-1 rounded-lg border text-sm ${drawMode === 'line' ? 'bg-green-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
        >
          ✏️ Línea
        </button>
        <button
          onClick={() => setDrawMode(m => m === 'polygon' ? 'none' : 'polygon')}
          className={`px-3 py-1 rounded-lg border text-sm ${drawMode === 'polygon' ? 'bg-green-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
        >
          ▰ Polígono
        </button>
        <button onClick={() => setDrawMode('none')} className="px-3 py-1 rounded-lg bg-red-500 text-white text-sm hover:bg-red-600">❌ Limpiar</button>
        <button onClick={exportVisibleAsKMZ} className="px-3 py-1 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700">⬇️ KMZ</button>
        <button onClick={exportAsPDF} className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700">🖨️ PDF</button>
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
        <ZoomControl position="topright" />
        <ScaleControl position="bottomleft" />

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

        {/* Capas GeoJSON */}
        {layers.filter(l => visible[l.id]).map(l => {
          const st = styles[l.id]
          return (
            <GeoJSONLayer
              key={l.id}
              data={l.geojson as any}
              style={() => ({
                color: st?.color ?? '#1f2937',
                weight: st?.weight ?? 2,
                opacity: st?.opacity ?? 1,
                fillColor: st?.fillColor ?? '#1f2937',
                fillOpacity: st?.fillOpacity ?? 0.2,
              })}
              pointToLayer={(_f, latlng) => L.circleMarker(latlng, { radius: st?.radius ?? 5 })}
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

        <MeasureLayer enabled={measureOn} />
        <SketchLayer mode={drawMode} />
      </MapContainer>
    </div>
  )
})

// ---- Herramientas internas ----
function MeasureLayer({ enabled }: { enabled: boolean }): JSX.Element | null {
  const [pts, setPts] = useState<LatLng[]>([])
  useMapEvents({
    click(e) { if (enabled) setPts(prev => [...prev, e.latlng]) },
    dblclick() { if (enabled) setPts([]) }
  })
  if (!enabled) return null
  return <Polyline positions={pts} />
}

function SketchLayer({ mode }: { mode: 'none' | 'line' | 'polygon' }): JSX.Element | null {
  const [vertices, setVertices] = useState<LatLng[]>([])
  useMapEvents({
    click(e) { if (mode !== 'none') setVertices(v => [...v, e.latlng]) },
    dblclick() { if (mode !== 'none') setVertices([]) }
  })
  if (mode === 'none') return null
  return <Polyline positions={vertices} />
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
