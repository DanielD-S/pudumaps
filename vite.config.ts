import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE || "/", 
  server: {
    port: 5173,
    // 👇 importante para que funcione también en local
    fs: {
      strict: false,
    },
  },
})
