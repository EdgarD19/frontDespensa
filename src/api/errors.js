/** Mensaje legible desde respuestas Axios / Spring Boot / Problem Details. */

// Las fechas que el back incluye dentro de los textos de error llegan como
// "yyyy-MM-dd": para mostrarlas al usuario van en DD/MM/AAAA.
function fechasIsoADiaMesAnio(texto) {
  return String(texto ?? "").replace(/\d{4}-\d{2}-\d{2}/g, (m) => {
    const d = new Date(`${m}T12:00:00`);
    return Number.isNaN(d.getTime())
      ? m
      : d.toLocaleDateString("es-PY", { day: "2-digit", month: "2-digit", year: "numeric" });
  });
}

export function apiErrorMessage(err) {
  const convertir = (t) => (t == null ? t : fechasIsoADiaMesAnio(t));
  if (!err) return "Error desconocido";

  const status = err.response?.status;
  const d = err.response?.data;

  if (!err.response) {
    return convertir(err.message || "Error de red");
  }

  if (d == null || d === "") {
    if (status === 403) return "Acceso denegado (403)";
    if (status === 404) return "Recurso no encontrado (404)";
    return convertir(err.response.statusText || err.message || `Error HTTP ${status}`);
  }

  if (typeof d === "string") return convertir(d.trim() || err.message || `Error HTTP ${status}`);

  if (d.errores && typeof d.errores === "object" && Object.keys(d.errores).length > 0) {
    return Object.entries(d.errores)
      .map(([campo, msg]) => `${campo}: ${convertir(msg)}`)
      .join("; ");
  }

  if (Array.isArray(d.errors) && d.errors.length > 0) {
    return d.errors
      .map((e) => convertir(e.defaultMessage ?? e.message ?? String(e)))
      .join("; ");
  }

  if (Array.isArray(d) && d.length > 0) {
    return d.map((e) => convertir(typeof e === "string" ? e : e.message ?? String(e))).join("; ");
  }

  const msg =
    d.detail ??
    d.message ??
    d.mensaje ??
    d.details ??
    d.error ??
    d.title ??
    d.path;

  if (msg) return convertir(String(msg));

  return convertir(err.message || `Error HTTP ${status}`);
}
