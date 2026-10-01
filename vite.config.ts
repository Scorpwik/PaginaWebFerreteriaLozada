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
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Las animaciones no deben entrar en el bundle critico del catalogo.
          animation: ['gsap', 'lenis'],
          supabase: ['@supabase/supabase-js'],
          charts: ['recharts'],
        },
      },
    },
  },
})
