import { api } from "./client";

// Endpoints reales del contrato (04-09-26).
// El backend NO implementa DELETE para categorías/subcategorías:
// el "eliminar/desactivar" usa PATCH .../desactivar y se vuelve con PATCH .../activar.
const CATEGORIAS = "/api/categorias";
const SUBCATEGORIAS = "/api/subcategorias";

export async function crearCategoria(nombre) {
  const { data } = await api.post(CATEGORIAS, { nombre });
  return data;
}

export async function actualizarCategoria(id, nombre) {
  const { data } = await api.put(`${CATEGORIAS}/${id}`, { nombre });
  return data;
}

export function toggleActivoCategoria(id, activo) {
  const action = activo === false ? "activar" : "desactivar";
  return api.patch(`${CATEGORIAS}/${id}/${action}`);
}

export async function crearSubcategoria(idCategoria, nombre) {
  const { data } = await api.post(SUBCATEGORIAS, { nombre, idCategoria });
  return data;
}

export async function actualizarSubcategoria(id, nombre, idCategoria) {
  const { data } = await api.put(`${SUBCATEGORIAS}/${id}`, { nombre, idCategoria });
  return data;
}

export function toggleActivoSubcategoria(id, activo) {
  const action = activo === false ? "activar" : "desactivar";
  return api.patch(`${SUBCATEGORIAS}/${id}/${action}`);
}