import { api } from "./client";

const BASE = "/api/v1/client";

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

    const body = {
        firstName: String(firstName ?? "").trim(),
        lastName: String(lastName ?? "").trim(),
        tipoCliente: tipoCliente || "FISICA",
        id_ciudad: resolveIdCiudad(),
        nationality_id_pais: resolveNationalityIdPais(),
    };

    if (tipoCliente === "JURIDICA") {
        body.razonSocial = String(razonSocial ?? "").trim();
        body.ruc = String(ruc ?? "").trim() || null;
        body.descripcionEmpresa = String(descripcionEmpresa ?? "").trim() || null;
        body.contactoNombre = String(contactoNombre ?? "").trim() || null;
        body.contactoCelular = String(contactoCelular ?? "").trim() || null;
    }

    const iso = birthDateToIso8601(birthDate);
    if (iso) body.birthDate = iso;

    if (documentType) body.documentType = documentType;
    if (documentNumber != null && String(documentNumber).trim() !== "") {
        body.documentNumber = String(documentNumber).trim();
    }
    if (gender) body.gender = gender;
    if (phoneNumber != null && String(phoneNumber).trim() !== "") {
        body.phoneNumber = String(phoneNumber).trim();
    }
    if (celular != null && String(celular).trim() !== "") {
        body.celular = String(celular).trim();
    }
    if (email != null && String(email).trim() !== "") {
        body.email = String(email).trim();
    }
    if (direccion != null && String(direccion).trim() !== "") {
        body.direccion = String(direccion).trim();
    }
    if (observaciones != null && String(observaciones).trim() !== "") {
        body.observaciones = String(observaciones).trim();
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
