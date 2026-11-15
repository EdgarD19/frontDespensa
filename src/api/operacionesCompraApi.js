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
export async function getDevoluciones({ page = 0, pageSize = 1000, estado } = {}) {
  const { data } = await api.get(DEVOLUCIONES, {
    params: { page, size: pageSize, estado, sortBy: "fechaCreacion", sortDirection: "desc" },
  });
  return unwrap(data);
}

/** Todas las devoluciones, recorriendo las páginas del back. */
export async function getDevolucionesCompletas({ estado, pageSize = 1000 } = {}) {
  const primero = await getDevoluciones({ page: 0, pageSize, estado });
  const content = [...primero.content];
  const totalPages = Number(primero.totalPages) || 0;
  for (let page = 1; page < totalPages; page++) {
    const siguiente = await getDevoluciones({ page, pageSize, estado });
    content.push(...siguiente.content);
  }
  return content;
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

/** Todas las órdenes de intercambio, recorriendo las páginas del back. */
export async function getIntercambiosCompletos({ pageSize = 1000 } = {}) {
  const primero = await getIntercambios({ page: 0, pageSize });
  const content = [...primero.content];
  const totalPages = Number(primero.totalPages) || 0;
  for (let page = 1; page < totalPages; page++) {
    const siguiente = await getIntercambios({ page, pageSize });
    content.push(...siguiente.content);
  }
  return content;
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

/** Todas las anulaciones, recorriendo las páginas del back. */
export async function getAnulacionesCompletas({ pageSize = 1000 } = {}) {
  const primero = await getAnulaciones({ page: 0, pageSize });
  const content = [...primero.content];
  const totalPages = Number(primero.totalPages) || 0;
  for (let page = 1; page < totalPages; page++) {
    const siguiente = await getAnulaciones({ page, pageSize });
    content.push(...siguiente.content);
  }
  return content;
}

/** Anular una factura de compra. */
export async function anularFactura(payload) {
  const { data } = await api.post(ANULACIONES, payload);
  return data;
}