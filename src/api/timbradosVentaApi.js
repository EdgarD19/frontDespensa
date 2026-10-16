// Timbrados de venta (Datos DNIT) — API real.
// El back solo persiste: numeroTimbrado (8 dígitos), fechaInicio, fechaVencimiento
// y activo. El establecimiento/punto y el rango de numeración todavía NO están en el
// back; eso vive en localStorage (ver comprobantesApi.js).
import { api } from "./client";
import { apiErrorMessage } from "./errors";

export { apiErrorMessage };

const BASE = "/api/timbrados-venta";

// Desenvuelve { data: PageWrapper, mensaje } → { content, page, size, totalElements, totalPages }
function unwrap(body) {
  const page = body?.data ?? body ?? {};
  const content = Array.isArray(page.content) ? page.content : [];
  return {
    content,
    totalElements: page.totalElements ?? content.length,
    totalPages: page.totalPages ?? 0,
    page: page.page ?? 0,
    size: page.size ?? 0,
  };
}

/** Timbrados de venta (paginado). */
export async function getTimbradosVenta({ page = 0, pageSize = 200, sortBy = "fechaInicio", sortDir = "desc" } = {}) {
  const { data } = await api.get(BASE, {
    params: { page, size: pageSize, sortBy, sortDirection: sortDir },
  });
  return unwrap(data);
}

/** Timbrados de venta activos (paginado). */
export async function getTimbradosVentaActivos({ page = 0, pageSize = 200, sortBy = "fechaInicio", sortDir = "desc" } = {}) {
  const { data } = await api.get(`${BASE}/activos`, {
    params: { page, size: pageSize, sortBy, sortDirection: sortDir },
  });
  return unwrap(data);
}

export async function getTimbradoVentaById(id) {
  const { data } = await api.get(`${BASE}/${id}`);
  return data;
}

/** Timbrado vigente para una fecha (por defecto hoy). 404/409 si no hay ninguno. */
export async function getTimbradoVentaVigente(fecha) {
  const { data } = await api.get(`${BASE}/vigente`, {
    params: fecha ? { fecha } : undefined,
  });
  return data;
}

export async function crearTimbradoVenta(payload) {
  const { data } = await api.post(BASE, payload);
  return data;
}

export async function actualizarTimbradoVenta(id, payload) {
  const { data } = await api.put(`${BASE}/${id}`, payload);
  return data;
}

/** activo=true → PATCH /activar ; activo=false → PATCH /desactivar */
export async function toggleActivoTimbradoVenta(id, activo) {
  const accion = activo ? "activar" : "desactivar";
  const { data } = await api.patch(`${BASE}/${id}/${accion}`);
  return data;
}

/** Baja lógica (el back solo lo marca inactivo). */
export async function eliminarTimbradoVenta(id) {
  await api.delete(`${BASE}/${id}`);
}
