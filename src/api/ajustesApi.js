import { api } from "./client";

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
    return { content: data?.content ?? [] };
  } catch {
    return { content: [] };
  }
}

/**
 * POST nuevo ajuste de inventario.
 * Ajusta la ruta y el body cuando el contrato del backend esté definido.
 */
export async function crearAjuste(payload) {
  const { data } = await api.post("/api/inventario/ajustes", payload);
  return data;
}
