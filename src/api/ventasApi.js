import { api } from "./client";

/**
 * Registro de venta / factura (productos por unidad).
 *
 * Si el endpoint aún no existe en Spring, el POST fallará hasta que el backend lo exponga.
 * Posibles rutas a convencionar: `/api/ventas/facturas`, `/api/facturas`, `/api/ventas`.
 *
 * Backend a implementar en Spring (contrato orientativo):
 *
 * POST /api/ventas/facturas
 *   Alternativas de path (ajustar según el proyecto): /api/facturas, /api/ventas
 *
 * Request body (JSON):
 * {
 *   "fechaFactura": "2026-04-21",           // fecha del día (Argentina)
 *   "tipoFactura": "CONTADO",
 *   "estado": "PENDIENTE",                  // se cierra en corte de caja
 *   "idCliente": null | number,
 *   "etiquetaCliente": "Sin nombre" | string,
 *   "lineas": [
 *     { "idProducto": 1, "cantidad": 2, "precioUnitario": 150.5, "subtotal": 301 }
 *   ],
 *   "total": 301,
 *   "montoPagado": 500,
 *   "cambio": 199,
 *   "formaPago": "EFECTIVO" | "TRANSFERENCIA"
 * }
 *
 * Efectos esperados en el servidor:
 *   - Descontar stock de cada producto vendido.
 *   - Generar número de factura único.
 *   - Registrar movimiento de ingreso en caja (pendiente de cierre).
 *
 * Response (ejemplo):
 *   { "idFactura": 1, "numeroFactura": "A-00001-00001234", ... }
 */
export async function registrarVentaFactura(payload) {
  const { data } = await api.post("/api/ventas/facturas", payload);
  return data;
}
