import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import ProjectCard from "./ProjectCard"
import ProjectForm from "./ProjectForm"
import Toast from "./Toast"
import ConfirmModal from "./ConfirmModal"

type Project = {
  id: string
  name: string
  description?: string
  owner_id?: string
  is_favorite?: boolean
  visibility?: "private" | "public"   // 👈 nuevo campo
}

export default function Dashboard({ email }: { email: string }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [toast, setToast] = useState<{ msg: string; type?: "success" | "error" | "info" } | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  // 🔄 Mostrar toast
  function showToast(msg: string, type: "success" | "error" | "info" = "info") {
    setToast({ msg, type })
  }

  // 🔄 Cargar proyectos (favoritos primero ⭐)
  async function loadProjects() {
    const { data, error } = await supabase
      .from("projects")
      .select("id, name, description, owner_id, is_favorite, visibility") // 👈 incluir visibility
      .order("is_favorite", { ascending: false }) // ⭐ primero
      .order("created_at", { ascending: false })  // luego más nuevos

    if (error) {
      showToast("❌ No se pudieron cargar los proyectos", "error")
      return
    }

    if (data) setProjects(data)
  }

  // ⭐ Alternar favorito
  async function toggleFavorite(id: string, current: boolean = false) {
    const { error } = await supabase
      .from("projects")
      .update({ is_favorite: !current })
      .eq("id", id)

    if (error) {
      showToast("❌ No se pudo actualizar favorito", "error")
      return
    }

    loadProjects()
    showToast(!current ? "⭐ Proyecto marcado como favorito" : "⭐ Proyecto quitado de favoritos", "success")
  }

  // ❌ Eliminar proyecto
  async function deleteProject(id: string) {
    const { error } = await supabase.from("projects").delete().eq("id", id)
    if (error) {
      showToast("❌ Error al eliminar proyecto", "error")
      return
    }
    setProjects(prev => prev.filter(p => p.id !== id))
    showToast("🗑️ Proyecto eliminado", "success")
  }

  // 🔴 Cerrar sesión
  async function signOut() {
    await supabase.auth.signOut()
    showToast("👋 Sesión cerrada", "info")
    setTimeout(() => window.location.reload(), 1000)
  }

  useEffect(() => {
    loadProjects()
  }, [])

  // 🔍 Filtrar proyectos
  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description?.toLowerCase() || "").includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6 relative">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <Toast
            message={toast.msg}
            type={toast.type}
            duration={3000}
            onClose={() => setToast(null)}
          />
        </div>
      )}

      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="title">Sesión iniciada en Pudumaps</h1>
            <p className="text-muted">{email}</p>
          </div>
          <button onClick={signOut} className="btn btn-danger">
            Cerrar sesión
          </button>
        </div>

        {/* Formulario de creación */}
        <ProjectForm
          onProjectCreated={() => {
            loadProjects()
            showToast("✅ Proyecto creado", "success")
          }}
          onNotify={showToast}
        />

        {/* Buscador */}
        <div>
          <input
            type="text"
            placeholder="🔍 Buscar proyectos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input w-full"
          />
        </div>

        {/* Lista de proyectos */}
        <div className="space-y-3">
          {filteredProjects.map((p) => (
            <ProjectCard
              key={p.id}
              id={p.id}
              name={p.name}
              description={p.description}
              isFavorite={p.is_favorite ?? false}
              visibility={p.visibility ?? "private"}  // 👈 pasar a ProjectCard
              onDelete={(id) => setConfirming(id)}
              onUpdated={() => {
                loadProjects()
                showToast("✅ Proyecto actualizado", "success")
              }}
              onToggleFavorite={() => toggleFavorite(p.id, p.is_favorite ?? false)}
              onNotify={showToast}
            />
          ))}

          {filteredProjects.length === 0 && (
            <p className="text-muted text-center">No se encontraron proyectos.</p>
          )}
        </div>
      </div>

      {/* Modal de confirmación */}
      {confirming && (
        <ConfirmModal
          message="¿Seguro que deseas eliminar este proyecto?"
          onCancel={() => setConfirming(null)}
          onConfirm={() => {
            deleteProject(confirming)
            setConfirming(null)
          }}
        />
      )}
    </div>
  )
}
