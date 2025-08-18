import shp from 'shpjs'
import { kml as kmlToGeoJSON } from '@tmcw/togeojson'
import JSZip from 'jszip'

export async function parseShapefileZip(file: File) {
  // shpjs acepta ArrayBuffer de un .zip con .shp+.dbf+.prj
  const ab = await file.arrayBuffer()
  const geojson = await shp(ab)         // devuelve FeatureCollection
  return normalizeFC(geojson)
}

export async function parseKml(file: File) {
  const text = await file.text()
  const dom = new DOMParser().parseFromString(text, 'application/xml')
  const gj = kmlToGeoJSON(dom)
  return normalizeFC(gj)
}

export async function parseKmz(file: File) {
  const ab = await file.arrayBuffer()
  const zip = await JSZip.loadAsync(ab)
  // busca primer .kml
  const kmlEntry = Object.values(zip.files).find(f => f.name.toLowerCase().endsWith('.kml'))
  if (!kmlEntry) throw new Error('KMZ sin .kml interno')
  const kmlText = await kmlEntry.async('text')
  const dom = new DOMParser().parseFromString(kmlText, 'application/xml')
  const gj = kmlToGeoJSON(dom)
  return normalizeFC(gj)
}

export function isFeatureOrFC(gj: any) {
  return gj && (gj.type === 'Feature' || gj.type === 'FeatureCollection')
}

function normalizeFC(gj: any) {
  if (!gj) throw new Error('GeoJSON vacío')
  if (gj.type === 'FeatureCollection') return gj
  if (gj.type === 'Feature') return { type: 'FeatureCollection', features: [gj] }
  throw new Error('No es GeoJSON válido')
}
