 
import { useState, useEffect, useCallback } from "react"
import ClientesTabla from "./ClientesTabla"
import ClientesModal from "./ClientesModal"
import {
    getClientes,
    createCliente,
    updateCliente,
    deleteCliente,
    getClienteId,
} from "../../../../api/clientesApi"
import { apiErrorMessage } from "../../../../api/errors"

const DEBOUNCE_MS = 400;
 
export default function ClientesABM(){
    // estado principal
    const [clientes, setClientes] = useState([]); // array de ClientResponse
    const [loading, setLoading] = useState(false); // boolean para el skeleton de la tabla
    const [error, setError] = useState(null); // String de error para mostrar feedback
    
    // estado del buscador
    const [search, setSearch] = useState("");
    // search con debounce = el efecto de carga solo reacciona a este
    const [searchDebounced, setSearchDebounced] = useState("");

    // paginacion
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    // modal 
    const [modalAbierto, setModalAbierto] = useState(false);
    const [clienteEdit, setClienteEdit] = useState(null);
    const [guardando, setGuardando] = useState(false);

    // debounce del buscador
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchDebounced(search);
            setPage(0); // al buscar, volver a la pagina
        }, DEBOUNCE_MS);

        return () => clearTimeout(timer); // cancelar si el usuario sigue escribiendo
    }, [search]);

    // carga de clientes (mismos params que documenta clientesApi / backend)
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

    // disparar la carga cuando cambien busqueda o pagina
    useEffect(() => {
        cargarClientes();
    }, [cargarClientes]);

    // HANDLERS

    // abrir modal para alta de nuevo cliente
    function handleNuevo() {
        setClienteEdit(null); // null = modo alta
        setModalAbierto(true);
    }

    // abrir modal para editar un cliente existente
    function handleSeleccionar(cliente) {
        setClienteEdit(cliente);
        setModalAbierto(true);
    }

    // cerrar modal
    function handleCerrarModal(){
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

    async function handleEliminar(cliente) {
        const id = getClienteId(cliente);
        if (id == null) return;

        const nombre =
            [cliente.name ?? cliente.firstName, cliente.lastName]
                .filter(Boolean)
                .join(" ")
                .trim() || `cliente #${id}`;

        if (
            !window.confirm(
                `¿Eliminar a ${nombre}? Esta acción no se puede deshacer.`,
            )
        ) {
            return;
        }

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
                onNuevo={handleNuevo}
                paginacion={{ page, totalPages }}
                onPageChange={setPage}
            />

            <ClientesModal
                abierto = {modalAbierto}
                clienteEdit = {clienteEdit}
                guardando = {guardando}
                onGuardar = {handleGuardar}
                onCerrar = {handleCerrarModal}
            />
        </div>
    );
}