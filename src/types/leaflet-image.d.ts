declare module "leaflet-image" {
  import { Map } from "leaflet";

  export default function leafletImage(
    map: Map,
    callback: (err: any, canvas: HTMLCanvasElement) => void
  ): void;
}
