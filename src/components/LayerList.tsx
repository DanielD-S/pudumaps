import type { ProjectLayer } from "../types"

interface Props {
  layers: ProjectLayer[]
  visible: Record<string, boolean>
  onToggleVisible: (id: string) => void
  onZoom: (layer: ProjectLayer) => void        // 👈 agregar
  onDelete: (layer: ProjectLayer) => void      // 👈 agregar
}

export default function LayerList({ layers, visible, onToggleVisible, onZoom, onDelete }: Props) {
  if (layers.length === 0) {
    return <div className="hint">No hay capas todavía. Sube una para empezar.</div>
  }

  return (
    <div className="layer-list">
      {layers.map((l) => (
        <div key={l.id} className="layer-item">
          <label>
            <input
              type="checkbox"
              checked={visible[l.id]}
              onChange={() => onToggleVisible(l.id)}
            />
            {l.name}
          </label>
          <button onClick={() => onZoom(l)}>🔍</button>
          <button onClick={() => onDelete(l)}>🗑️</button>
        </div>
      ))}
    </div>
  )
}
