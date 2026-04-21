import { api } from "./client";

/** Normaliza una fila de ajuste (snake_case / camelCase / aliases). */
export function normalizeAjuste(row) {
  if (!row) return null;
  const stockAnt = row.stockAnterior ?? row.stock_anterior;
  const stockNuevo = row.nuevoStock ?? row.nuevo_stock;
  let diff = row.diferencia;
  if (diff == null && stockAnt != null && stockNuevo != null) {
    diff = Number(stockNuevo) - Number(stockAnt);
  }
  return {
    id: row.id,
    idProducto: row.idProducto ?? row.id_producto,
    nombreProducto:
      row.nombreProducto ??
      row.nombre_producto ??
      row.productName ??
      row.product_name ??
      "",
    tipoAjuste: row.tipoAjuste ?? row.tipo_ajuste ?? "",
    fechaAjuste: row.fechaAjuste ?? row.fecha_ajuste ?? "",
    stockAnterior: stockAnt,
    nuevoStock: stockNuevo,
    diferencia: diff,
    justificacion: row.justificacion ?? "",
    detalleOtro: row.detalleOtro ?? row.detalle_otro ?? "",
    autorizadoPor: row.autorizadoPor ?? row.autorizado_por ?? "",
    estado: String(row.estado ?? row.status ?? "PENDIENTE_DE_AUTORIZACION").toUpperCase(),
  };
}

/**
 * GET historial de ajustes (paginado).
 * Si el endpoint aún no existe en el backend, devuelve lista vacía sin bloquear el módulo.
 */
export async function getHistorialAjustes(params = {}) {
  try {
    const { data } = await api.get("/api/inventario/ajustes", {
      params: {
        page: params.page ?? 0,
        pageSize: params.pageSize ?? 50,
      },
    });
    const raw = data?.content ?? data ?? [];
    const list = Array.isArray(raw) ? raw : [];
    return { content: list.map(normalizeAjuste).filter(Boolean) };
  } catch {
    return { content: [] };
  }
}

/**
 * POST nueva solicitud de ajuste (queda pendiente hasta autorización en backend).
 */
export async function crearAjuste(payload) {
  const { data } = await api.post("/api/inventario/ajustes", payload);
  return normalizeAjuste(data);
}

/**
 * PATCH autorizar ajuste: el backend debe aplicar el stock al confirmar.
 */
export async function autorizarAjuste(id) {
  const { data } = await api.patch(`/api/inventario/ajustes/${id}/autorizar`, {});
  return normalizeAjuste(data);
}
