import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuration for GitHub Pages deployment
export default defineConfig(({ command }) => ({
  plugins: [react()],
  server: {
    port: 3000,
    host: 'localhost',
    open: true // This will open the browser automatically
  },
  // Use the repository name as base URL in production
  base: command === 'build' ? '/displatecustom/' : '/',
  build: {
    outDir: 'dist',
    sourcemap: true
  }
}))
