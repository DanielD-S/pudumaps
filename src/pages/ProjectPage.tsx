import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { ProjectLayer, LayerStyle } from '../types'
import Uploader from '../components/Uploader'
import LayerList from '../components/LayerList'
import MapView, { MapViewApi } from '../components/MapView'
import LayerStylePanel from '../components/LayerStylePanel'

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
      console.error(error); setLayers([]); setErr(error.message); setLoading(false); return
    }
    setLayers(data || [])
    const v: VisibleState = {}
    for (const l of data || []) v[l.id] = true
    setVisible(v)
    setLoading(false)
  }

  async function loadStyles(layerIds: string[]) {
    if (layerIds.length === 0) { setStyles({}); return }
    const { data, error } = await supabase
      .from('project_layer_styles')
      .select('layer_id, stroke, weight, opacity, fill, fill_opacity, point_radius')
      .in('layer_id', layerIds)
    if (error) { console.error(error); return }
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

  function toggleVisible(id: string) { setVisible(prev => ({ ...prev, [id]: !prev[id] })) }
  async function deleteLayer(id: string, name?: string) {
    const ok = confirm(`¿Eliminar la capa "${name ?? id}"?`); if (!ok) return
    const { error } = await supabase.from('project_layers').delete().eq('id', id)
    if (error) { alert(error.message); return }
    setLayers(prev => prev.filter(l => l.id !== id))
    setVisible(prev => { const c = { ...prev }; delete c[id]; return c })
    setStyles(prev => { const c = { ...prev }; delete c[id]; return c })
  }
  function zoomLayer(geojson: any) { mapApi.current?.zoomTo(geojson) }

  // Cambios locales (UI) y persistencia opcional
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
      <div className="card" style={{width:'min(1100px, 98vw)'}}>
        <div style={{display:'flex', gap:8, alignItems:'center', marginBottom:10}}>
          <Link to="/" className="muted" style={{padding:'6px 10px', textDecoration:'none'}}>← Volver</Link>
          <h2 className="title" style={{margin:0}}>Proyecto</h2>
          <div style={{marginLeft:'auto'}}>
            <Uploader projectId={projectId!} onDone={() => { setMsg('Capa creada'); loadLayers(); }} onError={setErr} />
          </div>
        </div>

        {err && <div className="hint" style={{color:'#b91c1c', marginBottom:8}}>{err}</div>}
        {msg && <div className="hint" style={{color:'#065f46', marginBottom:8}}>{msg}</div>}

        {/* Lista de capas */}
        <LayerList
          loading={loading}
          layers={layers}
          visible={visible}
          onToggleVisible={toggleVisible}
          onZoom={l => zoomLayer(l.geojson)}
          onDelete={l => deleteLayer(l.id, l.name)}
        />

        {/* Panel de estilos */}
        <LayerStylePanel
          layers={layers}
          styles={styles}
          onLocalChange={(id, patch) => onStyleLocalChange(id, patch, false)}
        />

        {/* Mapa */}
        <MapView
          ref={mapApi}
          layers={layers}
          visible={visible}
          styles={styles}
        />
      </div>
    </div>
  )
}
