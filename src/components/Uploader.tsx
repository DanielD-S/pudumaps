import { useRef, useState } from "react"
import { supabase } from "../lib/supabase"
import type { ProjectLayer, LayerStyle } from "../types"

export default function Uploader({
  projectId,
  onLayerAdded, // 👈 nuevo callback para actualizar frontend
  onError,
}: {
  projectId: string
  onLayerAdded?: (layer: ProjectLayer, style: LayerStyle) => void
  onError?: (msg: string) => void
}) {
  const fileInput = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const file = files[0]

    setUploading(true)

    try {
      const text = await file.text()
      const geojson = JSON.parse(text)

      // 👉 Insertamos en Supabase
      const { data, error } = await supabase
        .from("project_layers")
        .insert({
          project_id: projectId,
          name: file.name.replace(/\.[^.]+$/, ""),
          geojson,
        })
        .select()
        .single()

      if (error) throw error

      // Creamos el estilo inicial
      const style: LayerStyle = {
        layer_id: data.id,
        color: "#3388ff",
        weight: 2,
        opacity: 1,
        fillColor: "#3388ff",
        fillOpacity: 0.2,
        radius: 6,
      }

      // 👉 Notificamos al ProjectPage para actualizar states
      onLayerAdded?.(data as ProjectLayer, style)
    } catch (e: any) {
      console.error(e)
      onError?.(e.message || "No se pudo subir el archivo")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileInput}
        type="file"
        accept=".geojson,.json"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        disabled={uploading}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow disabled:opacity-60 transition"
      >
        {uploading ? "Subiendo…" : "📤 Subir GeoJSON/KMZ/KML"}
      </button>
    </div>
  )
}
