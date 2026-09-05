import { api } from "./client";

// Endpoints reales del contrato (04-09-26).
// El backend NO implementa DELETE: para categorías/subcategorías el
// "eliminar" del frontend desactiva con activo:false (PUT).
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

export async function eliminarCategoria(id, nombre) {
  const { data } = await api.put(`${CATEGORIAS}/${id}`, { nombre, activo: false });
  return data;
}

export async function crearSubcategoria(idCategoria, nombre) {
  const { data } = await api.post(SUBCATEGORIAS, { nombre, idCategoria });
  return data;
}

export async function actualizarSubcategoria(id, nombre, idCategoria) {
  const { data } = await api.put(`${SUBCATEGORIAS}/${id}`, { nombre, idCategoria });
  return data;
}

export async function eliminarSubcategoria(id, nombre, idCategoria) {
  const { data } = await api.put(`${SUBCATEGORIAS}/${id}`, { nombre, idCategoria, activo: false });
  return data;
}