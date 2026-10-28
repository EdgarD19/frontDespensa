// Configuración de comprobantes de venta — datos que el back TODAVÍA no soporta.
//
// El back (/api/timbrados-venta) persiste: numeroTimbrado, fechaInicio,
// fechaVencimiento y activo. Establecimiento, punto de expedición y rango de
// numeración no tienen endpoint, así que por el momento se guardan acá
// (localStorage), asociados al id del timbrado. Cuando el back los exponga,
// se migran y este módulo queda solo con los helpers de formato/estado.

const KEY = "despensa_timbrados_venta_extras_v1";

export const EXTRAS_DEFAULT = {
  establecimiento: "001",
  puntoExpedicion: "001",
  numeroDesde: 1,
  numeroHasta: null,
  ultimoEmitido: 0,
};

export function pad3(n) {
  return String(Math.max(0, Math.trunc(Number(n) || 0))).padStart(3, "0");
}

function pad6(n) {
  return String(Math.max(0, Math.trunc(Number(n) || 0))).padStart(6, "0");
}

export function getExtrasLocal() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

export function guardarExtrasLocal(id, extras) {
  if (id == null) return;
  const all = getExtrasLocal();
  const clave = String(id);
  all[clave] = { ...EXTRAS_DEFAULT, ...all[clave], ...extras };
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function eliminarExtrasLocal(id) {
  if (id == null) return;
  const all = getExtrasLocal();
  delete all[String(id)];
  localStorage.setItem(KEY, JSON.stringify(all));
}

// "Eliminados": el back hace SOFT DELETE y no distingue eliminado de inactivo,
// así que los ids dados de baja se recuerdan acá para ocultarlos de la lista.
const KEY_ELIMINADOS = "despensa_timbrados_venta_eliminados_v1";

export function getEliminadosLocal() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY_ELIMINADOS) || "[]");
    return Array.isArray(raw) ? raw.map(String) : [];
  } catch {
    return [];
  }
}

export function marcarEliminadoLocal(id) {
  if (id == null) return;
  const all = getEliminadosLocal();
  if (!all.includes(String(id))) {
    all.push(String(id));
    localStorage.setItem(KEY_ELIMINADOS, JSON.stringify(all));
  }
}

/** Extras locales de un timbrado (con defaults si no hay nada guardado). */
export function extrasDe(id) {
  return { ...EXTRAS_DEFAULT, ...(getExtrasLocal()[String(id)] || {}) };
}

/** Hay rango cargado (el back no lo maneja, es dato local). */
export function tieneRango(c) {
  const desde = Math.trunc(Number(c?.numeroDesde));
  const hasta = Math.trunc(Number(c?.numeroHasta));
  return (
    Number.isFinite(desde) && desde >= 1 &&
    String(c?.numeroHasta ?? "").trim() !== "" &&
    Number.isFinite(hasta) && hasta >= 1
  );
}

export function numeroCompleto(c, num) {
  return `${pad3(c?.establecimiento)}-${pad3(c?.puntoExpedicion)}-${pad6(num)}`;
}

export function rangoDisplay(c) {
  if (!tieneRango(c)) return "—";
  return `${pad6(c.numeroDesde)} → ${pad6(c.numeroHasta)}`;
}

export function proximoNumero(c) {
  const desde = Math.trunc(Number(c?.numeroDesde)) || 1;
  const ultimo = Math.trunc(Number(c?.ultimoEmitido)) || 0;
  return Math.max(ultimo + 1, desde);
}

// Estado de un timbrado: prioriza lo que informa el back (esVigente/estaVencido)
// y usa el rango local solo si está cargado.
const fmtDiaEs = (iso) => {
  const s = String(iso ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(`${s}T12:00:00`);
  if (Number.isNaN(d.getTime())) return s;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

// Reemplaza las fechas ISO dentro de un texto (mensajes del back) por DD/MM/AAAA.
export function fechasIsoAEs(texto) {
  return String(texto ?? "").replace(/\d{4}-\d{2}-\d{2}/g, (m) => fmtDiaEs(m));
}

export function estadoComprobante(c, hoy) {
  // "Hoy" en hora LOCAL: con toISOString() (UTC) en UTC-3 el día se corre.
  const ahora = new Date();
  const dia = hoy || `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`;
  if (!c) return { estado: "sin_configuracion", label: "Sin configuración" };
  if (c.estaVencido || (c.fechaVencimiento && dia > c.fechaVencimiento))
    return { estado: "vencido", label: `Vencido el ${fmtDiaEs(c.fechaVencimiento)}` };
  if (c.fechaInicio && dia < c.fechaInicio)
    return { estado: "sin_iniciar", label: `Vigente desde el ${fmtDiaEs(c.fechaInicio)}` };
  if (c.activo === false)
    return { estado: "inactivo", label: "Inactivo" };
  if (tieneRango(c) && proximoNumero(c) > Math.trunc(Number(c.numeroHasta)))
    return { estado: "agotado", label: "Rango agotado" };
  return { estado: "vigente", label: "Vigente" };
}
