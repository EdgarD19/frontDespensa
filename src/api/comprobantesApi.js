// Configuración de comprobantes (Datos DNIT) — persistencia local en el front.
// El backend aún no expone endpoints de ventas ni de configuración de comprobantes,
// por eso se guarda en localStorage. Cuando exista el endpoint, es reemplazar estas
// funciones por llamadas a la API (misma firma).

const KEY = "despensa_comprobantes_v1";

export function pad3(n) {
  return String(Math.max(0, Math.trunc(Number(n) || 0))).padStart(3, "0");
}

export function pad6(n) {
  return String(Math.max(0, Math.trunc(Number(n) || 0))).padStart(6, "0");
}

export function nuevoId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function getComprobantes() {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function persistComprobantes(list) {
  localStorage.setItem(KEY, JSON.stringify(list || []));
}

export function numeroCompleto(c, num) {
  return `${pad3(c.establecimiento)}-${pad3(c.puntoExpedicion)}-${pad6(num)}`;
}

export function rangoDisplay(c) {
  return `${pad6(c.numeroDesde)} – ${pad6(c.numeroHasta)}`;
}

export function proximoNumero(c) {
  const desde = Math.trunc(Number(c.numeroDesde)) || 1;
  const ultimo = Math.trunc(Number(c.ultimoEmitido)) || 0;
  return Math.max(ultimo + 1, desde);
}

// Estado de un timbrado respecto a la fecha de hoy.
export function estadoComprobante(c, hoy) {
  const dia = hoy || new Date().toISOString().split("T")[0];
  if (!c) return { estado: "sin_configuracion", label: "Sin configuración" };
  if (dia > c.fechaVencimiento)
    return { estado: "vencido", label: `Vencido ${c.fechaVencimiento}` };
  if (dia < c.fechaInicio)
    return { estado: "sin_iniciar", label: `Vigente desde ${c.fechaInicio}` };
  if (proximoNumero(c) > Math.trunc(Number(c.numeroHasta)))
    return { estado: "agotado", label: "Rango agotado" };
  return { estado: "vigente", label: "Vigente" };
}

// El timbrado que corresponde usar: los marcados como activos primero,
// y entre ellos el vigente para la fecha actual (con números disponibles).
export function seleccionarComprobante(hoy) {
  const list = getComprobantes();
  if (!list.length) {
    return {
      comprobante: null,
      estado: "sin_configuracion",
      motivo: "Todavía no se configuró ningún timbrado.",
    };
  }
  const actives = list.filter((c) => c.activo);
  const pool = actives.length ? actives : list;
  const dia = hoy || new Date().toISOString().split("T")[0];

  for (const c of pool) {
    const st = estadoComprobante(c, dia);
    if (st.estado === "vigente") return { comprobante: c, estado: "vigente", motivo: null };
  }

  const c = pool[0];
  const st = estadoComprobante(c, dia);
  const motivo =
    st.estado === "vencido"
      ? `El timbrado ${c.numeroTimbrado} venció el ${c.fechaVencimiento}.`
      : st.estado === "sin_iniciar"
        ? `El timbrado ${c.numeroTimbrado} aún no está vigente (desde ${c.fechaInicio}).`
        : `El timbrado ${c.numeroTimbrado} alcanzó el límite del rango autorizado (${rangoDisplay(c)}).`;
  return { comprobante: null, estado: st.estado, motivo };
}

// Consume el siguiente número del timbrado indicado y lo persiste.
export function emitirYConsumir(id) {
  const list = getComprobantes();
  const idx = list.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  const c = list[idx];
  const n = proximoNumero(c);
  if (n > Math.trunc(Number(c.numeroHasta))) return null; // agotado
  const next = { ...c, ultimoEmitido: n };
  list[idx] = next;
  persistComprobantes(list);
  return { record: next, numero: numeroCompleto(next, n) };
}