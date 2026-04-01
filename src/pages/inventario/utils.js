
export function getEstadoStock(producto) {
  const raw = producto.stockActual;
  if (raw === "" || raw === undefined || raw === null) {
    return "desconocido";
  }
  const stock = Number(raw);
  if (!Number.isFinite(stock)) return "desconocido";
  const minimo = Number(producto.stockMinimo ?? 0);
  if (stock === 0) return "sin";
  if (minimo > 0 && stock <= minimo) return "bajo";
  return "normal";
}
