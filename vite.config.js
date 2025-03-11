import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuration for GitHub Pages deployment
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  },
  base: '/displater/',
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
