/** Mensaje legible si el backend devuelve texto, { message }, etc. */
export function apiErrorMessage(err) {
  const d = err?.response?.data;
  if (!d) return err?.message || "Error de red";
  if (typeof d === "string") return d;
  return d.error || d.details || d.message || err.message || "Error";
}
