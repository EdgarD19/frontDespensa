 
import { useState, useEffect, useCallback } from "react"
import ClientesTabla from "./ClientesTabla"
import ClientesModal from "./ClientesModal"
import { getClientes, createCliente } from "../../../../api/clientesApi"
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

    // guardar (alta por ahora - edicion se agrega cuando el backend lo exponga)
    async function handleGuardar(formData) {
        setGuardando(true);
        setError(null);

        try {
            await createCliente(formData);
            // alta exitosa: cerrar modal y recargar la lista
            handleCerrarModal();
            await cargarClientes();
        } catch (err){
            console.error("Error al guardar cliente:", err);
            setError("No se pudo guardar el cliente. Revisa los datos e intenta de nuevo");
        } finally {
            setGuardando(false);
        }
    }

    return (
        <div>
            <h1 className="text-2xl font-semibold text-white">Gesto de Clientes</h1>

            {/*Banner en caso de error*/}
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 
                    text-sm rounded-lg py-3">
                    {error}
                </div> 
            )}

            <ClientesTabla
                clientes = {clientes} /* array de ClientResponse a mostrar*/
                loading = {loading} /* boolean, muestra skeleton miesntras carga */
                search = {search} /* string actual del buscador (valor controlado) */
                onSearch = {setSearch} /* fin(valor) cuando el usuario escribe en el buscador */
                onSeleccionar = {handleSeleccionar} /* fn(cliente) cuando el usuario hace click en una fila */
                onNuevo = {handleNuevo} /* fn() cuando el usuario hace click en "nuevo cliente"*/
                paginacion = {{ page, totalPages }} 
                onPageChange = {setPage} /* nueva pagina */
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