const STORAGE_KEY = "compras.operaciones.v1";

export function getOperaciones() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addOperacion(operacion) {
  const operaciones = getOperaciones();
  const nueva = { ...operacion, id: operacion.id ?? Date.now() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify([nueva, ...operaciones]));
  return nueva;
}

export function updateOperacion(id, cambios) {
  const operaciones = getOperaciones().map((op) =>
    String(op.id) === String(id) ? { ...op, ...cambios } : op
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(operaciones));
  return operaciones;
}
