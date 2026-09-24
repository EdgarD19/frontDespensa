export const money = (n) => Math.round(n).toLocaleString("es-PY", { maximumFractionDigits: 0 });

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

export function stepCant(prod) {
  return esKG(prod) ? "0.001" : "1";
}

export function parseCant(val, prod) {
  const n = parseFloat(String(val).replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return esKG(prod) ? 0.001 : 1;
  return esKG(prod) ? Math.round(n * 1000) / 1000 : Math.floor(n);
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
    return { tipo: "vencido", msg: `El timbrado venció el ${venc}. No se puede registrar la compra con este timbrado.` };
  }
  if (inicio && fe && fe < inicio) {
    return { tipo: "noIniciado", msg: `El timbrado aún no está vigente (inicia el ${inicio}).` };
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
    "w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-white " +
    "placeholder:text-white/30 outline-none transition-colors duration-150 focus:border-[#22c55e]/50",
  fieldMono:
    "w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm font-mono text-white " +
    "placeholder:text-white/30 outline-none transition-colors duration-150 focus:border-[#22c55e]/50",
  eyebrow: "text-[0.625rem] font-medium uppercase tracking-[0.12em] text-[#5a5a6e]",
  dropdown:
    "absolute z-20 mt-0.5 w-full bg-[#17171c] border border-white/10 rounded-lg max-h-40 overflow-y-auto shadow-lg",
  dropdownItem: "w-full text-left px-2.5 py-1.5 text-sm text-white transition-colors duration-150 hover:bg-white/5",
};