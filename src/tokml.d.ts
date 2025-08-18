declare module 'tokml' {
  // Tipado mínimo suficiente para nuestro uso
  export default function tokml(
    geojson: any,
    options?: {
      name?: string;
      documentName?: string;
      simplestyle?: boolean;
      documentDescription?: string;
      simplestyle_fields?: string[];
    }
  ): string;
}
