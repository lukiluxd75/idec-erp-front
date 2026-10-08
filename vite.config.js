import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 8060,
    strictPort: true,
  },
  build: {
    chunkSizeWarningLimit: 2000,
    sourcemap: false, // Desactiva mapas para evitar el crash de RAM en Jenkins
    rollupOptions: {
      external: ['fs', 'path'], 
    },
  },
  optimizeDeps: {
    exclude: ['@techstark/opencv-js'], 
  },
})
