/**
 * Roles permitidos hasta integrar autenticación real con el backend.
 * - Si VITE_USER_ROLES no está definido o está vacío → no se aplica restricción (desarrollo).
 * - Si está definido (p. ej. "CAJERO") → solo ADMIN y ENCARGADO_INVENTARIO pueden gestionar ajustes.
 */
export function getUserRolesFromEnv() {
  const raw = import.meta.env.VITE_USER_ROLES;
  if (raw == null || String(raw).trim() === "") return null;
  return String(raw)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function canGestionarAjustesInventario() {
  const roles = getUserRolesFromEnv();
  if (!roles || roles.length === 0) return true;
  return roles.some((r) => r === "ADMIN" || r === "ENCARGADO_INVENTARIO");
}

export function canAutorizarAjustesInventario() {
  return canGestionarAjustesInventario();
}
