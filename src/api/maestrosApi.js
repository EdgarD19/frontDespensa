import { MAESTROS_SEED } from "../data/maestrosSeed";

/**
 * El backend solo expone POST /api/categories; no hay GET de categorías, unidades ni proveedores.
 * Se usan datos semilla coherentes con database/init.sql (IDs típicos 1 en BD nueva).
 */
function parseMaestrosOverride() {
  const raw = import.meta.env.VITE_MAESTROS_JSON?.trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const override = parseMaestrosOverride();

export async function getCategorias() {
  return [...(override?.categorias ?? MAESTROS_SEED.categorias)];
}

export async function getUnidades() {
  return [...(override?.unidades ?? MAESTROS_SEED.unidades)];
}

export async function getProveedores() {
  return [...(override?.proveedores ?? MAESTROS_SEED.proveedores)];
}

/** Sin endpoint en el backend: siempre lista vacía. */
export async function getSubcategorias() {
  return [];
}
