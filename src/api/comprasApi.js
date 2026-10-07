import { api } from "./client";
import { apiErrorMessage } from "./errors";

export { apiErrorMessage };

/** Crear un pedido pendiente. */
export async function crearPedido(payload) {
  const { data } = await api.post("/api/pedidos", payload);
  return data;
}

/** Modificar un pedido pendiente (agregar/quitar/cambiar cantidades). */
export async function modificarPedido(id, payload) {
  const { data } = await api.put(`/api/pedidos/${id}`, payload);
  return data;
}

/** Cancelar un pedido pendiente (sin tocar stock). */
export async function cancelarPedido(id) {
  const { data } = await api.patch(`/api/pedidos/${id}/cancelar`);
  return data;
}

/** Listar pedidos (paginado, filtro por estado → /api/pedidos/estado/{estado}). */
export async function getPedidos({ estado, page = 0, pageSize = 20 } = {}) {
  const path = estado
    ? `/api/pedidos/estado/${encodeURIComponent(String(estado).toUpperCase())}`
    : "/api/pedidos";
  const { data } = await api.get(path, {
    params: { page, size: pageSize, sortBy: "fechaCreacion", sortDirection: "desc" },
  });
  const pageData = data?.data ?? data ?? {};
  const content = Array.isArray(pageData.content) ? pageData.content : [];
  return {
    content,
    totalElements: pageData.totalElements ?? content.length,
    totalPages: pageData.totalPages ?? 0,
    page: pageData.page ?? 0,
    size: pageData.size ?? 0,
  };
}

/** Obtener un pedido con sus detalles. */
export async function getPedido(id) {
  const { data } = await api.get(`/api/pedidos/${id}`);
  return data?.data ?? data;
}

/** Obtener pedido precargado para recibir y generar la factura de compra. */
export async function getPedidoParaRecibir(id) {
  const { data } = await api.get(`/api/pedidos/${id}/para-recibir`);
  return data?.data ?? data;
}