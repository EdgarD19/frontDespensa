import { Search, ToggleLeft, ToggleRight, Ban, X } from "lucide-react";
import { useState, useEffect, useCallback } from "react"
import ClientesTabla from "./ClientesTabla"
import ClientesModal from "./ClientesModal"
import {
    getClientes,
    createCliente,
    updateCliente,
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
    const [totalItems, setTotalItems] = useState(0);
    const [modalAbierto, setModalAbierto] = useState(false);
    const [clienteEdit, setClienteEdit] = useState(null);
    const [guardando, setGuardando] = useState(false);
    const [toggleModal, setToggleModal] = useState(null);

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
            setTotalItems(
                typeof body.totalElements === "number" ? body.totalElements : 0,
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

        setToggleModal({ id, nombre, activo: cliente.activo !== false });
    }

    async function handleConfirmToggle() {
        if (!toggleModal) return;
        const { id } = toggleModal;

        setError(null);
        try {
            await toggleActivoCliente(id);
            await cargarClientes();
        } catch (err) {
            console.error("Error al cambiar estado:", err);
            setError("No se pudo cambiar el estado del cliente.");
        } finally {
            setToggleModal(null);
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
                onToggleActivo={handleToggleActivo}
                onNuevo={handleNuevo}
                paginacion={{ page, totalPages }}
                onPageChange={setPage}
                totalItems={totalItems}
                pageSize={10}
            />

            <ClientesModal
                abierto={modalAbierto}
                clienteEdit={clienteEdit}
                guardando={guardando}
                onGuardar={handleGuardar}
                onCerrar={handleCerrarModal}
            />

            {/* Modal confirmar toggle activo/inactivo */}
            {toggleModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#1a1a20] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                            <div>
                                <h2 className="text-lg font-semibold text-white">
                                    {toggleModal.activo ? "Inactivar Cliente" : "Activar Cliente"}
                                </h2>
                                <p className="text-xs text-[#7a7a8c] mt-0.5">
                                    {toggleModal.nombre}
                                </p>
                            </div>
                            <button
                                onClick={() => setToggleModal(null)}
                                className="p-1 text-white/40 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <p className="text-sm text-[#b0b0c0]">
                                ¿{toggleModal.activo ? "Inactivar" : "Activar"} a <strong>{toggleModal.nombre}</strong>?
                            </p>
                            <div className="flex items-center justify-end gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setToggleModal(null)}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#111114] hover:bg-[#1a1a22] text-[#b0b0c0] font-medium rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmToggle}
                                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-medium rounded-lg transition-colors"
                                >
                                    <Ban className="w-4 h-4" />
                                    {toggleModal.activo ? "Inactivar" : "Activar"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
