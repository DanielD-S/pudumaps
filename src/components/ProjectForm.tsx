import { useState } from "react"
import { supabase } from "../lib/supabase"

interface Props {
  onProjectCreated: () => void
  onNotify?: (msg: string, type?: "success" | "error" | "info") => void
}

export default function ProjectForm({ onProjectCreated, onNotify }: Props) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)

  async function createProject() {
    if (!name) {
      onNotify?.("❌ El proyecto debe tener un nombre", "error")
      return
    }
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from("projects")
      .insert([{ name, description, owner_id: user?.id }])

    setLoading(false)
    if (error) {
      onNotify?.("❌ No se pudo crear el proyecto", "error")
      return
    }

    setName("")
    setDescription("")
    onProjectCreated()
    onNotify?.("✅ Proyecto creado", "success")
  }

  return (
    <div className="card space-y-4">
      <h2 className="subtitle">Tus proyectos</h2>

      <input
        type="text"
        placeholder="Nombre del proyecto"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="input"
      />
      <input
        type="text"
        placeholder="Descripción (ej: Capas base de Chile)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
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
