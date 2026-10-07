import { api } from "./client";

const BASE = "/api/clientes";

export function getClienteId(cliente) {
    const raw = cliente?.id ?? cliente?.idCliente;
    if (raw == null || raw === "") return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
}

export function getClientes({
    search = "",
    page = 0,
    pageSize = 10,
    sortBy = "idCliente",
    sortDir = "asc",
} = {}) {
    const searchTrim = search != null ? String(search).trim() : "";
    const dir = String(sortDir || "ASC").toUpperCase() === "DESC" ? "DESC" : "ASC";
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

export function getClienteById(id) {
    return api.get(`${BASE}/${id}`);
}

function resolveIdCiudad() {
    const raw = import.meta.env.VITE_CLIENTE_ID_CIUDAD;
    if (raw != null && String(raw).trim() !== "") {
        const n = Number(raw);
        if (Number.isFinite(n) && n > 0) return Math.trunc(n);
    }
    return 1;
}

function resolveNationalityIdPais() {
    const raw = import.meta.env.VITE_CLIENTE_ID_PAIS;
    if (raw != null && String(raw).trim() !== "") {
        const n = Number(raw);
        if (Number.isFinite(n) && n > 0) return Math.trunc(n);
    }
    return 1;
}

function birthDateToIso8601(value) {
    if (value == null || String(value).trim() === "") return null;
    const s = String(value).trim();
    if (s.includes("T") && (s.endsWith("Z") || s.includes("+"))) return s;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const d = new Date(`${s}T12:00:00`);
        return Number.isNaN(d.getTime()) ? null : d.toISOString();
    }
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function buildClientBody(clienteData) {
    const {
        firstName, lastName, tipoCliente, razonSocial, ruc, descripcionEmpresa,
        contactoNombre, contactoCelular,
        documentType, documentNumber, birthDate, gender, phoneNumber, celular,
        email, direccion, activo, observaciones,
    } = clienteData ?? {};

    const esJuridica = tipoCliente === "JURIDICA";
    const body = {
        nombre: String((esJuridica ? razonSocial || firstName : firstName) ?? "").trim(),
        apellido: String(lastName ?? "").trim() || (esJuridica ? String(razonSocial ?? "").trim() : ""),
        tipoDocumento: esJuridica ? "RUC" : "CI",
        idCiudad: clienteData.idCiudad ? Number(clienteData.idCiudad) : resolveIdCiudad(),
        idPais: clienteData.idPais ? Number(clienteData.idPais) : resolveNationalityIdPais(),
    };

    const iso = birthDateToIso8601(birthDate);
    if (iso) body.fechaNacimiento = iso;

    if (esJuridica && ruc != null && String(ruc).trim() !== "") {
        body.numeroDocumento = String(ruc).trim();
    } else if (documentNumber != null && String(documentNumber).trim() !== "") {
        body.numeroDocumento = String(documentNumber).trim();
    }
    if (gender) body.genero = gender;
    if (phoneNumber != null && String(phoneNumber).trim() !== "") {
        body.telefono = String(phoneNumber).trim();
    }
    if (activo != null) {
        body.activo = activo;
    }

    return body;
}

export function createCliente(clienteData) {
    return api.post(BASE, buildClientBody(clienteData));
}

export function updateCliente(id, clienteData) {
    return api.put(`${BASE}/${id}`, buildClientBody(clienteData));
}

export function toggleActivoCliente(id) {
    return api.patch(`${BASE}/${id}/toggle-activo`);
}

export function deleteCliente(id) {
    return api.delete(`${BASE}/${id}`);
}
