/* 
  defineConfig: ayuda a definir la configuracion con autocompletado.
  loadEnv: carga las variables de entorno desde los archivos .env.
  react: plugin para soporte de React (JSX).
  tailwindcss: plugin para soporte de Tailwind CSS, integra directamente con Vite.
*/
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
/*
  mode: indica el modo de ejecución (development, production, etc.).
  sirve para cargar distintas variables segun el entorno.
*/

export default defineConfig(({ mode }) => {
  /* 
    procces.cwd(): carpeta raiz del proyecto, donde se encuentran los archivos .env.
    '': sin prefijo -> carga todas las variables (no solo VITE_).
  */  
  const env = loadEnv(mode, process.cwd(), '')
  // DEFINIR EL PROXY TARGET
  /*
    Usa la variable VITE_DEV_PROXY_TARGET
      Si no existe, usa 'http://127.0.0.1:8081'
    .replace(/\/+$/, '')  
      Elimina barras al final (/)
  */
  const proxyTarget = (env.VITE_DEV_PROXY_TARGET || 'http://127.0.0.1:8081').replace(
    /\/+$/,
    ''
  )

  return {
    // activar plugins
    plugins: [react(), tailwindcss()],
    // configuracion del servidor, evitando problemas 
    // de CORS al hacer peticiones a la API durante el desarrollo
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
