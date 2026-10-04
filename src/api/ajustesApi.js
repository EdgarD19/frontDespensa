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

/** Normaliza una respuesta de ajuste de inventario (crear/completar/listado). */
export function normalizeAjuste(a) {
  if (!a) return null;
  return {
    idAjuste: a.idAjuste ?? a.id ?? null,
    numeroInforme: a.numeroInforme ?? "",
    estado: a.estado ?? "",
    motivo: a.motivo ?? "",
    motivoDescripcion: a.motivoDescripcion ?? "",
    observaciones: a.observaciones ?? "",
    cantidadItems: a.cantidadItems ?? 0,
    fechaCreacion: a.fechaCreacion ?? "",
    fechaConfirmacion: a.fechaConfirmacion ?? "",
    detalles: Array.isArray(a.detalles) ? a.detalles : [],
  };
}

/**
 * GET listado de ajustes de inventario desde el backend (fuente de verdad).
 * Recorre todas las páginas; devuelve lista vacía si el back no responde.
 */
export async function getAjustes(pageSize = 500) {
  try {
    const all = [];
    let page = 0;
    let totalPages = 1;
    let content = [];
    do {
      const { data } = await api.get("/api/ajuste-inventario", {
        params: {
          page,
          size: pageSize,
          sortBy: "fechaCreacion",
          sortDirection: "desc",
        },
      });
      const wrapper = data?.data ?? data;
      content = Array.isArray(wrapper?.content)
        ? wrapper.content
        : Array.isArray(data)
          ? data
          : [];
      all.push(...content);
      totalPages = wrapper?.totalPages ?? 1;
      page++;
    } while (page < totalPages && content.length > 0 && all.length < 10000);
    return all;
  } catch {
    return [];
  }
}

/**
 * POST crear ajuste de inventario (borrador con la lista de productos).
 * AjusteCrearRequest: { idProductos: number[], observaciones?: string }
 */
export async function crearAjuste({ idProductos, motivo, observaciones } = {}) {
  const { data } = await api.post("/api/ajuste-inventario", {
    idProductos,
    motivo,
    observaciones: observaciones || undefined,
  });
  return normalizeAjuste(data);
}

/**
 * POST completar ajuste con conteo físico y motivo.
 * AjusteCompletarRequest: { motivo, observaciones?, detalles: [{ idProducto, stockFisico }] }
 */
export async function completarAjuste(
  idAjuste,
  { motivo, observaciones, detalles } = {}
) {
  const { data } = await api.post(`/api/ajuste-inventario/${idAjuste}/completar`, {
    motivo,
    observaciones: observaciones || undefined,
    detalles,
  });
  return normalizeAjuste(data);
}

/**
 * PATCH desactivar ajuste (solo en estado BORRADOR/pendiente; un CONFIRMADO es inmutable).
 */
export async function desactivarAjuste(idAjuste) {
  const { data } = await api.patch(`/api/ajuste-inventario/${idAjuste}/desactivar`);
  return normalizeAjuste(data);
}
