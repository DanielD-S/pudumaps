import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { parseShapefileZip, parseKml, parseKmz, isFeatureOrFC } from '../lib/parse'

const BUCKET_NAME = 'pudumaps' // cambia si tu bucket tiene otro nombre

export default function Uploader({
  projectId,
  onDone,
  onError,
}: {
  projectId: string
  onDone?: () => void
  onError?: (msg: string) => void
}) {
  const [name, setName] = useState('Capa GeoJSON')
  const [busy, setBusy] = useState(false)

  function slugifyFilename(filename: string) {
    const dot = filename.lastIndexOf('.')
    const base = dot >= 0 ? filename.slice(0, dot) : filename
    const ext  = dot >= 0 ? filename.slice(dot + 1) : ''
    const asciiBase = base.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase()
    const asciiExt = ext.toLowerCase().replace(/[^a-z0-9]+/g, '')
    return asciiExt ? `${asciiBase}.${asciiExt}` : asciiBase
  }

  function guessMime(ext: string) {
    switch (ext) {
      case 'zip': return 'application/zip'
      case 'kml': return 'application/vnd.google-earth.kml+xml'
      case 'kmz': return 'application/vnd.google-earth.kmz'
      case 'geojson': return 'application/geo+json'
      case 'json': return 'application/json'
      default: return 'application/octet-stream'
    }
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    try {
      setBusy(true)
      // 1) parse → GeoJSON FC
      const ext = (file.name.split('.').pop() || '').toLowerCase()
      let fc: any
      if (ext === 'geojson' || ext === 'json') {
        const txt = await file.text()
        const gj = JSON.parse(txt)
        if (!isFeatureOrFC(gj)) throw new Error('El JSON no es GeoJSON válido.')
        fc = gj.type === 'FeatureCollection' ? gj : { type: 'FeatureCollection', features: [gj] }
      } else if (ext === 'zip') fc = await parseShapefileZip(file)
      else if (ext === 'kml') fc = await parseKml(file)
      else if (ext === 'kmz') fc = await parseKmz(file)
      else throw new Error('Formato no soportado. Usa GeoJSON, SHP(.zip), KML o KMZ.')

      // 2) subir original a Storage
      const { data: u } = await supabase.auth.getUser()
      const userId = u.user?.id
      if (!userId) throw new Error('No hay usuario autenticado.')

      const safeName = slugifyFilename(file.name)
      const storagePath = `${userId}/${projectId}/${Date.now()}_${safeName}`

      const { error: upErr } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, file, { contentType: file.type || guessMime(ext), upsert: false })
      if (upErr) throw upErr

      // 3) metadatos
      await supabase.from('project_files').insert({
        project_id: projectId,
        name: safeName,
        mime: file.type || guessMime(ext),
        size_bytes: file.size,
        storage_path: storagePath,
      })

      // 4) crear capa
      const layerNameToUse = name || safeName
      const { error: insErr } = await supabase.from('project_layers').insert({
        project_id: projectId,
        name: layerNameToUse,
        geojson: fc,
      })
      if (insErr) throw insErr

      onDone?.()
    } catch (err: any) {
      console.error(err)
      onError?.(err?.message || 'No se pudo subir el archivo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
      <input
        value={name}
        onChange={e=>setName(e.target.value)}
        placeholder="Nombre de la capa"
        style={{padding:'8px 10px', border:'1px solid #ddd', borderRadius:10}}
      />
      <input
        type="file"
        accept=".geojson,.json,.zip,.kml,.kmz"
        onChange={onFileChange}
        disabled={busy}
      />
    </div>
  )
}
