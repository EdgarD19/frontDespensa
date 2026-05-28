/** Precio de venta numérico (producto por unidad o línea de carrito). */
export function parsePrecioVenta(producto) {
  if (producto?.precioUnitario != null) {
    const u = Number(producto.precioUnitario);
    return Number.isFinite(u) && u >= 0 ? u : 0;
  }
  const raw = producto?.precioVenta ?? producto?.precio ?? "";
  const n = parseFloat(String(raw).replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Stock entero disponible. Vacío o inválido → 0. */
export function parseStockDisponible(producto) {
  const raw = producto?.stockDisponible ?? producto?.stockActual;
  if (raw === "" || raw === undefined || raw === null) return 0;
  const n = parseFloat(String(raw).replace(",", "."));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.trunc(n));
}

/** Formato en guaraníes (Paraguay). */
export function formatMoney(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return new Intl.NumberFormat("es-PY", {
    style: "currency",
    currency: "PYG",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(x);
}

/** Valores enviados al backend (`formaPago`). */
export const FORMA_PAGO_EFECTIVO = "EFECTIVO";
export const FORMA_PAGO_TRANSFERENCIA = "TRANSFERENCIA";

export function labelFormaPago(codigo) {
  if (codigo === FORMA_PAGO_TRANSFERENCIA) return "Transferencia";
  return "Efectivo";
}

export function labelCliente(c) {
  if (!c) return "Sin nombre";
  if (c.tipoCliente === "JURIDICA" && c.razonSocial) return c.razonSocial;
  const fn = c.firstName ?? c.name ?? c.first_name ?? "";
  const ln = c.lastName ?? c.last_name ?? "";
  const nombre = `${fn} ${ln}`.trim();
  if (nombre) return nombre;
  const doc = c.documentNumber ?? c.document_number;
  if (doc) return String(doc);
  const id = c.idCliente ?? c.id;
  return id != null ? `Cliente #${id}` : "Cliente";
}

export function numeroFacturaPreview() {
  return `PREV-${Date.now().toString(36).toUpperCase()}`;
}

export function hoyISO() {
  return new Date().toISOString().split("T")[0];
}

export function esSoloDigitosBarras(s) {
  const t = String(s || "").trim();
  return /^\d{8,14}$/.test(t);
}
