// Transferencias de venta — API implementada por el back.
// Los consumidores tratan los errores como best-effort: si el registro de una
// transferencia falla, la venta no debe quedar bloqueada.
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

/**
 * GET /api/transferencias-venta/estado/{estado}
 * Recorre todas las páginas del endpoint (el back devuelve 10 filas por
 * defecto) para que el badge y el modal no queden truncados.
 */
export async function getTransferenciasPorEstado(estado, { pageSize = 100, maxPaginas = 50 } = {}) {
  const todas = [];
  for (let page = 0; page < maxPaginas; page++) {
    const { data } = await api.get(`${BASE}/estado/${estado}`, { params: { page, size: pageSize } });
    const body = data?.data ?? data ?? {};
    const content = Array.isArray(body.content) ? body.content : [];
    todas.push(...content);
    if (content.length < pageSize) break;
    const total = Number(body.totalElements);
    if (Number.isFinite(total) && total > 0 && (page + 1) * pageSize >= total) break;
  }
  return todas;
}

/** GET /api/transferencias-venta/factura/{idFacturaVenta} */
export async function getTransferenciasPorFactura(idFacturaVenta) {
  const { data } = await api.get(`${BASE}/factura/${idFacturaVenta}`);
  const body = data?.data ?? data ?? {};
  return Array.isArray(body) ? body : (body.content ?? []);
}

/**
 * Mapa `idFacturaVenta → { monto, estado }` de la transferencia de cada venta,
 * para derivar la forma de pago en el historial (el listado de facturas de
 * venta no la devuelve).
 *
 * Se recorre el listado paginado porque el back no permite pedir varias
 * facturas juntas y `/factura/{id}` responde 500 (no 404) cuando la venta no
 * tiene transferencia.
 *
 * Estados: RECIBIDO es pago confirmado; PENDIENTE es cobro en curso (la
 * venta muestra Transferencia/Mixto con la marca "pendiente de cobro");
 * DESCARTADO no fue pago real (la venta queda EFECTIVO). Si no se puede leer
 * el listado completo, lanza error para que el consumidor muestre "—" en
 * lugar de inventar.
 */
export async function getMontosTransferenciaPorFactura({ pageSize = 200, maxPaginas = 25 } = {}) {
  const mapa = {};
  for (let page = 0; page < maxPaginas; page++) {
    const { content, totalElements } = await getTransferenciasVenta({ page, pageSize });
    for (const t of content) {
      // PENDIENTE = cobro en curso (se muestra con marca); DESCARTADO no fue pago.
      const estado = String(t?.estado || "").toUpperCase();
      if (estado !== "RECIBIDO" && estado !== "PENDIENTE") continue;
      const id = t?.idFacturaVenta ?? t?.facturaVenta?.idFacturaVenta;
      const monto = Number(t?.monto);
      if (id == null || !Number.isFinite(monto)) continue;
      mapa[id] = { monto, estado };
    }
    const total = Number(totalElements);
    if (content.length < pageSize) return mapa;
    if (Number.isFinite(total) && total > 0 && (page + 1) * pageSize >= total) return mapa;
  }
  throw new Error("No se pudieron leer todas las transferencias de venta");
}

/** PATCH /api/transferencias-venta/{id}/recibir (el back solo acepta PATCH). */
export async function recibirTransferenciaVenta(id) {
  const { data } = await api.patch(`${BASE}/${id}/recibir`);
  return data?.data ?? data;
}

/** PATCH /api/transferencias-venta/{id}/descartar */
export async function descartarTransferenciaVenta(id) {
  const { data } = await api.patch(`${BASE}/${id}/descartar`);
  return data?.data ?? data;
}
