import { api } from "./client";
import { apiErrorMessage } from "./errors";

export { apiErrorMessage };

const BASE = "/api/proveedores";

export function getProveedorId(proveedor) {
  const raw = proveedor?.id ?? proveedor?.idProveedor;
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

// Desenvuelve la respuesta paginada del contrato:
//   ProveedoresResponse = { data: PageWrapperProveedorResponse, mensaje }
//   PageWrapper = { content, page, size, totalElements, totalPages }
function unwrapProveedores(body) {
  const page = body?.data ?? body ?? {};
  const content = Array.isArray(page.content) ? page.content : [];
  return {
    content,
    totalElements: page.totalElements ?? content.length,
    totalPages: page.totalPages ?? 0,
    page: page.page ?? 0,
    size: page.size ?? 0,
  };
}

export async function getProveedores({
  search = "",
  page = 0,
  pageSize = 10,
  sortBy = "nombre",
  sortDir = "ASC",
} = {}) {
  const searchTrim = search != null ? String(search).trim() : "";
  const dir = String(sortDir || "ASC").toUpperCase() === "DESC" ? "desc" : "asc";

  // El contrato separa la búsqueda en /buscar?q=
  const path = searchTrim ? `/api/proveedores/buscar` : BASE;
  const { data } = await api.get(path, {
    params: searchTrim
      ? { q: searchTrim, page, size: pageSize, sortBy: sortBy || undefined, sortDirection: dir }
      : { page, size: pageSize, sortBy: sortBy || undefined, sortDirection: dir },
  });
  return unwrapProveedores(data);
}

export function getProveedorById(id) {
  return api.get(`${BASE}/${id}`);
}

// Mapea el formulario del frontend al ProveedorRequest del contrato.
function buildProveedorBody(data) {
  const body = {
    nombre: data.nombre?.trim() || "",
    tipoPersona: data.tipoPersona || "FISICA",
    tipoDocumento: data.tipoDocumento || null,
    numeroDocumento: data.numeroDocumento?.trim() || null,
    descripcion: data.descripcionNegocio?.trim() || null,
    personaContacto: data.personaContacto?.trim() || null,
    email: data.email?.trim() || null,
    idPais: data.idPais ? Number(data.idPais) : null,
    idCiudad: data.idCiudad ? Number(data.idCiudad) : null,
    direccion: data.direccion?.trim() || null,
    telefono: data.telefono?.trim() || null,
    celular: data.celular?.trim() || null,
    activo: data.activo !== false,
  };

  if (data.tipoPersona === "FISICA") {
    body.apellido = data.apellido?.trim() || null;
    if (data.fechaNacimiento) {
      body.fechaNacimiento = data.fechaNacimiento;
    }
  } else {
    body.apellido = null;
    body.fechaNacimiento = null;
  }

  return body;
}

export function createProveedor(data) {
  return api.post(BASE, buildProveedorBody(data));
}

export function updateProveedor(id, data) {
  return api.put(`${BASE}/${id}`, buildProveedorBody(data));
}

// El contrato usa PATCH .../activar | .../desactivar
export function toggleActivoProveedor(id, activo) {
  const action = activo === false ? "activar" : "desactivar";
  return api.patch(`${BASE}/${id}/${action}`);
}
