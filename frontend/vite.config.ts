import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      "/socket.io": {
        target: "https://duel-prediction-backend.onrender.com",
        ws: true,
      },
    },
  },
})
