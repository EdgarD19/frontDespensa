import { api } from "./client";

const BASE = "/api/v1/admin/maestros";

export async function crearCategoria(nombre) {
  const { data } = await api.post(`${BASE}/categorias`, { nombre });
  return data;
}

export async function actualizarCategoria(id, nombre) {
  const { data } = await api.put(`${BASE}/categorias/${id}`, { nombre });
  return data;
}

export async function eliminarCategoria(id) {
  await api.delete(`${BASE}/categorias/${id}`);
}

export async function crearSubcategoria(idCategoria, nombre) {
  const { data } = await api.post(`${BASE}/categorias/${idCategoria}/subcategorias`, { nombre });
  return data;
}

export async function actualizarSubcategoria(id, nombre) {
  const { data } = await api.put(`${BASE}/subcategorias/${id}`, { nombre });
  return data;
}

export async function eliminarSubcategoria(id) {
  await api.delete(`${BASE}/subcategorias/${id}`);
}

export async function crearMarca(nombre) {
  const { data } = await api.post(`${BASE}/marcas`, { nombre });
  return data;
}

export async function actualizarMarca(id, nombre) {
  const { data } = await api.put(`${BASE}/marcas/${id}`, { nombre });
  return data;
}

export async function eliminarMarca(id) {
  await api.delete(`${BASE}/marcas/${id}`);
}

export async function crearPais(nombre) {
  const { data } = await api.post(`${BASE}/paises`, { nombre });
  return data;
}

export async function actualizarPais(id, nombre) {
  const { data } = await api.put(`${BASE}/paises/${id}`, { nombre });
  return data;
}

export async function eliminarPais(id) {
  await api.delete(`${BASE}/paises/${id}`);
}

export async function crearCiudad(idPais, nombre) {
  const { data } = await api.post(`${BASE}/paises/${idPais}/ciudades`, { nombre });
  return data;
}

export async function actualizarCiudad(id, nombre) {
  const { data } = await api.put(`${BASE}/ciudades/${id}`, { nombre });
  return data;
}

export async function eliminarCiudad(id) {
  await api.delete(`${BASE}/ciudades/${id}`);
}
