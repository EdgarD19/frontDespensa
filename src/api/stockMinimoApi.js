// Stock mínimo por producto — puente local mientras el back no tenga el campo.
//
// El back (Producto) no expone `stockMinimo`: el valor por producto se guarda
// en localStorage (keyed por id) y el dashboard usa `umbralDe()` para decidir
// la alerta. Cuando el back agregue el campo real, se reemplaza la fuente y
// este módulo se elimina.

const KEY = "despensa_productos_stock_minimo_v1";

export function getStockMinimoMap() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

export function setStockMinimo(id, minimo) {
  if (id == null) return;
  const all = getStockMinimoMap();
  const n = Number(String(minimo ?? "").replace(",", "."));
  if (Number.isFinite(n) && n >= 0) {
    all[String(id)] = n;
  } else {
    delete all[String(id)]; // vacío/inválido → vuelve al default global
  }
  localStorage.setItem(KEY, JSON.stringify(all));
}

/** Umbral efectivo del producto: su mínimo propio o el default global. */
export function umbralDe(id, minimoGlobal = 10) {
  const v = Number(getStockMinimoMap()[String(id)]);
  return Number.isFinite(v) && v >= 0 ? v : minimoGlobal;
}
