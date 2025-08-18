export type Project = { 
  id: string; 
  name: string; 
  description: string | null 
}

export type ProjectLayer = { 
  id: string; 
  name: string; 
  geojson: any 
}

export type LayerStyle = {
  layer_id: string

  // Línea
  color: string
  weight: number
  opacity: number

  // Relleno
  fillColor: string
  fillOpacity: number

  // Puntos
  radius: number
}
