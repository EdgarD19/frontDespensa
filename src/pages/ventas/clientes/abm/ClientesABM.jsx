import { useState, useEffect, useCallback } from "react"
import ClientesTabla from "./ClientesTabla"
import ClientesModal from "./ClientesModal"
import {
    getClientes,
    createCliente,
    updateCliente,
    deleteCliente,
    toggleActivoCliente,
    getClienteId,
} from "../../../../api/clientesApi"
import { apiErrorMessage } from "../../../../api/errors"

const DEBOUNCE_MS = 400;

export default function ClientesABM() {
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");
    const [searchDebounced, setSearchDebounced] = useState("");
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [modalAbierto, setModalAbierto] = useState(false);
    const [clienteEdit, setClienteEdit] = useState(null);
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchDebounced(search);
            setPage(0);
        }, DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [search]);

    const cargarClientes = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await getClientes({
                search: searchDebounced,
                page,
                pageSize: 10,
                sortBy: "idCliente",
                sortDir: "ASC",
            });

            const body = res.data ?? {};
            setClientes(Array.isArray(body.content) ? body.content : []);
            setTotalPages(
                typeof body.totalPages === "number" ? body.totalPages : 0,
            );
        } catch (err) {
            console.error("Error al cargar clientes:", err);
            const detalle = apiErrorMessage(err);
            setError(
                detalle && detalle !== "Error de red"
                    ? `No se pudieron cargar los clientes: ${detalle}`
                    : "No se pudieron cargar los clientes. Verificá la conexión y el servidor.",
            );
        } finally {
            setLoading(false);
        }
    }, [searchDebounced, page]);

    useEffect(() => {
        cargarClientes();
    }, [cargarClientes]);

    function handleNuevo() {
        setClienteEdit(null);
        setModalAbierto(true);
    }

    function handleSeleccionar(cliente) {
        setClienteEdit(cliente);
        setModalAbierto(true);
    }

    function handleCerrarModal() {
        setModalAbierto(false);
        setClienteEdit(null);
    }

    async function handleGuardar(formData) {
        setGuardando(true);
        setError(null);

        const id = getClienteId(clienteEdit);

        try {
            if (id != null) {
                await updateCliente(id, formData);
            } else {
                await createCliente(formData);
            }
            handleCerrarModal();
            await cargarClientes();
        } catch (err) {
            console.error("Error al guardar cliente:", err);
            const detalle = apiErrorMessage(err);
            setError(
                detalle && detalle !== "Error de red"
                    ? `No se pudo guardar el cliente: ${detalle}`
                    : "No se pudo guardar el cliente. Revisá los datos e intentá de nuevo.",
            );
        } finally {
            setGuardando(false);
        }
    }

    async function handleToggleActivo(cliente) {
        const id = getClienteId(cliente);
        if (id == null) return;

        const nombre = cliente.razonSocial ||
            [cliente.name ?? cliente.firstName, cliente.lastName].filter(Boolean).join(" ").trim() ||
            `cliente #${id}`;
        const nuevoEstado = cliente.activo === false ? "activar" : "inactivar";

        if (!window.confirm(`¿${nuevoEstado} a ${nombre}?`)) return;

        setError(null);
        try {
            await toggleActivoCliente(id);
            await cargarClientes();
        } catch (err) {
            console.error("Error al cambiar estado:", err);
            setError("No se pudo cambiar el estado del cliente.");
        }
    }

    async function handleEliminar(cliente) {
        const id = getClienteId(cliente);
        if (id == null) return;

        const nombre = cliente.razonSocial ||
            [cliente.name ?? cliente.firstName, cliente.lastName].filter(Boolean).join(" ").trim() ||
            `cliente #${id}`;

        if (!window.confirm(`¿Eliminar a ${nombre}? Esta acción no se puede deshacer.`)) return;

        setError(null);
        try {
            await deleteCliente(id);
            await cargarClientes();
        } catch (err) {
            console.error("Error al eliminar cliente:", err);
            const detalle = apiErrorMessage(err);
            setError(
                detalle && detalle !== "Error de red"
                    ? `No se pudo eliminar el cliente: ${detalle}`
                    : "No se pudo eliminar el cliente.",
            );
        }
    }

    return (
        <div>
            <h1 className="text-2xl font-semibold text-white mb-4">Gestión de Clientes</h1>

            {error && (
                <div className="mb-4 px-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg py-3">
                    {error}
                </div>
            )}

            <ClientesTabla
                clientes={clientes}
                loading={loading}
                search={search}
                onSearch={setSearch}
                onSeleccionar={handleSeleccionar}
                onEliminar={handleEliminar}
                onToggleActivo={handleToggleActivo}
                onNuevo={handleNuevo}
                paginacion={{ page, totalPages }}
                onPageChange={setPage}
            />

            <ClientesModal
                abierto={modalAbierto}
                clienteEdit={clienteEdit}
                guardando={guardando}
                onGuardar={handleGuardar}
                onCerrar={handleCerrarModal}
            />
        </div>
    );
}
