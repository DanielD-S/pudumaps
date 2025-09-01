import { useState } from "react"
import { supabase } from "../lib/supabase"

interface Props {
  id: string
  initialName: string
  initialDescription?: string
  onClose: () => void
  onUpdated: () => void
  onNotify?: (msg: string, type?: "success" | "error" | "info") => void
}

export default function ProjectEditModal({ id, initialName, initialDescription, onClose, onUpdated, onNotify }: Props) {
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialDescription || "")
  const [loading, setLoading] = useState(false)

  async function updateProject() {
    if (!name) {
      onNotify?.("❌ El proyecto debe tener un nombre", "error")
      return
    }
    setLoading(true)

    const { error } = await supabase
      .from("projects")
      .update({ name, description })
      .eq("id", id)

    setLoading(false)
    if (error) {
      onNotify?.("❌ No se pudo actualizar el proyecto", "error")
      return
    }

    onUpdated()
    onClose()
    onNotify?.("✅ Proyecto actualizado", "success")
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">✏️ Editar proyecto</h2>

        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-300">Nombre</label>
            <input
              type="text"
              className="input w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300">Descripción</label>
            <input
              type="text"
              className="input w-full"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-md bg-gray-600 hover:bg-gray-500 text-white transition"
          >
            Cancelar
          </button>
          <button
            onClick={updateProject}
            disabled={loading}
            className="px-3 py-1.5 rounded-md bg-green-600 hover:bg-green-700 text-white transition disabled:opacity-60"
          >
            {loading ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  )
}
