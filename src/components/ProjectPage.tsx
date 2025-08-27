import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { ProjectLayer, LayerStyle } from '../types'
import Uploader from '../components/Uploader'
import LayerList from '../components/LayerList'
import MapView, { MapViewApi } from '../components/MapView'
import LayerStylePanel from '../components/LayerStylePanel'
import WMSLayerPanel from './WMSLayerPanel'

type VisibleState = Record<string, boolean>
type StylesById = Record<string, LayerStyle>

export default function ProjectPage() {
  const { projectId } = useParams()
  const [layers, setLayers] = useState<ProjectLayer[]>([])
  const [visible, setVisible] = useState<VisibleState>({})
  const [styles, setStyles] = useState<StylesById>({})
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  // referencia local al mapa
  const mapApi = useRef<MapViewApi>(null)

  async function loadLayers() {
    if (!projectId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('project_layers')
      .select('id,name,geojson')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      setLayers([])
      setErr(error.message)
      setLoading(false)
      return
    }

    setLayers(data || [])
    const v: VisibleState = {}
    for (const l of data || []) v[l.id] = true
    setVisible(v)
    setLoading(false)
  }

  async function loadStyles(layerIds: string[]) {
    if (layerIds.length === 0) {
      setStyles({})
      return
    }
    const { data, error } = await supabase
      .from('project_layer_styles')
      .select('layer_id, stroke, weight, opacity, fill, fill_opacity, point_radius')
      .in('layer_id', layerIds)

    if (error) {
      console.error(error)
      return
    }

    const map: StylesById = {}
    for (const lId of layerIds) {
      const row = data?.find(d => d.layer_id === lId)
      map[lId] = {
        layer_id: lId,
        color: row?.stroke ?? '#1f2937',
        weight: row?.weight ?? 2,
        opacity: row?.opacity ?? 1,
        fillColor: row?.fill ?? '#1f2937',
        fillOpacity: row?.fill_opacity ?? 0.2,
        radius: row?.point_radius ?? 5,
      }
    }
    setStyles(map)
  }

  useEffect(() => { loadLayers() }, [projectId])
  useEffect(() => { loadStyles(layers.map(l => l.id)) }, [layers])

  // limpiar mensajes después de unos segundos
  useEffect(() => {
    if (msg) {
      const t = setTimeout(() => setMsg(null), 4000)
      return () => clearTimeout(t)
    }
  }, [msg])

  function toggleVisible(id: string) {
    setVisible(prev => ({ ...prev, [id]: !prev[id] }))
  }

  async function deleteLayer(id: string, name?: string) {
    const ok = confirm(`¿Eliminar la capa "${name ?? id}"?`)
    if (!ok) return
    const { error } = await supabase.from('project_layers').delete().eq('id', id)
    if (error) {
      alert(error.message)
      return
    }
    setLayers(prev => prev.filter(l => l.id !== id))
    setVisible(prev => { const c = { ...prev }; delete c[id]; return c })
    setStyles(prev => { const c = { ...prev }; delete c[id]; return c })
  }

  function zoomLayer(geojson: any) {
    mapApi.current?.zoomTo(geojson)
  }

  function onStyleLocalChange(layerId: string, patch: Partial<LayerStyle>, persist?: boolean) {
    setStyles(prev => ({ ...prev, [layerId]: { ...prev[layerId], ...patch } as LayerStyle }))
    if (persist) {
      supabase.from('project_layer_styles').upsert({
        layer_id: layerId,
        stroke: patch.color ?? styles[layerId]?.color ?? '#1f2937',
        weight: patch.weight ?? styles[layerId]?.weight ?? 2,
        opacity: patch.opacity ?? styles[layerId]?.opacity ?? 1,
        fill: patch.fillColor ?? styles[layerId]?.fillColor ?? '#1f2937',
        fill_opacity: patch.fillOpacity ?? styles[layerId]?.fillOpacity ?? 0.2,
        point_radius: patch.radius ?? styles[layerId]?.radius ?? 5,
      }, { onConflict: 'layer_id' }).then(({ error }) => {
        if (error) alert('No se pudo guardar estilo: ' + error.message)
      })
    }
  }

  return (
    <div className="wrap">
      <div
        className="card"
        style={{ width: "min(1400px, 98vw)", display: "flex" }}
      >
        {/* Columna izquierda */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          
          {/* 🔹 Encabezado responsive */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
            <Link
              to="/"
              className="text-blue-400 hover:underline text-sm sm:text-base"
            >
              ← Volver
            </Link>
            <h2 className="title text-lg sm:text-xl">Proyecto</h2>
            <div className="sm:ml-auto w-full sm:w-auto">
              <Uploader
                projectId={projectId!}
                onLayerAdded={() => {
                  setMsg("✅ Capa creada")
                  loadLayers()
                }}
                onError={(msg) => setErr(msg)}
              />
            </div>
          </div>

          {loading && (
            <div className="hint" style={{ color: "#2563eb", marginBottom: 8 }}>
              ⏳ Cargando capas...
            </div>
          )}
          {err && (
            <div className="hint" style={{ color: "#b91c1c", marginBottom: 8 }}>
              {err}
            </div>
          )}
          {msg && (
            <div className="hint" style={{ color: "#065f46", marginBottom: 8 }}>
              {msg}
            </div>
          )}

          <LayerList
            layers={layers}
            visible={visible}
            onToggleVisible={toggleVisible}
            onZoom={(l: ProjectLayer) => zoomLayer(l.geojson)}
            onDelete={(l: ProjectLayer) => deleteLayer(l.id, l.name)}
          />

          <LayerStylePanel
            layers={layers}
            styles={styles}
            onLocalChange={(id, patch) => onStyleLocalChange(id, patch, false)}
          />

          <div style={{ flex: 1, minHeight: "500px" }}>
            <MapView ref={mapApi} layers={layers} visible={visible} styles={styles} />
          </div>
        </div>

        {/* Columna derecha: Panel de WMS */}
        <div className="w-80 bg-[#1e293b] border-l border-gray-700">
          <WMSLayerPanel mapRef={mapApi} />
        </div>
      </div>
    </div>
  )
}
