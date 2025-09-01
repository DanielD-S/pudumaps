import { Link } from "react-router-dom"
import { useState } from "react"
import ProjectEditModal from "./ProjectEditModal"

interface Props {
  id: string
  name: string
  description?: string
  isFavorite: boolean
  onDelete: (id: string) => void
  onUpdated: () => void
  onToggleFavorite: () => void
  onNotify?: (msg: string, type?: "success" | "error" | "info") => void
}

export default function ProjectCard({
  id,
  name,
  description,
  isFavorite,
  onDelete,
  onUpdated,
  onToggleFavorite,
  onNotify,
}: Props) {
  const [editing, setEditing] = useState(false)

  return (
    <div className="bg-gray-800 rounded-lg shadow-md p-5 flex justify-between items-center hover:bg-gray-750 transition">
      {/* Info proyecto */}
      <div>
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          📂 {name}
          <button
            onClick={onToggleFavorite}
            className="ml-2 text-lg focus:outline-none hover:scale-110 transition"
            title={isFavorite ? "Quitar de favoritos" : "Marcar como favorito"}
          >
            {isFavorite ? "⭐" : "☆"}
          </button>
        </h3>
        {description ? (
          <p className="text-sm text-gray-400">{description}</p>
        ) : (
          <p className="text-sm text-gray-600 italic">Sin descripción</p>
        )}
      </div>

      {/* Acciones */}
      <div className="flex gap-2 sm:gap-3">
        <Link
          to={`/project/${id}`}
          className="px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 hover:bg-blue-700 text-white transition"
        >
          Abrir
        </Link>
        <button
          onClick={() => setEditing(true)}
          className="px-3 py-1.5 text-sm font-medium rounded-md border border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-white transition"
        >
          ✏️ Editar
        </button>
        <button
          onClick={() => onDelete(id)}
          className="px-3 py-1.5 text-sm font-medium rounded-md border border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition"
        >
          🗑️ Eliminar
        </button>
      </div>

      {/* Modal de edición */}
      {editing && (
        <ProjectEditModal
          id={id}
          initialName={name}
          initialDescription={description}
          onClose={() => setEditing(false)}
          onUpdated={onUpdated}
          onNotify={onNotify}
        />
      )}
    </div>
  )
}
