import { api } from "./client";

export async function registrarVentaFactura(payload) {
  const { data } = await api.post("/api/ventas/facturas", payload);
  return data;
}
