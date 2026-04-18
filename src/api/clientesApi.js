import { api } from "./client";
/*
endpoints del backend
    GET     /api/client     -> listado pagina con busqueda
    GET     /api/client/:id -> detalle por id
    POST    /api/client     -> alta de cliente
*/

// constante base
const BASE = "/api/client";

/* 
    getClientes
    Devuelve un PageWrapper<ClientResponse>:
    { content, page, size, totalElements, totalPages }

    Parámetros opcionales (todos tienen default en el backend):
        search   → filtra por nombre, apellido, razón social o documento
        page     → número de página (0-indexado)
        pageSize → cantidad de registros por página
        sortBy   → atributo JPA de Cliente (ej. idCliente, firstName), no el nombre JSON "id"
        sortDir  → "asc" | "desc"
*/
export function getClientes({
    search = "",
    page = 0,
    pageSize = 10,
    sortBy = "idCliente",
    sortDir = "asc",
} = {}) {
    const searchTrim = search != null ? String(search).trim() : "";
    const dir =
        String(sortDir || "ASC").toUpperCase() === "DESC" ? "DESC" : "ASC";
    return api.get(BASE, {
        params: {
            page,
            pageSize,
            search: searchTrim || undefined,
            sortBy: sortBy || undefined,
            sortDir: dir,
        },
    });
}
/*
    getClienteId
    Devuelve un ClientResponse (detalle completo de un cliente)
*/
export function getClienteById(id) {
    return api.get(`${BASE}/${id}`)
}
/*
    createCliente
        Recibe un objeto que coincide con ClientRequest del backend:
        { firstName, lastName, birthDate?, documentType?, idCity?,
        phoneNumber?, documentNumber?, gender?, nationality? }
        Devuelve el cliente creado (o el id, según el backend).
*/
export function createCliente(clienteData){
    return api.post(BASE, clienteData);
}

