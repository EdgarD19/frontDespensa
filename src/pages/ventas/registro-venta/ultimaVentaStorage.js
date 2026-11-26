/**
 * Persistencia de la última venta para reimprimir el ticket.
 *
 * Se guarda en `sessionStorage` (vive solo en la pestaña): si el operador
 * recarga la página o falla la impresora, puede volver a abrir el ticket.
 *
 * Riesgos que se cubren acá:
 *  - Datos viejos: los navegadores pueden restaurar la sesión de una pestaña
 *    días después. Se descarta todo lo que supere `TTL_MS`.
 *  - Datos corruptos o de una versión anterior: se valida la forma mínima
 *    antes de hidratar el estado.
 *  - `sessionStorage` bloqueado (modo privado/cuota): se degrada sin romper.
 */

export const ULTIMA_VENTA_KEY = "despensa_ultima_venta_v1";

// Una jornada de cobro: alcanza para reimprimir la última venta del turno.
const TTL_MS = 24 * 60 * 60 * 1000;
// Tolerancia por relojes adelantados (no descartar un ticket recién guardado).
const MARGEN_FUTURO_MS = 5 * 60 * 1000;

function esDatosValidos(d) {
  if (!d || typeof d !== "object") return false;
  if (typeof d.numero !== "string" || d.numero.trim() === "") return false;
  if (!Array.isArray(d.lineas) || d.lineas.length === 0) return false;
  if (!Number.isFinite(Number(d.total))) return false;
  const ts = Date.parse(String(d.guardadaEn ?? ""));
  if (!Number.isFinite(ts)) return false;
  const edad = Date.now() - ts;
  if (edad < -MARGEN_FUTURO_MS || edad > TTL_MS) return false;
  return true;
}

function borrarClave() {
  try {
    sessionStorage.removeItem(ULTIMA_VENTA_KEY);
  } catch { /* storage bloqueado */ }
}

/** Devuelve la última venta válida de esta pestaña, o `null`. */
export function cargarUltimaVenta() {
  try {
    const raw = sessionStorage.getItem(ULTIMA_VENTA_KEY);
    if (!raw) return null;
    const datos = JSON.parse(raw);
    if (!esDatosValidos(datos)) {
      borrarClave();
      return null;
    }
    return datos;
  } catch {
    borrarClave();
    return null;
  }
}

/**
 * Guarda la última venta con su sello de tiempo.
 * Devuelve los datos persistidos (incluye `guardadaEn`) o `null` si no se
 * pudo guardar; el llamador puede seguir mostrando el ticket en memoria.
 */
export function guardarUltimaVenta(datos) {
  if (!datos || typeof datos !== "object") return null;
  const conSello = { ...datos, guardadaEn: new Date().toISOString() };
  try {
    sessionStorage.setItem(ULTIMA_VENTA_KEY, JSON.stringify(conSello));
    return conSello;
  } catch {
    return null;
  }
}

/** Borra la última venta (p. ej. al descartar el ticket). */
export function borrarUltimaVenta() {
  borrarClave();
}
