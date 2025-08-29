import { Link } from "react-router-dom"

interface Props {
  id: string
  name: string
  description?: string
  onDelete: (id: string) => void
}

export default function ProjectCard({ id, name, description, onDelete }: Props) {
  return (
    <div className="bg-gray-800 rounded-lg shadow-md p-5 flex justify-between items-center hover:bg-gray-750 transition">
      {/* Info proyecto */}
      <div>
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          📂 {name}
        </h3>
        {description ? (
          <p className="text-sm text-gray-400">{description}</p>
        ) : (
          <p className="text-sm text-gray-600 italic">Sin descripción</p>
        )}
      </div>

      {/* Acciones */}
      <div className="flex gap-3">
        <Link
          to={`/project/${id}`}
          className="px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 hover:bg-blue-700 text-white transition"
        >
          Abrir
        </Link>
        <button
          onClick={() => onDelete(id)}
          className="px-3 py-1.5 text-sm font-medium rounded-md border border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition"
        >
          🗑️ Eliminar
        </button>
      </div>
    </div>
  )
}
