import { api } from "./client";

export async function getIngresos(periodo = "HOY") {
  const res = await api.get("/api/ventas/ingresos", { params: { periodo } });
  return res.data;
}

export async function getProductosMasVendidos(periodo = "HOY") {
  const res = await api.get("/api/ventas/productos-mas-vendidos", { params: { periodo } });
  return res.data;
}
