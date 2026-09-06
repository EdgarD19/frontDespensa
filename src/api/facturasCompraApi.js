import { api } from "./client";
import { apiErrorMessage } from "./errors";

export { apiErrorMessage };

const BASE = "/api/facturas-compra";
const TIMBRADOS = "/api/timbrados";

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

/** Timbrados de un proveedor (paginado). */
export async function getTimbradosProveedor(idProveedor, { page = 0, pageSize = 50 } = {}) {
  const { data } = await api.get(`${TIMBRADOS}/proveedor/${idProveedor}`, {
    params: { page, size: pageSize, sortBy: "fechaInicio", sortDirection: "desc" },
  });
  const pageData = unwrap(data);
  // Los vigentes primero; el resto ordenado por vencimiento desc.
  const list = [...pageData.content];
  list.sort((a, b) => {
    if (!!a.esVigente !== !!b.esVigente) return a.esVigente ? -1 : 1;
    return String(a.numeroTimbrado || "").localeCompare(String(b.numeroTimbrado || ""));
  });
  return { ...pageData, content: list };
}

/** Crear factura de compra con el nuevo contrato (idTimbrado + IVA calculado por backend). */
export async function crearFacturaCompra(payload) {
  const { data } = await api.post(BASE, payload);
  return data;
}

/** Devuelve true si ya existe una factura de compra con ese número (200 = existe). */
export async function facturaCompraNumeroExiste(numeroFactura) {
  try {
    await api.get(`${BASE}/numero/${encodeURIComponent(numeroFactura)}`);
    return true;
  } catch {
    return false;
  }
}

/** Crear timbrado de un proveedor. */
export async function crearTimbrado(payload) {
  const { data } = await api.post(TIMBRADOS, payload);
  return data;
}

/** Actualizar timbrado. */
export async function actualizarTimbrado(id, payload) {
  const { data } = await api.put(`${TIMBRADOS}/${id}`, payload);
  return data;
}

/** Activar (true) o desactivar (false) un timbrado. */
export async function toggleActivoTimbrado(id, activo) {
  const action = activo === true ? "activar" : "desactivar";
  const { data } = await api.patch(`${TIMBRADOS}/${id}/${action}`);
  return data;
}
