import { api } from "./client";

export async function getTicketFacturaVenta(idFacturaVenta) {
  const res = await api.get(`/api/facturas-venta/${idFacturaVenta}/ticket`);
  return res.data;
}
