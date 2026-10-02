import { defineConfig } from 'vite'

export default defineConfig({
  server: { port: 3002, host: '0.0.0.0' },
  preview: { port: 3002, host: '0.0.0.0' },
  build: { outDir: 'dist', sourcemap: false, chunkSizeWarningLimit: 1000 }
})
