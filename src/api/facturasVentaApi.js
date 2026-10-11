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

/** Listado paginado de facturas de venta. */
export async function getFacturasVenta({ page = 0, pageSize = 20, sortBy, sortDir = "DESC" } = {}) {
  const { data } = await api.get(BASE, {
    params: { page, size: pageSize, sortBy: sortBy || undefined, sortDir },
  });
  return unwrap(data);
}

/** Búsqueda libre por número de factura / cliente (paginado). */
export async function buscarFacturasVenta(q, { page = 0, pageSize = 20, sortBy, sortDir = "DESC" } = {}) {
  const { data } = await api.get(`${BASE}/buscar`, {
    params: { q: q || undefined, page, size: pageSize, sortBy: sortBy || undefined, sortDir },
  });
  return unwrap(data);
}

/** Facturas de un cliente (paginado). */
export async function getFacturasVentaByCliente(idCliente, { page = 0, pageSize = 20, sortBy, sortDir = "DESC" } = {}) {
  const { data } = await api.get(`${BASE}/cliente/${idCliente}`, {
    params: { page, size: pageSize, sortBy: sortBy || undefined, sortDir },
  });
  return unwrap(data);
}

/** Detalle completo de una factura de venta. */
export async function getFacturaVentaById(id) {
  const { data } = await api.get(`${BASE}/${id}`);
  return data?.data ?? data;
}

/** Factura por número (p. ej. "001-001-000001"). */
export async function getFacturaVentaByNumero(numeroFactura) {
  const { data } = await api.get(`${BASE}/numero/${encodeURIComponent(numeroFactura)}`);
  return data?.data ?? data;
}