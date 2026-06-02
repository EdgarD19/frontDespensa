import { api } from "./client";

export async function crearCompra(payload) {
  const { data } = await api.post("/api/compras", payload);
  return data;
}

export async function getCompras(params = {}) {
  const { data } = await api.get("/api/compras", {
    params: {
      search: params.search || undefined,
      page: params.page ?? 0,
      size: params.size ?? 20,
    },
  });
  return {
    content: data?.content || [],
    totalPages: data?.totalPages ?? 0,
    totalElements: data?.totalElements ?? 0,
    page: data?.page ?? 0,
  };
}
