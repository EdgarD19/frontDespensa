// Stock mínimo por producto — puente local mientras el back no exponga la edición del campo.
//
// El valor por producto se guarda en localStorage (keyed por id). Cuando el
// back soporte la edición desde el front, se reemplaza la fuente y este
// módulo se elimina.

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
