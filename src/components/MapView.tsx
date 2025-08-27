import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react'
import {
  MapContainer, TileLayer, WMSTileLayer, GeoJSON as GeoJSONLayer,
  LayersControl, ZoomControl, ScaleControl, useMapEvents
} from 'react-leaflet'
import L, { LatLng, LatLngBoundsExpression, Map as LeafletMap } from 'leaflet'
import type { ProjectLayer, LayerStyle } from '../types'
import JSZip from 'jszip'
import tokml from 'tokml'
import jsPDF from 'jspdf'
import leafletImage from 'leaflet-image'   // 👈 con types definidos en src/types

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

  const chileCenter = useMemo(() => ({ lat: -33.45, lng: -70.65 }), [])

  // Exponer API
  useImperativeHandle(ref, () => ({
    zoomTo(gj: any) {
      if (!mapRef.current) return
      try {
        const f = L.geoJSON(gj)
        const b = f.getBounds()
        if (b.isValid()) mapRef.current.fitBounds(b as LatLngBoundsExpression, { padding: [20, 20] })
      } catch {}
    },
    get leafletMap() {
      return mapRef.current
    },
    get wmsLayers() {
      return wmsLayers
    }
  }))

  // --- Herramientas básicas
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
    const el = mapRef.current?.getContainer() // 👈 en vez de _container
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

  // --- Exportar PDF usando leaflet-image
  async function exportAsPDF() {
    try {
      if (!mapRef.current) { 
        alert("No se encontró el mapa."); 
        return 
      }

      leafletImage(mapRef.current, (err: any, canvas: HTMLCanvasElement) => {
        if (err) {
          console.error(err)
          alert("No se pudo exportar el mapa a PDF")
          return
        }

        const imgData = canvas.toDataURL("image/png")
        const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" })
        const pageW = pdf.internal.pageSize.getWidth()
        const pageH = pdf.internal.pageSize.getHeight()

        const imgW = pageW
        const imgH = (canvas.height / canvas.width) * pageW

        pdf.addImage(imgData, "PNG", 0, 0, imgW, imgH)
        pdf.save(`pudumaps_${Date.now()}.pdf`)
      })
    } catch (e: any) {
      console.error(e)
      alert("No se pudo exportar PDF: " + (e?.message || e))
    }
  }

  return (
    <div className="relative w-full rounded-xl border shadow-lg overflow-hidden">
      {/* Toolbar flotante responsive */}
      <div className="absolute top-2 left-2 z-[1000] flex flex-wrap gap-1 sm:gap-2 justify-center p-2 bg-white/90 backdrop-blur rounded-lg shadow-md max-w-[90vw]">
        <button onClick={fitChile} className="btn-map">↺ Chile</button>
        <button onClick={goToMyLocation} className="btn-map">📍 Mi ubicación</button>
        <button onClick={toggleFullscreen} className="btn-map">
          {isFullscreen ? '⛶ Salir' : '⛶ Pantalla completa'}
        </button>
        <button onClick={exportVisibleAsKMZ} className="btn-map bg-[#2563eb] hover:bg-[#1e40af] text-white">⬇️ KMZ</button>
        <button onClick={exportAsPDF} className="btn-map bg-[#4f46e5] hover:bg-[#3730a3] text-white">🖨️ PDF</button>
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

          {/* WMS precargado */}
          <LayersControl.Overlay checked={false} name="Propiedad Minera (Sernageomin)">
            <WMSTileLayer
              url="https://catastromineronline.sernageomin.cl/arcgismin/services/MINERIA/WMS_PROPIEDAD_MINERA_19S/MapServer/WMSServer"
              params={{ layers: "0,1,2,3", format: "image/png", transparent: true, version: "1.3.0" }}
              crossOrigin="anonymous"
              eventHandlers={{
                add: (e) => setWmsLayers(prev => [...prev, e.target]),
                remove: (e) => setWmsLayers(prev => prev.filter(l => l !== e.target))
              }}
            />
          </LayersControl.Overlay>
        </LayersControl>

        {/* Capas GeoJSON */}
        {layers.filter(l => visible[l.id]).map(l => {
          const st = styles[l.id]
          return (
            <GeoJSONLayer
              key={l.id}
              data={l.geojson as any}
              style={() => ({
                color: st?.color ?? '#374151',
                weight: st?.weight ?? 2,
                opacity: st?.opacity ?? 1,
                fillColor: st?.fillColor ?? '#1f2937',
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
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }
  function escapeXml(s: string) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
  }
})

// --- Popup GetFeatureInfo ---
function WMSClickInfo({ layers }: { layers: L.Layer[] }) {
  const map = useMapEvents({
    click(e) {
      layers.forEach((layer: any) => {
        if (!layer.wmsParams) return
        const url = `${layer._url}?` +
          `service=WMS&request=GetFeatureInfo&` +
          `layers=${layer.wmsParams.layers}&query_layers=${layer.wmsParams.layers}&` +
          `info_format=application/json&feature_count=5&` +
          `crs=EPSG:4326&` +
          `x=${Math.floor(map.latLngToContainerPoint(e.latlng).x)}&` +
          `y=${Math.floor(map.latLngToContainerPoint(e.latlng).y)}&` +
          `height=${map.getSize().y}&width=${map.getSize().x}&` +
          `bbox=${map.getBounds().toBBoxString()}`

        fetch(url)
          .then(r => r.json())
          .then(data => {
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
          .catch(() => { /* si falla, no muestra nada */ })
      })
    }
  })
  return null
}
