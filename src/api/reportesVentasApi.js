// Reportes de ventas (contrato + implementación 29-10-26)
import { api } from "./client";

/** GET /api/reportes/ventas/productos?desde&hasta&top — ranking por unidades vendidas
 *  (excluye facturas anuladas). Devuelve [{ idProducto, nombreProducto, unidadesVendidas, importeTotal }]. */
export async function getProductosMasVendidos({ desde, hasta, top = 10 } = {}) {
  const { data } = await api.get("/api/reportes/ventas/productos", {
    params: { desde, hasta, top },
  });
  const lista = data?.data ?? data ?? [];
  return Array.isArray(lista) ? lista : [];
}
