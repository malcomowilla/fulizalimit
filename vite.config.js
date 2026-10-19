import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

const TARGET = 'https://owitech.co.ke'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  server: {
    proxy: {
      '/api': {
        target: TARGET,
        changeOrigin: true, 
        secure: true,
      },
    },
  },
})