import { useState } from "react"
import { supabase } from "../lib/supabase"

interface Props {
  onProjectCreated: () => void
}

export default function ProjectForm({ onProjectCreated }: Props) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)

  // 🟢 Crear proyecto
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
        owner_id: user?.id 
      }])

    setLoading(false)
    if (error) return alert(error.message)

    setName("")
    setDescription("")
    onProjectCreated()
  }

  return (
    <div className="card space-y-4">
      <h2 className="subtitle">Tus proyectos</h2>

      <input
        type="text"
        placeholder="Nombre del proyecto"
        value={name}
        onChange={e => setName(e.target.value)}
        className="input"
      />
      <input
        type="text"
        placeholder="Descripción (ej: Capas base de Chile)"
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
      </div>
    </div>
  )
}
