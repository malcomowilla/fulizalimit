import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'

const TARGET = 'https://owitech.co.ke'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')

  return {
    plugins: [react(), tailwindcss()],
    base: env.VITE_BASE_PATH || '/ngoribrathe/',
    server: {
      proxy: {
        '/api': {
          target: TARGET,
          changeOrigin: true,
          secure: true,
        },
      },
    },
  }
})