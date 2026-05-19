/** Mensaje legible desde respuestas Axios / Spring Boot / Problem Details. */
export function apiErrorMessage(err) {
  if (!err) return "Error desconocido";

  const status = err.response?.status;
  const d = err.response?.data;

  if (!err.response) {
    return err.message || "Error de red";
  }

  if (d == null || d === "") {
    if (status === 403) return "Acceso denegado (403)";
    if (status === 404) return "Recurso no encontrado (404)";
    return err.response.statusText || err.message || `Error HTTP ${status}`;
  }

  if (typeof d === "string") return d.trim() || err.message || `Error HTTP ${status}`;

  if (Array.isArray(d.errors) && d.errors.length > 0) {
    return d.errors
      .map((e) => e.defaultMessage ?? e.message ?? String(e))
      .join("; ");
  }

  if (Array.isArray(d) && d.length > 0) {
    return d.map((e) => (typeof e === "string" ? e : e.message ?? String(e))).join("; ");
  }

  const msg =
    d.detail ??
    d.message ??
    d.details ??
    d.error ??
    d.title ??
    d.path;

  if (msg) return String(msg);

  return err.message || `Error HTTP ${status}`;
}
