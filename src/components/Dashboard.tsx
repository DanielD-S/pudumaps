import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import ProjectCard from "./ProjectCard"
import ProjectForm from "./ProjectForm"
import Toast from "./Toast"

type Project = {
  id: string
  name: string
  description?: string
  owner_id?: string
}

export default function Dashboard({ email }: { email: string }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [toast, setToast] = useState<{ msg: string; type?: "success" | "error" | "info" } | null>(null)

  // 🔄 Mostrar toast temporal
  function showToast(msg: string, type: "success" | "error" | "info" = "info") {
    setToast({ msg, type })
  }

  // 🔄 Cargar proyectos
  async function loadProjects() {
    const { data, error } = await supabase
      .from("projects")
      .select("id, name, description, owner_id")
      .order("created_at", { ascending: false })

    if (error) {
      showToast("❌ No se pudieron cargar los proyectos", "error")
      return
    }

    if (data) setProjects(data)
  }

  // ❌ Eliminar proyecto
  async function deleteProject(id: string) {
    const ok = confirm("¿Eliminar proyecto?")
    if (!ok) return
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
    window.location.reload()
  }

  useEffect(() => {
    loadProjects()
  }, [])

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
          <button
            onClick={signOut}
            className="btn btn-danger"
          >
            Cerrar sesión
          </button>
        </div>

        {/* Formulario de creación */}
        <ProjectForm onProjectCreated={() => { loadProjects(); showToast("✅ Proyecto creado", "success") }} />

        {/* Lista de proyectos */}
        <div className="space-y-3">
          {projects.map(p => (
            <ProjectCard
              key={p.id}
              id={p.id}
              name={p.name}
              description={p.description}
              onDelete={deleteProject}
            />
          ))}

          {projects.length === 0 && (
            <p className="text-muted text-center">
              No tienes proyectos aún.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
