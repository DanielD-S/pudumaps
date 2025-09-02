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

  const [role, setRole] = useState<"viewer" | "editor">("viewer") // 👈 nuevo estado

  const mapApi = useRef<MapViewApi>(null)
  const [showWms, setShowWms] = useState(false)

  // 🔐 Verificar acceso y rol
  useEffect(() => {
    async function checkAccess() {
      if (!projectId) return
      const { data, error } = await supabase
        .from("projects")
        .select("owner_id, visibility")
        .eq("id", projectId)
        .single()

      if (error) {
        setErr("❌ Proyecto no encontrado")
        return
      }

      // Todos necesitan login
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setErr("🚫 Debes iniciar sesión para ver este proyecto")
        return
      }

      if (user.id === data.owner_id) {
        setRole("editor") // dueño siempre es editor
        return
      }

      // Más adelante: consultar project_members
      setRole("viewer")
    }

    checkAccess()
  }, [projectId])

  async function loadLayers() {
    if (!projectId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('project_layers')
      .select('id,name,geojson')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) {
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

    if (error) return

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

  if (err) {
    return (
      <div className="p-6 text-center text-red-600 font-medium">
        {err}
      </div>
    )
  }

  return (
    <div className="wrap">
      <div
        className="card flex flex-col lg:flex-row"
        style={{ width: "min(1400px, 98vw)" }}
      >
        {/* Columna izquierda */}
        <div className="flex-1 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-3 py-1.5 
             text-sm font-medium text-white 
             bg-gray-700 hover:bg-gray-600 
             rounded-lg shadow transition"
            >
              <span className="text-lg">←</span>
              Volver
            </Link>
            <h2 className="title text-lg sm:text-xl">Proyecto</h2>

            {role === "editor" && (
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
            )}
          </div>

          {loading && <div className="hint text-blue-600 mb-2">⏳ Cargando capas...</div>}
          {err && <div className="hint text-red-700 mb-2">{err}</div>}
          {msg && <div className="hint text-green-700 mb-2">{msg}</div>}

          <LayerList
            layers={layers}
            visible={visible}
            onToggleVisible={(id) => setVisible(prev => ({ ...prev, [id]: !prev[id] }))}
            onZoom={(l: ProjectLayer) => mapApi.current?.zoomTo(l.geojson)}
            onDelete={role === "editor" ? (l: ProjectLayer) => {
              const ok = confirm(`¿Eliminar la capa "${l.name}"?`)
              if (ok) supabase.from("project_layers").delete().eq("id", l.id).then(() => loadLayers())
            } : () => {}} // 👈 dummy function en viewer
          />

          {role === "editor" && (
            <LayerStylePanel
              layers={layers}
              styles={styles}
              onLocalChange={(id, patch) =>
                setStyles(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }))
              }
            />
          )}

          <div style={{ flex: 1, minHeight: "500px" }}>
            <MapView ref={mapApi} layers={layers} visible={visible} styles={styles} />
          </div>
        </div>

        {/* Panel derecho (solo desktop) */}
        <div className="hidden lg:block w-80 bg-[#1e293b] border-l border-gray-700">
          <WMSLayerPanel mapRef={mapApi} />
        </div>
      </div>

      {/* FAB móvil */}
      <button
        onClick={() => setShowWms(true)}
        className="lg:hidden fixed top-4 right-4 z-[1500] w-12 h-12 flex items-center justify-center rounded-full bg-green-600 hover:bg-green-700 text-white shadow-lg transition"
        aria-label="Capas externas"
      >
        🌐
      </button>

      {showWms && (
        <div className="fixed inset-0 z-[2000] flex">
          <div
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setShowWms(false)}
          ></div>
          <aside
            className={`relative w-72 bg-[#1e293b] h-full p-4 shadow-xl z-[2000] overflow-y-auto 
              transform transition-transform duration-300 ease-in-out
              ${showWms ? "translate-x-0" : "translate-x-full"}`}
          >
            <div className="flex justify-between items-center mb-4 text-white">
              <h2 className="font-semibold">Capas externas</h2>
              <button onClick={() => setShowWms(false)} className="text-gray-400 hover:text-gray-200">✕</button>
            </div>
            <WMSLayerPanel mapRef={mapApi} />
          </aside>
        </div>
      )}
    </div>
  )
}
