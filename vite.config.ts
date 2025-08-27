import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/pudumaps/", // 👈 necesario para que funcione en GitHub Pages
  server: {
    port: 5173 // 👈 mantiene tu puerto local
  }
});
