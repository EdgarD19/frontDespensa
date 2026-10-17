import { api } from "./client";
import { apiErrorMessage } from "./errors";

export { apiErrorMessage };

const ANULACIONES = "/api/anulaciones-venta";
const INTERCAMBIOS = "/api/intercambios-venta";

// Normaliza Page (Spring) o PageWrapper ({data}) a un objeto plano.
function unwrapPage(body) {
  const page = body?.data ?? body ?? {};
  const content = Array.isArray(page.content) ? page.content : [];
  return {
    content,
    totalElements: page.totalElements ?? content.length,
    totalPages: page.totalPages ?? 0,
    page: page.number ?? page.page ?? 0,
    size: page.size ?? 0,
  };
}

function unwrapSingle(body) {
  return body?.data ?? body;
}

/* ─────────────────────────── Anulaciones de venta ─────────────────────────── */

/**
 * POST /api/anulaciones-venta — anula una factura de venta completa.
 * El backend valida factura vigente / no anulada / dentro del límite de días
 * (despensa.anulacion.dias-permitidos, default 15) y revierte el stock.
 * payload:    { idFacturaVenta, motivo? }
 * respuesta:  AnulacionFacturaVentaResponse { idAnulacion, numeroFactura,
 *             numeroTimbrado, clienteNombre, totalGeneral, fechaAnulacion, ... }
 */
export async function anularFacturaVenta(payload) {
  const { data } = await api.post(ANULACIONES, payload);
  return unwrapSingle(data);
}

/** GET /api/anulaciones-venta?page&size&sortBy&sortDirection — históricas (vigentes). */
export async function getAnulacionesVenta({ page = 0, pageSize = 20, sortBy, sortDir = "DESC" } = {}) {
  const { data } = await api.get(ANULACIONES, {
    params: { page, size: pageSize, sortBy: sortBy || undefined, sortDirection: sortDir },
  });
  return unwrapPage(data);
}

/* ─────────────────────────── Intercambios de venta ─────────────────────────── */

/**
 * POST /api/intercambios-venta — intercambio por defecto/merma (inmediato).
 * El backend genera el número INT-yyyyMMdd-0001, descuenta stock del reemplazo
 * y NO devuelve al inventario el producto defectuoso.
 * payload:    { idCliente?, motivo: "DEFECTUOSO"|"MERMA"|"OTROS", observaciones?,
 *              detalles: [{ idProductoDefectuoso?, idProductoReemplazo, cantidad, precioUnitario? }] }
 * respuesta:  IntercambioVentaResponse { idIntercambioVenta, numeroIntercambio, ... detalles }
 */
export async function crearIntercambioVenta(payload) {
  const { data } = await api.post(INTERCAMBIOS, payload);
  return unwrapSingle(data);
}

/** GET /api/intercambios-venta?page&pageSize&sortBy&sortDir — histórico. */
export async function getIntercambiosVenta({ page = 0, pageSize = 20, sortBy, sortDir = "DESC" } = {}) {
  const { data } = await api.get(INTERCAMBIOS, {
    params: { page, size: pageSize, sortBy: sortBy || undefined, sortDir },
  });
  return unwrapPage(data);
}