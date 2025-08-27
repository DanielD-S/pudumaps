import { useEffect } from "react"
import L from "leaflet"

interface Props {
  map: L.Map | null
  geojson: any
}

export default function SafeLayer({ map, geojson }: Props) {
  useEffect(() => {
    if (!map || !geojson) return

    let layer: L.GeoJSON | null = null
    try {
      // Intentar renderizar el GeoJSON
      layer = L.geoJSON(geojson)
      layer.addTo(map)
    } catch (err) {
      console.error("❌ Error al renderizar GeoJSON:", err)
      alert("El archivo no pudo renderizarse correctamente (GeoJSON inválido).")
    }

    return () => {
      if (map && layer) {
        map.removeLayer(layer)
      }
    }
  }, [map, geojson])

  return null
}
