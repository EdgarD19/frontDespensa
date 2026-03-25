import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  /** Dónde está Spring en tu máquina (solo el proxy de Vite usa esto; no afecta CORS del navegador). */
  const proxyTarget = (env.VITE_DEV_PROXY_TARGET || 'http://127.0.0.1:8081').replace(
    /\/+$/,
    ''
  )

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/DespensaProyect': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
