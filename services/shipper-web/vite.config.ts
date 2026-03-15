import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    host: true,
  },
  preview: {
    port: 5175,
  },
  build: {
    minify: false,
  },
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.(tsx?|jsx?)$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
})

