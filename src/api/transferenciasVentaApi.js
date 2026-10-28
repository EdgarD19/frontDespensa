// Transferencias de venta — contrato 27-10-26 (puede no estar desplegado aún
// en el back corriendo; los consumidores deben tratar los errores como best-effort).
import { api } from "./client";

const BASE = "/api/transferencias-venta";

/** POST /api/transferencias-venta — registra la transferencia de una venta. */
export async function crearTransferenciaVenta(payload) {
  const { data } = await api.post(BASE, payload);
  return data?.data ?? data;
}

/** GET /api/transferencias-venta — listado paginado. */
export async function getTransferenciasVenta({ page = 0, pageSize = 50, sortDir = "DESC" } = {}) {
  const { data } = await api.get(BASE, {
    params: { page, size: pageSize, sortDirection: sortDir },
  });
  const body = data?.data ?? data ?? {};
  return {
    content: Array.isArray(body.content) ? body.content : [],
    totalElements: body.totalElements ?? 0,
  };
}

/** GET /api/transferencias-venta/{id} */
export async function getTransferenciaVentaById(id) {
  const { data } = await api.get(`${BASE}/${id}`);
  return data?.data ?? data;
}

/** GET /api/transferencias-venta/buscar?termino= */
export async function buscarTransferenciasVenta(termino) {
  const { data } = await api.get(`${BASE}/buscar`, { params: { termino } });
  const body = data?.data ?? data ?? {};
  return Array.isArray(body.content) ? body.content : [];
}

/** GET /api/transferencias-venta/estado/{estado} */
export async function getTransferenciasPorEstado(estado) {
  const { data } = await api.get(`${BASE}/estado/${estado}`);
  const body = data?.data ?? data ?? {};
  return Array.isArray(body.content) ? body.content : [];
}

/** GET /api/transferencias-venta/factura/{idFacturaVenta} */
export async function getTransferenciasPorFactura(idFacturaVenta) {
  const { data } = await api.get(`${BASE}/factura/${idFacturaVenta}`);
  const body = data?.data ?? data ?? {};
  return Array.isArray(body) ? body : (body.content ?? []);
}

/** PATCH /api/transferencias-venta/{id}/recibir — el back lo implementa con PATCH
 *  (el contrato decía POST; verificado en vivo: 405 con POST). */
export async function recibirTransferenciaVenta(id) {
  const { data } = await api.patch(`${BASE}/${id}/recibir`);
  return data?.data ?? data;
}

/** PATCH /api/transferencias-venta/{id}/descartar */
export async function descartarTransferenciaVenta(id) {
  const { data } = await api.patch(`${BASE}/${id}/descartar`);
  return data?.data ?? data;
}
