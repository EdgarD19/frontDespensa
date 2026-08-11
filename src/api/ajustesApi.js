import { api } from "./client";

/** Normaliza una fila de movimiento de inventario (snake_case / camelCase / aliases). */
export function normalizeMovimiento(row) {
  if (!row) return null;
  return {
    id: row.id,
    idProducto: row.idProducto ?? row.id_producto ?? row.productoId,
    producto: row.producto ?? row.nombreProducto ?? row.nombre_producto ?? "",
    tipoMovimiento: row.tipoMovimiento ?? row.tipo_movimiento ?? "",
    clasificacion: row.clasificacion ?? "",
    cantidad: row.cantidad != null ? Number(row.cantidad) : null,
    fecha: row.fecha ?? "",
    referencia: row.referencia ?? "",
    estado: row.estado ?? "ACTIVO",
  };
}

/**
 * GET historial de movimientos de stock (paginado).
 * Si el endpoint falla, devuelve lista vacía sin bloquear el módulo.
 */
export async function getMovimientosStock(params = {}) {
  try {
    const { data } = await api.get("/api/movimientos-inventario", {
      params: {
        page: params.page ?? 0,
        pageSize: params.pageSize ?? 50,
        search: params.search || undefined,
        fechaInicio: params.fechaInicio || undefined,
        fechaFin: params.fechaFin || undefined,
        sortBy: params.sortBy || undefined,
        sortDir: params.sortDir || undefined,
      },
    });
    const raw = data?.content ?? data ?? [];
    const list = Array.isArray(raw) ? raw : [];
    return {
      content: list.map(normalizeMovimiento).filter(Boolean),
      total: data?.totalElements ?? list.length,
    };
  } catch {
    return { content: [], total: 0 };
  }
}

/**
 * POST registrar movimiento de stock.
 * Payload esperado por el backend: producto_id, tipo_movimiento_id, cantidad, clasificacion, referencia.
 */
export async function registrarMovimiento(payload) {
  const { data } = await api.post("/api/movimientos-inventario", payload);
  return normalizeMovimiento(data);
}

/** GET tipos de movimiento (ENTRADA / SALIDA / AJUSTE) desde el backend. */
export async function getTiposMovimiento() {
  try {
    const { data } = await api.get("/api/tipo-movimientos-inventario");
    if (!Array.isArray(data)) return [];
    return data.map((t) => ({
      id: t.idMovimiento ?? t.id,
      nombre: t.nombre ?? "",
      descripcion: t.descripcion ?? t.description ?? "",
    }));
  } catch {
    return [];
  }
}
