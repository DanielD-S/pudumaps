import { useEffect, useRef, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { supabase } from "../lib/supabase"
import type { ProjectLayer, LayerStyle } from "../types"
import Uploader from "../components/Uploader"
import LayerList from "../components/LayerList"
import MapView, { MapViewApi } from "../components/MapView"
import LayerStylePanel from "../components/LayerStylePanel"
import WMSLayerPanel from "./WMSLayerPanel"

type VisibleState = Record<string, boolean>
type StylesById = Record<string, LayerStyle>

interface ProjectMember {
  id: string
  user_id: string
  role: "viewer" | "editor"
  user_email?: string
}

export default function ProjectPage() {
  const { projectId } = useParams()
  const [layers, setLayers] = useState<ProjectLayer[]>([])
  const [visible, setVisible] = useState<VisibleState>({})
  const [styles, setStyles] = useState<StylesById>({})
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const [role, setRole] = useState<"viewer" | "editor">("viewer")
  const [members, setMembers] = useState<ProjectMember[]>([])

  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"viewer" | "editor">("viewer")
  const [inviteLoading, setInviteLoading] = useState(false)

  const mapApi = useRef<MapViewApi>(null)
  const [showWms, setShowWms] = useState(false)

  // 🔐 Verificar acceso y rol
  useEffect(() => {
    async function checkAccess() {
      if (!projectId) return

      const { data: project, error } = await supabase
        .from("projects")
        .select("id, owner_id, visibility")
        .eq("id", projectId)
        .single()

      if (error || !project) {
        setErr("❌ Proyecto no encontrado")
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setErr("🚫 Debes iniciar sesión para ver este proyecto")
        return
      }

      if (user.id === project.owner_id) {
        setRole("editor")
        loadMembers()
        return
      }

      // 👇 si es público, lo dejamos pasar como viewer
      if (project.visibility === "public") {
        setRole("viewer")
        return
      }

      const { data: member, error: memberError } = await supabase
        .from("project_members")
        .select("id, role")
        .eq("project_id", projectId)
        .eq("user_id", user.id)
        .single()

      if (memberError || !member) {
        setErr("🚫 No tienes acceso a este proyecto")
        return
      }

      setRole(member.role as "viewer" | "editor")
    }

    checkAccess()
  }, [projectId])

  // 🔄 Cargar miembros
  async function loadMembers() {
    if (!projectId) return
    const { data, error } = await supabase
      .from("project_members_with_email") // 👈 usamos la vista
      .select("id, user_id, role, user_email")
      .eq("project_id", projectId)

    if (error) {
      console.error(error)
      return
    }

    setMembers(data || [])
  }

  // 🔄 Cambiar rol
  async function updateMemberRole(memberId: string, newRole: "viewer" | "editor") {
    const { error } = await supabase
      .from("project_members")
      .update({ role: newRole })
      .eq("id", memberId)

    if (error) {
      setErr("❌ No se pudo actualizar rol")
      return
    }
    setMsg("✅ Rol actualizado")
    loadMembers()
  }

  // ❌ Eliminar miembro
  async function removeMember(memberId: string) {
    const ok = confirm("¿Eliminar este miembro del proyecto?")
    if (!ok) return

    const { error } = await supabase
      .from("project_members")
      .delete()
      .eq("id", memberId)

    if (error) {
      setErr("❌ No se pudo eliminar miembro")
      return
    }
    setMsg("🗑️ Miembro eliminado")
    loadMembers()
  }

  // ✉️ Invitar miembro usando RPC
  async function inviteMember() {
    if (!projectId) return
    if (!inviteEmail) {
      setErr("❌ Debes ingresar un correo")
      return
    }
    setInviteLoading(true)

    try {
      const { data: userId, error: rpcError } = await supabase.rpc("get_user_id_by_email", {
        target_email: inviteEmail,
      })

      if (rpcError || !userId) {
        setErr("❌ Usuario no encontrado en la plataforma")
        setInviteLoading(false)
        return
      }

      const { error } = await supabase
        .from("project_members")
        .upsert({
          project_id: projectId,
          user_id: userId,
          role: inviteRole,
        })

      if (error) throw error

      setMsg(`✅ Invitado ${inviteEmail} como ${inviteRole}`)
      setInviteEmail("")
      setInviteRole("viewer")
      loadMembers()
    } catch (e: any) {
      console.error(e)
      setErr("❌ Error al invitar usuario")
    } finally {
      setInviteLoading(false)
    }
  }

  // 🔄 Cargar capas
  async function loadLayers() {
    if (!projectId) return
    setLoading(true)
    const { data, error } = await supabase
      .from("project_layers")
      .select("id,name,geojson")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })

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

  // 🔄 Cargar estilos
  async function loadStyles(layerIds: string[]) {
    if (layerIds.length === 0) {
      setStyles({})
      return
    }
    const { data, error } = await supabase
      .from("project_layer_styles")
      .select("layer_id, stroke, weight, opacity, fill, fill_opacity, point_radius")
      .in("layer_id", layerIds)

    if (error) return

    const map: StylesById = {}
    for (const lId of layerIds) {
      const row = data?.find(d => d.layer_id === lId)
      map[lId] = {
        layer_id: lId,
        color: row?.stroke ?? "#1f2937",
        weight: row?.weight ?? 2,
        opacity: row?.opacity ?? 1,
        fillColor: row?.fill ?? "#1f2937",
        fillOpacity: row?.fill_opacity ?? 0.2,
        radius: row?.point_radius ?? 5,
      }
    }
    setStyles(map)
  }

  useEffect(() => { loadLayers() }, [projectId])
  useEffect(() => { loadStyles(layers.map(l => l.id)) }, [layers])

  if (err) {
    return <div className="p-6 text-center text-red-600 font-medium">{err}</div>
  }

  return (
    <div className="wrap">
      <div className="card flex flex-col lg:flex-row" style={{ width: "min(1400px, 98vw)" }}>
        {/* Columna izquierda */}
        <div className="flex-1 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-gray-700 hover:bg-gray-600 rounded-lg shadow transition"
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
            onDelete={(l: ProjectLayer) => {
              if (role !== "editor") return
              const ok = confirm(`¿Eliminar la capa "${l.name}"?`)
              if (ok) supabase.from("project_layers").delete().eq("id", l.id).then(() => loadLayers())
            }}
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

          {/* 🔑 Gestión de miembros */}
          {role === "editor" && (
            <div className="mt-6 space-y-6">
              {/* Formulario de invitación */}
              <div className="card space-y-3">
                <h3 className="subtitle">Invitar usuario</h3>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Correo del usuario"
                  className="input"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "viewer" | "editor")}
                  className="input"
                >
                  <option value="viewer">👀 Solo lectura</option>
                  <option value="editor">✏️ Editor</option>
                </select>
                <button
                  onClick={inviteMember}
                  disabled={inviteLoading}
                  className="btn btn-primary w-full"
                >
                  {inviteLoading ? "Invitando..." : "Invitar"}
                </button>
              </div>

              {/* Lista de miembros */}
              <div className="card">
                <h3 className="subtitle mb-3">👥 Miembros del proyecto</h3>
                {members.length === 0 ? (
                  <p className="text-gray-400 text-sm">No hay miembros invitados</p>
                ) : (
                  <ul className="space-y-2">
                    {members.map((m) => (
                      <li key={m.id} className="flex justify-between items-center bg-gray-700 px-3 py-2 rounded-md">
                        <span>{m.user_email}</span>
                        <div className="flex gap-2 items-center">
                          <select
                            value={m.role}
                            onChange={(e) => updateMemberRole(m.id, e.target.value as "viewer" | "editor")}
                            className="input w-28 text-sm"
                          >
                            <option value="viewer">👀 Viewer</option>
                            <option value="editor">✏️ Editor</option>
                          </select>
                          <button
                            onClick={() => removeMember(m.id)}
                            className="btn btn-danger text-xs"
                          >
                            Eliminar
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
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
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowWms(false)}></div>
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
