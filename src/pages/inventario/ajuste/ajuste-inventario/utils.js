export function stockEntero(producto) {
  const n = Number(producto?.stockActual ?? 0);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}
