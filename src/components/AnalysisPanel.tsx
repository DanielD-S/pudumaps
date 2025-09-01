interface Props {
  analisis: {id:string,type:string,medida:string,geojson:any}[]
  onDelete: (id:string) => void
  onExport: () => void
}

export default function AnalysisPanel({ analisis, onDelete, onExport }: Props) {
  return (
    <div className="p-4 bg-gray-800 text-white rounded-lg space-y-3">
      <h2 className="text-lg font-semibold">📊 Análisis</h2>
      {analisis.length === 0 && <p className="text-sm text-gray-400">No hay mediciones</p>}
      <ul className="space-y-2">
        {analisis.map(a => (
          <li key={a.id} className="bg-gray-700 px-3 py-2 rounded flex justify-between items-center">
            <div>
              <p className="font-medium">{a.type}</p>
              <p className="text-sm text-gray-300">{a.medida}</p>
            </div>
            <button onClick={() => onDelete(a.id)} className="text-red-400 hover:text-red-600">✕</button>
          </li>
        ))}
      </ul>
      {analisis.length > 0 && (
        <button onClick={onExport} className="btn btn-secondary w-full">
          📥 Exportar GeoJSON
        </button>
      )}
    </div>
  )
}
