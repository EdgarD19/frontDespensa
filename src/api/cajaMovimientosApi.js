import { api } from "./client";

export async function registrarMovimiento(payload) {
  const { data } = await api.post("/api/caja/movimientos", payload);
  return data;
}

export async function getMovimientos({ idCaja, tipo, page, size } = {}) {
  const params = {};
  if (idCaja != null) params.idCaja = idCaja;
  if (tipo) params.tipo = tipo;
  if (page != null) params.page = page;
  if (size != null) params.size = size;
  const { data } = await api.get("/api/caja/movimientos", { params });
  return data;
}
