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

/**
 * Nombre para mostrar de un proveedor:
 * persona FISICA → "Nombre Apellido"; JURIDICA → razón social (o nombre).
 */
export function getProveedorNombre(proveedor) {
  if (!proveedor) return "";
  if (String(proveedor.tipoPersona || "").toUpperCase() === "FISICA") {
    return [proveedor.nombre, proveedor.apellido].filter(Boolean).join(" ");
  }
  return proveedor.razonSocial || proveedor.nombre || "";
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

// Mapea el formulario del frontend al ProveedorRequest del back.
// OJO: el PUT del back ignora los campos `null` ("no tocar"), así que los
// campos de texto opcionales se envían con "" para que se puedan VACIAR.
// (Verificado: el back limpia el campo cuando llega "".)
function buildProveedorBody(data) {
  const body = {
    nombre: data.nombre?.trim() || "",
    tipoPersona: data.tipoPersona || "FISICA",
    tipoDocumento: data.tipoDocumento || (data.tipoPersona === "JURIDICA" ? "RUC" : "CI"),
    numeroDocumento: data.numeroDocumento?.trim() || null,
    descripcion: data.descripcionNegocio?.trim() || "",
    personaContacto: data.personaContacto?.trim() || "",
    email: data.email?.trim() || "",
    idPais: data.idPais ? Number(data.idPais) : null,
    idCiudad: data.idCiudad ? Number(data.idCiudad) : null,
    direccion: data.direccion?.trim() || "",
    telefono: data.telefono?.trim() || "",
    celular: data.celular?.trim() || "",
    activo: data.activo !== false,
  };

  body.apellido = data.apellido?.trim() || "";

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
