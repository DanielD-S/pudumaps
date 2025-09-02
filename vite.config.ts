import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE || "/", // 👈 dinámico según entorno
  server: {
    port: 5173, // 👈 mantiene tu puerto local
  },
})
