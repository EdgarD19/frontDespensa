import { api } from "./client";

/** Normaliza una respuesta de ajuste de inventario (crear/completar/listado). */
function normalizeAjuste(a) {
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
    // El back informa el flag `activo` en el listado.
    activo: a.activo,
    detalles: Array.isArray(a.detalles) ? a.detalles : [],
  };
}

/**
 * GET listado de ajustes de inventario desde el backend (fuente de verdad).
 * Recorre todas las páginas. Los errores se propagan para que la pantalla
 * distinga "no hay listas" de "falló la carga".
 *
 * opts.activo: true = solo activos, false = solo desactivados, undefined =
 * solo activos (el back omite el parámetro y aplica su default).
 */
export async function getAjustes(pageSize = 500, { activo } = {}) {
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
        activo,
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
