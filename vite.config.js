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
  // Only use the /displater/ base in production (build)
  base: command === 'build' ? '/displater/' : '/',
  build: {
    outDir: 'dist',
    sourcemap: true
  }
}))
