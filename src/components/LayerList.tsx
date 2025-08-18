import type { ProjectLayer } from '../types'

export default function LayerList({
  loading,
  layers,
  visible,
  onToggleVisible,
  onZoom,
  onDelete,
}: {
  loading: boolean
  layers: ProjectLayer[]
  visible: Record<string, boolean>
  onToggleVisible: (id: string) => void
  onZoom: (layer: ProjectLayer) => void
  onDelete: (layer: ProjectLayer) => void
}) {
  return (
    <div style={{display:'grid', gap:8, marginBottom:10}}>
      {loading ? (
        <div className="hint">Cargando capas…</div>
      ) : layers.length === 0 ? (
        <div className="hint">No hay capas aún. Sube un GeoJSON/SHP/KML/KMZ para comenzar.</div>
      ) : (
        <ul style={{display:'grid', gap:8, listStyle:'none', paddingLeft:0}}>
          {layers.map(l => (
            <li key={l.id} style={{border:'1px solid #eee', borderRadius:10, padding:10, display:'flex', alignItems:'center', gap:10}}>
              <label style={{display:'flex', alignItems:'center', gap:8, flex:1}}>
                <input
                  type="checkbox"
                  checked={!!visible[l.id]}
                  onChange={() => onToggleVisible(l.id)}
                />
                <span style={{fontWeight:600}}>{l.name}</span>
              </label>
              <div style={{display:'flex', gap:8}}>
                <button className="muted" onClick={() => onZoom(l)} style={{padding:'6px 10px'}}>Zoom</button>
                <button
                  className="muted"
                  onClick={() => onDelete(l)}
                  style={{padding:'6px 10px', background:'#fee2e2', border:'1px solid #fecaca', borderRadius:10}}
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
