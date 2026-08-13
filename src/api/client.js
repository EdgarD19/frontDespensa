import axios from "axios";

/**
 * Quita barra final. El backend usa context-path /DespensaProyect (Maven filtra @project.artifactId@).
 *
 * - Desarrollo (Vite): sin VITE_API_BASE_URL → base "/DespensaProyect" + proxy en vite.config
 * - Producción: sin variable → http://localhost:8081/DespensaProyect (ajustá o usá proxy reverso)
 */
function normalizeBaseUrl(raw) {
  const s = (raw || "").trim();
  return s.replace(/\/+$/, "");
}

function resolveBaseUrl() {
  // 1) Prioridad: variable de entorno explícita (ngrok, servidor remoto, etc.).
  //    Acepta VITE_API_URL (nombre que usa el equipo en ngrok) o VITE_API_BASE_URL.
  const fromEnv = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "").trim();
  if (fromEnv) return normalizeBaseUrl(fromEnv);

  // 2) En `npm run dev` sin variable → URL relativa: pasa por el proxy de Vite
  //    (vite.config.js) y evita CORS contra http://127.0.0.1:8081.
  if (import.meta.env.DEV) {
    return "/DespensaProyect";
  }

  // 3) Build de producción sin variable → localhost por defecto.
  return "http://localhost:8081/DespensaProyect";
}

export const API_BASE_URL = resolveBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    // Evita el aviso intermedio "ngrok-free.app" en peticiones del navegador.
    "ngrok-skip-browser-warning": "true",
  },
});

/** URL absoluta para enlaces en el navegador (Swagger, etc.) */
export function absoluteApiOrigin() {
  const base = API_BASE_URL;
  if (base.startsWith("http")) {
    return base;
  }
  if (typeof window !== "undefined") {
    return `${window.location.origin}${base.startsWith("/") ? base : `/${base}`}`;
  }
  return base;
}
