import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
    ],
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/three/examples/jsm/lines/')) {
            return 'three-lines'
          }
          if (id.includes('/node_modules/three/examples/jsm/controls/OrbitControls')) {
            return 'three-orbit-controls'
          }
          if (id.includes('/node_modules/three/examples/jsm/')) {
            return 'three-examples'
          }
          if (id.includes('/node_modules/three/src/') || id.includes('/node_modules/three/build/three.module.js')) {
            return 'three-core'
          }
          return undefined
        },
      },
    },
  },
})
