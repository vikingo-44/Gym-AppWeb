import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Agregamos base: './' para que las rutas de los assets sean relativas
  // Esto evita el error "Not Found" al desplegar en subcarpetas como GitHub Pages
  base: './',
  build: {
    outDir: 'dist',
  }
})