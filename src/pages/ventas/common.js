// Helpers compartidos del módulo de ventas (antes duplicados en cada pantalla).
//
// Convicción de zona horaria: Paraguay es UTC-3 y `new Date("2026-10-11")`
// (sin hora) se interpreta como UTC → en pantallas de fecha retrocedía un día.
// Toda fecha "solo fecha" (yyyy-MM-dd) se parsea con hora local para que el
// día mostrado sea el del string.

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

/** Gs. sin decimales — formato ÚNICO del proyecto (misma salida que utils/money). */
export function fmtMoneda(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return NULO;
  const abs = Math.abs(Math.round(v)).toLocaleString("es-PY", { maximumFractionDigits: 0 });
  return `${v < 0 ? "-" : ""}Gs. ${abs}`;
}
