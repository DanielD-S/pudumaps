import type { LayerStyle } from "../types"

export function defaultLayerStyle(layer_id: string): LayerStyle {
  return {
    layer_id,
    color: "#3388ff",
    weight: 2,
    opacity: 1,
    fillColor: "#3388ff",
    fillOpacity: 0.4,
    radius: 6,
  }
}
