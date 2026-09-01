export function esProductoPesable(producto) {
  return producto?.productoPesable === "si";
}

export function parsePrecioVenta(producto) {
  if (producto?.precioUnitario != null) {
    const u = Number(producto.precioUnitario);
    return Number.isFinite(u) && u >= 0 ? u : 0;
  }
  if (esProductoPesable(producto) && producto.precioPorKg) {
    const n = parseFloat(String(producto.precioPorKg).replace(",", "."));
    if (Number.isFinite(n) && n >= 0) return n;
  }
  const raw = producto?.precioVenta ?? producto?.precio ?? "";
  const n = parseFloat(String(raw).replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function parseStockDisponible(producto) {
  const raw = producto?.stockDisponible ?? producto?.stockActual;
  if (raw === "" || raw === undefined || raw === null) return 0;
  const n = parseFloat(String(raw).replace(",", "."));
  if (!Number.isFinite(n)) return 0;
  if (esProductoPesable(producto)) return Math.max(0, n);
  return Math.max(0, Math.trunc(n));
}

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

/**
 * Parses barcode input with optional quantity prefix.
 * "3*1234567890123" -> { quantity: 3, barcode: "1234567890123" }
 * "*1234567890123"  -> { quantity: 1, barcode: "1234567890123" }
 * "1234567890123"   -> { quantity: 1, barcode: "1234567890123" }
 */
export function parseBarcodeInput(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;

  const starIdx = s.indexOf("*");
  if (starIdx !== -1) {
    const qtyPart = s.substring(0, starIdx);
    const barcode = s.substring(starIdx + 1).trim();
    const quantity = qtyPart === "" ? 1 : parseInt(qtyPart, 10);
    if (barcode && (Number.isFinite(quantity) && quantity > 0)) {
      return { quantity, barcode };
    }
  }

  if (esSoloDigitosBarras(s)) {
    return { quantity: 1, barcode: s };
  }

  return null;
}
