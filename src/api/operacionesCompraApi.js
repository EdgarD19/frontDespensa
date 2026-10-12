import { api } from "./client";

const INTERCAMBIOS = "/api/intercambios";
const ANULACIONES = "/api/anulaciones";
const DEVOLUCIONES = "/api/devoluciones";

// Desenvuelve la página de Spring (content/totalElements/...) que devuelven los endpoints paginados.
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

// ====================================================================
// DEVOLUCIONES A PROVEEDOR
// ====================================================================

/** Listar devoluciones (paginado). */
export async function getDevoluciones({ page = 0, pageSize = 1000 } = {}) {
  const { data } = await api.get(DEVOLUCIONES, {
    params: { page, size: pageSize, sortBy: "fechaCreacion", sortDirection: "desc" },
  });
  return unwrap(data);
}

/** Obtener una devolución por ID. */
export async function getDevolucionById(id) {
  const { data } = await api.get(`${DEVOLUCIONES}/${id}`);
  return data;
}

/** Crear una devolución PENDIENTE (descuenta stock). */
export async function crearDevolucion(payload) {
  const { data } = await api.post(DEVOLUCIONES, payload);
  return data;
}

/** Completar devolución: genera la factura nueva y anula la original. */
export async function completarDevolucion(id, payload) {
  const { data } = await api.put(`${DEVOLUCIONES}/${id}/completar`, payload);
  return data;
}

/** Cancelar devolución PENDIENTE (revierte stock). */
export async function cancelarDevolucion(id) {
  await api.delete(`${DEVOLUCIONES}/${id}`);
}

// ====================================================================
// INTERCAMBIOS
// ====================================================================

/** Listar órdenes de intercambio (paginado). */
export async function getIntercambios({ page = 0, pageSize = 1000 } = {}) {
  const { data } = await api.get(INTERCAMBIOS, { params: { page, size: pageSize } });
  return unwrap(data);
}

/** Listar órdenes de intercambio por estado (paginado). */
export async function getIntercambiosPorEstado(estado, { page = 0, pageSize = 1000 } = {}) {
  const { data } = await api.get(`${INTERCAMBIOS}/estado/${encodeURIComponent(estado)}`, {
    params: { page, size: pageSize },
  });
  return unwrap(data);
}

/** Obtener una orden de intercambio por ID. */
export async function getIntercambioById(id) {
  const { data } = await api.get(`${INTERCAMBIOS}/${id}`);
  return data;
}

/** Crear una orden de intercambio. */
export async function crearIntercambio(payload) {
  const { data } = await api.post(INTERCAMBIOS, payload);
  return data;
}

/** Marcar orden como RECIBIDO (proveedor recibió la devolución). */
export async function marcarIntercambioRecibido(id) {
  const { data } = await api.put(`${INTERCAMBIOS}/${id}/recibido`);
  return data;
}

/** Cerrar orden (proveedor trajo reemplazo, stock repuesto). */
export async function cerrarIntercambio(id) {
  const { data } = await api.put(`${INTERCAMBIOS}/${id}/cerrar`);
  return data;
}

/** Cancelar orden de intercambio (solo PENDIENTE, revierte stock). */
export async function cancelarIntercambio(id) {
  await api.patch(`${INTERCAMBIOS}/${id}/cancelar`);
}

// ====================================================================
// ANULACIONES DE FACTURA
// ====================================================================

/** Listar anulaciones (paginado). */
export async function getAnulaciones({ page = 0, pageSize = 1000 } = {}) {
  const { data } = await api.get(ANULACIONES, {
    params: { page, size: pageSize, sortBy: "fechaAnulacion", sortDirection: "desc" },
  });
  return unwrap(data);
}

/** Obtener una anulación por ID. */
export async function getAnulacionById(id) {
  const { data } = await api.get(`${ANULACIONES}/${id}`);
  return data;
}

/** Anular una factura de compra. */
export async function anularFactura(payload) {
  const { data } = await api.post(ANULACIONES, payload);
  return data;
}