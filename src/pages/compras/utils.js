import { baseImponibleUnitaria, r2 } from "../../utils/iva";

// Formatter único y cacheado: construir Intl.NumberFormat en cada llamada es
// caro y esto se ejecuta por fila en tablas densas (regla js-cache-function-results).
const nfGs = new Intl.NumberFormat("es-PY", { maximumFractionDigits: 0 });
const nfCant = new Intl.NumberFormat("es-PY", { maximumFractionDigits: 2 });

export const CANTIDAD_MINIMA_KG = 0.01;

export const money = (n) => {
  const v = Number(n);
  return Number.isFinite(v) ? `Gs. ${nfGs.format(Math.round(v))}` : "—";
};

/** Cantidad visible con la precisión del back: 2 decimales (0.01). */
export const fmtCant = (n) => {
  const v = Number(n);
  return Number.isFinite(v) ? nfCant.format(v) : "—";
};

export const hoyAsuncion = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "America/Asuncion", year: "numeric", month: "2-digit", day: "2-digit" });

export function formatoFactura(val) {
  const nums = String(val || "").replace(/\D/g, "").slice(0, 13);
  const p1 = nums.slice(0, 3);
  const p2 = nums.slice(3, 6);
  const p3 = nums.slice(6, 13);
  if (nums.length <= 3) return p1;
  if (nums.length <= 6) return `${p1}-${p2}`;
  return `${p1}-${p2}-${p3}`;
}

export function esKG(prod) {
  const u = (prod.unidadMedida || prod.unitAbbreviation || "").toUpperCase();
  return u === "KG" || u === "KILOGRAMO" || u === "KILOGRAMOS";
}

/* Formas de pago de una compra: al proveedor se le paga en efectivo o por
   transferencia (el back las guarda como CONTADO / TRANSFERENCIA). */
export const FORMAS_PAGO_COMPRA = [
  { value: "CONTADO", label: "Efectivo" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
];

/** Etiqueta visible de una forma de pago de compra (tolera datos viejos). */
export function formaPagoLabel(valor) {
  const v = String(valor ?? "").toUpperCase();
  if (v === "CONTADO") return "Efectivo";
  if (v === "TRANSFERENCIA") return "Transferencia";
  if (v === "CREDITO") return "Crédito";
  return valor || "—";
}

/**
 * IVA de una línea de compra, espejo de CalculoIvaUtil.calcularIva:
 * base = round2(baseUnitaria(precioConIva) × cantidad); iva = round2(base × tasa/100).
 */
export function ivaLineaCompra(precioConIva, cantidad, tasaIva) {
  const t = Number(tasaIva);
  if (!Number.isFinite(t) || t <= 0) return 0;
  const base = r2(baseImponibleUnitaria(precioConIva, t) * (Number(cantidad) || 0));
  return r2((base * t) / 100);
}

/** Total de una línea (base + IVA) con el mismo redondeo por línea del back. */
export function totalLineaCompra(precioConIva, cantidad, tasaIva) {
  const p = Number(precioConIva) || 0;
  const c = Number(cantidad) || 0;
  const t = Number(tasaIva);
  if (!Number.isFinite(t) || t <= 0) return r2(p * c);
  const base = r2(baseImponibleUnitaria(p, t) * c);
  return base + ivaLineaCompra(p, c, t);
}

/** "yyyy-MM-dd" → "DD/MM/AAAA" para mensajes visibles; el crudo queda solo para inputs/comparaciones. */
export function fechaEs(iso) {
  const s = String(iso ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s || "—";
  const d = new Date(`${s}T12:00:00`);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("es-PY", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function estadoTimbrado(t, fecha) {
  if (!t) return null;
  if (t.activo === false) {
    return { tipo: "inactivo", msg: "El timbrado está inactivo. No se puede registrar la compra con este timbrado." };
  }
  const fe = String(fecha || "");
  const inicio = String(t.fechaInicio || "");
  const venc = String(t.fechaVencimiento || "");
  if (venc && fe && fe > venc) {
    return { tipo: "vencido", msg: `El timbrado venció el ${fechaEs(venc)}. No se puede registrar la compra con este timbrado.` };
  }
  if (inicio && fe && fe < inicio) {
    return { tipo: "noIniciado", msg: `El timbrado aún no está vigente (inicia el ${fechaEs(inicio)}).` };
  }
  return { tipo: "vigente", msg: null };
}

export function etiquetaTimbrado(tipo) {
  switch (tipo) {
    case "vencido": return "vencido";
    case "inactivo": return "inactivo";
    case "noIniciado": return "no vigente";
    default: return "vigente";
  }
}

export const S = {
  field:
    "w-full bg-white/5 border border-white/10 rounded-none px-2.5 py-1.5 text-sm text-white " +
    "placeholder:text-white/30 outline-none transition-colors duration-150 focus:border-[var(--accent)]",
  fieldMono:
    "w-full bg-white/5 border border-white/10 rounded-none px-2.5 py-1.5 text-sm font-mono text-white " +
    "placeholder:text-white/30 outline-none transition-colors duration-150 focus:border-[var(--accent)]",
  eyebrow: "text-[0.625rem] font-medium uppercase tracking-[0.12em] text-white/40",
  dropdown:
    "absolute z-20 mt-0.5 w-full bg-[#17171c] border border-white/10 rounded-none max-h-40 overflow-y-auto shadow-lg",
  dropdownItem: "w-full text-left px-2.5 py-1.5 text-sm text-white transition-colors duration-150 hover:bg-white/5",
};