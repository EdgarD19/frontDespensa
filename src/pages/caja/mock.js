// MOCK del módulo de Caja — el back todavía no expone endpoints de caja.
//
// Los datos viven en localStorage (una sola caja por navegador, sin
// numeración ni arqueos multi-caja). La forma de las funciones imita una API
// async-friendly: cuando exista el back real, se reemplazan por los llamados
// correspondientes sin tocar las pantallas.

const KEY = "despensa_caja_mock_v1";

const hoyISO = () => {
  // Fecha LOCAL yyyy-MM-dd (toISOString() es UTC y después de las ~21:00 en
  // UTC-3 devuelve el día siguiente).
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

function leer() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

function escribir(estado) {
  try {
    localStorage.setItem(KEY, JSON.stringify(estado));
  } catch {
    /* storage bloqueado (modo privado): el módulo degrada a no persistente */
  }
}

/** Sesión de caja actual: null = no abierta. */
export function getSesion() {
  const s = leer().sesion ?? null;
  if (!s || s.estado !== "ABIERTA") return null;
  return s;
}

/** Última sesión cerrada (o null), para mostrar el estado anterior. */
export function getUltimaCerrada() {
  const { sesion } = leer();
  return sesion && sesion.estado === "CERRADA" ? sesion : null;
}

/** Abre la caja del día con el monto inicial contado. */
export function abrirCaja(montoInicial) {
  const monto = Math.max(0, Math.round(Number(montoInicial) || 0));
  const sesion = {
    estado: "ABIERTA",
    fecha: hoyISO(),
    fechaApertura: new Date().toISOString(),
    montoInicial: monto,
  };
  escribir({ ...leer(), sesion });
  return sesion;
}

/**
 * Cierra la caja actual con el monto contado físicamente. Guarda el resumen
 * en el historial de cierres y deja la sesión como CERRADA (visible hasta la
 * próxima apertura).
 */
export function cerrarCaja({ montoContado, observaciones = "" }) {
  const estado = leer();
  const sesion = estado.sesion;
  if (!sesion || sesion.estado !== "ABIERTA") return null;

  const movimientos = (estado.movimientos ?? []).filter((m) => m.fecha === sesion.fecha);
  const ingresos = movimientos
    .filter((m) => m.tipo === "INGRESO")
    .reduce((acc, m) => acc + m.monto, 0);
  const egresos = movimientos
    .filter((m) => m.tipo === "EGRESO")
    .reduce((acc, m) => acc + m.monto, 0);
  const esperado = sesion.montoInicial + ingresos - egresos;
  const contado = Math.max(0, Math.round(Number(montoContado) || 0));

  const cerrada = {
    ...sesion,
    estado: "CERRADA",
    fechaCierre: new Date().toISOString(),
    ingresos,
    egresos,
    esperado,
    contado,
    diferencia: contado - esperado,
    observaciones,
  };
  escribir({
    ...estado,
    sesion: cerrada,
    historial: [...(estado.historial ?? []), cerrada],
  });
  return cerrada;
}

/** Movimientos de caja de la sesión abierta (más nuevo primero). */
export function getMovimientos() {
  const estado = leer();
  const sesion = getSesion();
  if (!sesion) return [];
  return (estado.movimientos ?? [])
    .filter((m) => m.fecha === sesion.fecha)
    .sort((a, b) => String(b.id).localeCompare(String(a.id)));
}

/** Registra un ingreso o egreso en la caja abierta. */
export function agregarMovimiento({ tipo, motivo, monto }) {
  const sesion = getSesion();
  if (!sesion) return null;
  const mov = {
    // Id ordenable por fecha de creación (Date.now() con sufijo anti-colisión).
    id: `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    fecha: sesion.fecha,
    fechaCreacion: new Date().toISOString(),
    tipo: tipo === "INGRESO" ? "INGRESO" : "EGRESO",
    motivo: String(motivo ?? "").trim(),
    monto: Math.max(0, Math.round(Number(monto) || 0)),
  };
  const estado = leer();
  escribir({ ...estado, movimientos: [...(estado.movimientos ?? []), mov] });
  return mov;
}

/** Resumen de la sesión abierta: ingresos, egresos y efectivo esperado. */
export function resumenSesion() {
  const sesion = getSesion();
  if (!sesion) return null;
  const movimientos = getMovimientos();
  const ingresos = movimientos
    .filter((m) => m.tipo === "INGRESO")
    .reduce((acc, m) => acc + m.monto, 0);
  const egresos = movimientos
    .filter((m) => m.tipo === "EGRESO")
    .reduce((acc, m) => acc + m.monto, 0);
  return {
    sesion,
    movimientos,
    ingresos,
    egresos,
    esperado: sesion.montoInicial + ingresos - egresos,
  };
}

/** Historial de cierres, más reciente primero. */
export function getHistorialCierres() {
  return [...(leer().historial ?? [])].reverse();
}

/** Borra todo el estado mock (útil para reiniciar la demo). */
export function resetMock() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* storage bloqueado */
  }
}
