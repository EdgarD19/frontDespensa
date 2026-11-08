import { api } from "./client";
import { apiErrorMessage } from "./errors";

export { apiErrorMessage };

const BASE = "/api/facturas-venta";

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

/**
 * Listado paginado de facturas de venta.
 * Contrato del back (FacturaVentaController): page, pageSize, sortBy, sortDir.
 * ⚠️ El back espera "pageSize" (no "size"): si se manda "size" el parámetro se
 * ignora y la respuesta vuelve con el default de 20 filas.
 */
export async function getFacturasVenta({ page = 0, pageSize = 20, sortBy, sortDir = "DESC", signal } = {}) {
  const { data } = await api.get(BASE, {
    signal,
    params: { page, pageSize, sortBy: sortBy || undefined, sortDir },
  });
  return unwrap(data);
}

/** Búsqueda libre por número de factura / cliente (paginado). */
export async function buscarFacturasVenta(q, { page = 0, pageSize = 20, sortBy, sortDir = "DESC", signal } = {}) {
  const { data } = await api.get(`${BASE}/buscar`, {
    signal,
    params: { q: q || undefined, page, pageSize, sortBy: sortBy || undefined, sortDir },
  });
  return unwrap(data);
}

/** Facturas de venta de un cliente (paginado). */
export async function getFacturasVentaPorCliente(idCliente, { page = 0, pageSize = 20, sortBy, sortDir = "DESC", signal } = {}) {
  const { data } = await api.get(`${BASE}/cliente/${idCliente}`, {
    signal,
    params: { page, pageSize, sortBy: sortBy || undefined, sortDir },
  });
  return unwrap(data);
}

/** Detalle completo de una factura de venta. */
export async function getFacturaVentaById(id) {
  const { data } = await api.get(`${BASE}/${id}`);
  return data?.data ?? data;
}