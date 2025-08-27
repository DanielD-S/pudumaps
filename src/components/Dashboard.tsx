import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { Link } from "react-router-dom"

type Project = {
  id: string
  name: string
  description?: string
  owner_id?: string
}

export default function Dashboard({ email }: { email: string }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)

  // 🔄 Cargar proyectos del usuario
  async function loadProjects() {
    const { data, error } = await supabase
      .from("projects")
      .select("id, name, description, owner_id")
      .order("created_at", { ascending: false })

    if (!error && data) setProjects(data)
  }

  // 🟢 Crear proyecto con owner_id
  async function createProject() {
    if (!name) return alert("Debes ponerle un nombre")
    setLoading(true)

    // Obtener usuario actual
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from("projects")
      .insert([{ 
        name, 
        description, 
        owner_id: user?.id  // 👈 aquí el dueño del proyecto
      }])

    setLoading(false)
    if (error) return alert(error.message)

    setName("")
    setDescription("")
    loadProjects()
  }

  // ❌ Eliminar proyecto (solo si es tuyo)
  async function deleteProject(id: string) {
    const ok = confirm("¿Eliminar proyecto?")
    if (!ok) return
    const { error } = await supabase.from("projects").delete().eq("id", id)
    if (error) return alert(error.message)
    setProjects(prev => prev.filter(p => p.id !== id))
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
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="title">Sesión iniciada en Pudumaps</h1>
          <p className="text-muted">{email}</p>
        </div>

        {/* Formulario de creación */}
        <div className="card space-y-4">
          <h2 className="subtitle">Tus proyectos</h2>

          <input
            type="text"
            placeholder="Mi primer proyecto"
            value={name}
            onChange={e => setName(e.target.value)}
            className="input"
          />
          <input
            type="text"
            placeholder="Ej: Capas base de Chile"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="input"
          />

          <div className="flex gap-3">
            <button
              onClick={createProject}
              disabled={loading}
              className="btn btn-primary disabled:opacity-60"
            >
              {loading ? "Creando…" : "Crear y abrir"}
            </button>

            <button
              onClick={loadProjects}
              className="btn btn-secondary"
            >
              Actualizar
            </button>

            <button
              onClick={signOut}
              className="btn btn-danger ml-auto"
            >
              Cerrar sesión
            </button>
          </div>
        </div>

        {/* Lista de proyectos */}
        <div className="space-y-3">
          {projects.map(p => (
            <div
              key={p.id}
              className="card flex justify-between items-center py-3 px-4"
            >
              <div>
                <h3 className="font-semibold text-white">{p.name}</h3>
                <p className="text-muted">{p.description}</p>
              </div>
              <div className="flex gap-3">
                <Link
                  to={`/project/${p.id}`}
                  className="text-blue-400 hover:underline"
                >
                  Abrir
                </Link>
                <button
                  onClick={() => deleteProject(p.id)}
                  className="btn btn-danger px-3 py-1 text-sm"
                >
                  Eliminar
                </button>
              </div>
            </div>
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
