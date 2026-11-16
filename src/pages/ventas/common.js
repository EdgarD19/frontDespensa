// Helpers compartidos del módulo de ventas.
//
// Paraguay es UTC-3 y `new Date("2026-10-11")` (sin hora) se interpreta como
// UTC: en pantallas de fecha el día retrocedía. Toda fecha "solo fecha"
// (yyyy-MM-dd) se parsea con hora local para conservar el día del string.

const NULO = "—";

/** True si la factura aparece anulada según los datos del back. */
export function esAnulada(f) {
  const raw = String(f?.estado || "").toUpperCase();
  return raw === "ANULADO" || raw === "ANULADA" || raw === "CANCELADA" || f?.activo === false;
}

/** Parsea "yyyy-MM-dd" (o cualquier ISO) a Date LOCAL. Invalid → null. */
export function parseFechaLocal(valor) {
  const s = String(valor ?? "");
  if (!s) return null;
  const soloFecha = /^\d{4}-\d{2}-\d{2}$/.test(s);
  const d = soloFecha ? new Date(`${s}T12:00:00`) : new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Fecha YYYY-MM-DD desde un ISO (first slice), "" si vacío. */
export function diaISO(valor) {
  return String(valor ?? "").slice(0, 10);
}

/**
 * Fecha DD/MM/AAAA (o con hora si el ISO la trae).
 * Devuelve el string original si no se puede parsear.
 */
export function fmtFecha(valor) {
  if (!valor) return NULO;
  const s = String(valor);
  const d = parseFechaLocal(s);
  if (!d) return s;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return d.toLocaleDateString("es-PY", { day: "2-digit", month: "2-digit", year: "numeric" });
  }
  return d.toLocaleString("es-PY", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

/** Gs. sin decimales — formato ÚNICO del proyecto. Nota: "—" para no numérico. */
const nfGsCommon = new Intl.NumberFormat("es-PY", { maximumFractionDigits: 0 });
export function fmtMoneda(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return NULO;
  return `${v < 0 ? "-" : ""}Gs. ${nfGsCommon.format(Math.abs(Math.round(v)))}`;
}

/* ── Forma de pago ──────────────────────────────────────────────────────── */

/** Opciones de forma de pago de una venta (las mismas que imprime el ticket). */
export const FORMAS_PAGO_VENTA = [
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "MIXTO", label: "Mixto" },
];

/** Etiqueta visible de una forma de pago; null si el valor no se reconoce. */
export function labelFormaPagoVenta(valor) {
  const v = String(valor ?? "").toUpperCase();
  if (v === "EFECTIVO") return "Efectivo";
  if (v === "TRANSFERENCIA") return "Transferencia";
  if (v === "MIXTO") return "Mixto";
  return null;
}

/**
 * Forma de pago derivada de la transferencia, con la MISMA regla que
 * `FacturaVentaService.obtenerTicket` del back:
 *   - sin transferencia (o monto 0) → "EFECTIVO"
 *   - monto transferido >= total     → "TRANSFERENCIA"
 *   - monto transferido <  total     → "MIXTO"
 * El listado de facturas de venta no devuelve la forma de pago, por eso se
 * deriva acá a partir del monto transferido.
 */
export function formaPagoVenta(total, montoTransferencia) {
  const monto = Number(montoTransferencia);
  if (!Number.isFinite(monto) || monto <= 0) return "EFECTIVO";
  return monto < Number(total) ? "MIXTO" : "TRANSFERENCIA";
}
