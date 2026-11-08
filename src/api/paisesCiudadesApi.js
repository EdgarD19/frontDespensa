import { api } from "./client";

const PAISES = "/api/paises";
const CIUDADES = "/api/ciudades";

function unwrapList(data) {
  return (
    data?.data?.content ??
    data?.content ??
    data?.data ??
    (Array.isArray(data) ? data : [])
  );
}

const PAGINADO = { page: 0, size: 200, sortBy: "nombre", sortDirection: "asc" };

function normalizePais(row) {
  return { ...row, id: row.idPais ?? row.id };
}

function normalizeCiudad(row) {
  return { ...row, id: row.idCiudad ?? row.id };
}

export async function getPaisesABM() {
  const { data } = await api.get(PAISES, { params: PAGINADO });
  return unwrapList(data).map(normalizePais);
}

export async function getCiudadesABM(idPais) {
  const { data } = await api.get(`${CIUDADES}/pais/${idPais}`, { params: PAGINADO });
  return unwrapList(data).map(normalizeCiudad);
}

export async function crearPais(payload) {
  const { data } = await api.post(PAISES, payload);
  return data;
}

export async function actualizarPais(id, payload) {
  const { data } = await api.put(`${PAISES}/${id}`, payload);
  return data;
}

export function toggleActivoPais(id, activo) {
  const action = activo === false ? "activar" : "desactivar";
  return api.patch(`${PAISES}/${id}/${action}`);
}

export async function crearCiudad(payload) {
  const { data } = await api.post(CIUDADES, payload);
  return data;
}

export async function actualizarCiudad(id, payload) {
  const { data } = await api.put(`${CIUDADES}/${id}`, payload);
  return data;
}

export function toggleActivoCiudad(id, activo) {
  const action = activo === false ? "activar" : "desactivar";
  return api.patch(`${CIUDADES}/${id}/${action}`);
}