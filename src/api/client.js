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
  // En `npm run dev` siempre URL relativa: pasa por el proxy de Vite (vite.config.js) y evita CORS.
  // Si se usara VITE_API_BASE_URL=http://localhost:8081/... el navegador pegaría en otro origen y Axios suele mostrar "Network Error".
  if (import.meta.env.DEV) {
    return "/DespensaProyect";
  }
  const fromEnv = import.meta.env.VITE_API_BASE_URL?.trim();
  if (fromEnv) return normalizeBaseUrl(fromEnv);
  return "http://localhost:8081/DespensaProyect";
}

export const API_BASE_URL = resolveBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
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
