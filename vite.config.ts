import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const API_PORT = process.env.PORT ?? '3001'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Recharts is most of the bundle and it is loaded on the landing page anyway,
    // so splitting it would not help. This keeps `npm run build` quiet about it.
    chunkSizeWarningLimit: 800,
  },
})
