import { api } from "./client";
import { apiErrorMessage } from "./errors";

export { apiErrorMessage };

const BASE = "/api/v1/proveedor";

export function getProveedorId(proveedor) {
  const raw = proveedor?.id ?? proveedor?.idProveedor;
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function getProveedores({
  search = "",
  page = 0,
  pageSize = 10,
  sortBy = "nombre",
  sortDir = "ASC",
} = {}) {
  const searchTrim = search != null ? String(search).trim() : "";
  const dir = String(sortDir || "ASC").toUpperCase() === "DESC" ? "DESC" : "ASC";
  return api.get(BASE, {
    params: { page, pageSize, search: searchTrim || undefined, sortBy: sortBy || undefined, sortDir: dir },
  });
}

export function getProveedorById(id) {
  return api.get(`${BASE}/${id}`);
}

function buildProveedorBody(data) {
  const body = {
    nombre: data.nombre?.trim() || "",
    tipoPersona: data.tipoPersona || "FISICA",
    tipoDocumento: data.tipoDocumento || null,
    numeroDocumento: data.numeroDocumento?.trim() || null,
    descripcionNegocio: data.descripcionNegocio?.trim() || null,
    personaContacto: data.personaContacto?.trim() || null,
    id_pais: data.idPais ? Number(data.idPais) : null,
    id_ciudad: data.idCiudad ? Number(data.idCiudad) : null,
    direccion: data.direccion?.trim() || null,
    telefono: data.telefono?.trim() || null,
    celular: data.celular?.trim() || null,
  };

  if (data.tipoPersona === "FISICA") {
    body.apellido = data.apellido?.trim() || null;
    if (data.fechaNacimiento) {
      body.fechaNacimiento = new Date(data.fechaNacimiento).toISOString();
    }
  }

  return body;
}

export function createProveedor(data) {
  return api.post(BASE, buildProveedorBody(data));
}

export function updateProveedor(id, data) {
  return api.put(`${BASE}/${id}`, buildProveedorBody(data));
}

export function toggleActivoProveedor(id) {
  return api.patch(`${BASE}/${id}/toggle-activo`);
}
