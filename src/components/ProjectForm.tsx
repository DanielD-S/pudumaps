import { useState } from "react"
import { supabase } from "../lib/supabase"

interface Props {
  onProjectCreated: () => void
  onNotify?: (msg: string, type?: "success" | "error" | "info") => void
}

export default function ProjectForm({ onProjectCreated, onNotify }: Props) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [visibility, setVisibility] = useState<"private" | "public">("private") // 👈 nuevo estado
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
      .insert([{ name, description, owner_id: user?.id, visibility }]) // 👈 guardar visibilidad

    setLoading(false)
    if (error) {
      onNotify?.("❌ No se pudo crear el proyecto", "error")
      return
    }

    setName("")
    setDescription("")
    setVisibility("private") // reset al valor por defecto
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

      {/* Selector de visibilidad */}
      <div>
        <label className="block text-sm text-gray-300 mb-1">Visibilidad</label>
        <select
          className="input w-full"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as "private" | "public")}
        >
          <option value="private">🔒 Privado</option>
          <option value="public">🌍 Público</option>
        </select>
      </div>

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
