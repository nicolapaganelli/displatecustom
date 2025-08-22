import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuration for GitHub Pages deployment
export default defineConfig(() => ({
  plugins: [react()],
  server: {
    port: 3000,
    host: 'localhost',
    open: true
  },
  // Always build for the site root on the custom domain
  base: '/',
  build: {
    outDir: 'dist',
    sourcemap: true
  }
}))
