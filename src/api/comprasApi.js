import { api } from "./client";
import { apiErrorMessage } from "./errors";

export { apiErrorMessage };

export async function crearCompra(payload) {
  const { data } = await api.post("/api/compras", payload);
  return data;
}

/** Órdenes de compra pendientes de recepción. */
export async function getOrdenesPendientes() {
  const { data } = await api.get("/api/compras/ordenes-pendientes");
  return Array.isArray(data) ? data : [];
}

/** Recibe una orden pendiente: la transforma en factura recibida. */
export async function recibirOrden(idOrden, payload = {}) {
  const { data } = await api.post(`/api/compras/recepcion/${idOrden}`, payload);
  return data;
}

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

/** Listar pedidos (paginado, filtro por estado). */
export async function getPedidos(params = {}) {
  const { data } = await api.get("/api/pedidos", {
    params: {
      estado: params.estado || undefined,
      page: params.page ?? 0,
      pageSize: params.pageSize ?? 20,
    },
  });
  return {
    content: data?.content || [],
    totalPages: data?.totalPages ?? 0,
    totalElements: data?.totalElements ?? 0,
    page: data?.page ?? 0,
  };
}

/** Obtener un pedido con sus detalles. */
export async function getPedido(id) {
  const { data } = await api.get(`/api/pedidos/${id}`);
  return data;
}

/** Listar empleados (selector). */
export async function getEmpleados() {
  const { data } = await api.get("/api/v1/empleados");
  return Array.isArray(data) ? data : [];
}

export async function getCompras(params = {}) {
  const { data } = await api.get("/api/compras", {
    params: {
      search: params.search || undefined,
      page: params.page ?? 0,
      pageSize: params.pageSize ?? 20,
    },
  });
  return {
    content: data?.content || [],
    totalPages: data?.totalPages ?? 0,
    totalElements: data?.totalElements ?? 0,
    page: data?.page ?? 0,
  };
}