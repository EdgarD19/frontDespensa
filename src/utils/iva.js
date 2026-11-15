/**
 * Base imponible unitaria a partir de un precio con IVA incluido.
 * Espejo de CalculoIvaUtil.calcularBaseImponible del back: la división se
 * hace con 6 decimales y recién al multiplicar por la cantidad se redondea a
 * 2. Redondear la base unitaria a 2 antes de multiplicar hace que el IVA del
 * ticket no coincida con el de la factura en cantidades grandes.
 */
export function baseImponibleUnitaria(precioConIva, tasaIva) {
  const p = Number(precioConIva);
  if (!Number.isFinite(p) || p === 0) return 0;
  const t = Number(tasaIva);
  if (!Number.isFinite(t)) return p;
  return Math.round((p / (1 + t / 100)) * 1e6) / 1e6;
}

/** Redondeo a 2 decimales (mismo HALF_UP del back para valores positivos). */
export function r2(n) {
  return Math.round(Number(n) * 100) / 100;
}
