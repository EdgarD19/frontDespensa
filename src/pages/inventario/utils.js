/**
 * Retorna el estado de stock: "normal" | "bajo" | "sin"
 */
export function getEstadoStock(producto) {
  const stock = Number(producto.stockActual ?? producto.stock ?? 0);
  const minimo = Number(producto.stockMinimo ?? 0);
  if (stock === 0) return "sin";
  if (minimo > 0 && stock <= minimo) return "bajo";
  return "normal";
}
