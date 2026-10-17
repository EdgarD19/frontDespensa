import { api } from "./client";

/**
 * POST /api/facturas-venta — emite una factura de venta.
 *
 * El backend toma el precio vigente de cada producto (con IVA incluido),
 * calcula el IVA según la tasa del producto, descuenta stock y asigna el
 * número de factura junto con el timbrado de venta vigente.
 *
 * payload:   { idCliente?, fechaEmision?, detalles: [{ idProducto, cantidad }] }
 * respuesta: FacturaVentaResponse (directo, sin wrapper) con numeroFactura,
 *            numeroTimbrado, subtotal/iva por tasa, totalGeneral y detalles.
 */
export async function registrarVentaFactura(payload) {
  const { data } = await api.post("/api/facturas-venta", payload);
  return data?.data ?? data;
}
