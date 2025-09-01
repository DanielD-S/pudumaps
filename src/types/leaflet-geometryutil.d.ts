import * as L from "leaflet"

declare module "leaflet" {
  namespace GeometryUtil {
    function geodesicArea(latlngs: L.LatLng[]): number
    function length(latlngs: L.LatLng[]): number
  }
}
