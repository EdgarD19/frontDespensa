import { useState, useEffect, useCallback } from "react";
import ProveedoresTabla from "./ProveedoresTabla";
import ProveedoresModal from "./ProveedoresModal";
import {
  getProveedores,
  createProveedor,
  updateProveedor,
  toggleActivoProveedor,
  getProveedorId,
  apiErrorMessage,
} from "../../../../api/proveedoresApi";
import { getPaises, getCiudades } from "../../../../api/maestrosApi";

const DEBOUNCE_MS = 400;

export default function ProveedoresABM() {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [proveedorEdit, setProveedorEdit] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const [paises, setPaises] = useState([]);
  const [ciudades, setCiudades] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const p = await getPaises();
        setPaises(p);
      } catch {
        setPaises([]);
      }
    }
    load();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search);
      setPage(0);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const cargarProveedores = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getProveedores({ search: searchDebounced, page, pageSize: 10, sortBy: "nombre", sortDir: "ASC" });
      setProveedores(res.content || []);
      setTotalPages(typeof res.totalPages === "number" ? res.totalPages : 0);
    } catch (err) {
      const detalle = apiErrorMessage(err);
      setError(detalle && detalle !== "Error de red"
        ? `No se pudieron cargar los proveedores: ${detalle}`
        : "No se pudieron cargar los proveedores. Verificá la conexión y el servidor.");
    } finally {
      setLoading(false);
    }
  }, [searchDebounced, page]);

  useEffect(() => { cargarProveedores(); }, [cargarProveedores]);

  async function handlePaisChange(idPais) {
    if (!idPais) { setCiudades([]); return; }
    try {
      const c = await getCiudades(Number(idPais));
      setCiudades(c);
    } catch {
      setCiudades([]);
    }
  }

  function handleNuevo() {
    setProveedorEdit(null);
    setCiudades([]);
    setModalAbierto(true);
  }

  function handleSeleccionar(proveedor) {
    setProveedorEdit(proveedor);
    if (proveedor.idPais) handlePaisChange(proveedor.idPais);
    setModalAbierto(true);
  }

  function handleCerrarModal() {
    setModalAbierto(false);
    setProveedorEdit(null);
  }

  async function handleGuardar(formData) {
    setGuardando(true);
    setError(null);
    const id = getProveedorId(proveedorEdit);
    try {
      if (id != null) {
        await updateProveedor(id, formData);
      } else {
        await createProveedor(formData);
      }
      handleCerrarModal();
      await cargarProveedores();
    } catch (err) {
      const detalle = apiErrorMessage(err);
      if (detalle && detalle.toLowerCase().includes("ruc") || detalle?.toLowerCase().includes("ya existe")) {
        setError("Ya existe un proveedor con ese RUC/documento");
      } else {
        setError(detalle && detalle !== "Error de red"
          ? `No se pudo guardar: ${detalle}`
          : "No se pudo guardar el proveedor. Revisá los datos e intentá de nuevo.");
      }
    } finally {
      setGuardando(false);
    }
  }

  async function handleToggleActivo(proveedor) {
    const id = getProveedorId(proveedor);
    if (id == null) return;
    const nombre = proveedor.nombre || `proveedor #${id}`;
    const nuevoEstado = proveedor.activo === false ? "activar" : "inactivar";
    if (!window.confirm(`¿${nuevoEstado} a ${nombre}?`)) return;
    setError(null);
    try {
      await toggleActivoProveedor(id, proveedor.activo);
      await cargarProveedores();
    } catch {
      setError("No se pudo cambiar el estado del proveedor.");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white mb-4">Gestión de Proveedores</h1>

      {error && (
        <div className="mb-4 px-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg py-3">{error}</div>
      )}

      <ProveedoresTabla
        proveedores={proveedores}
        loading={loading}
        search={search}
        onSearch={setSearch}
        onSeleccionar={handleSeleccionar}
        onToggleActivo={handleToggleActivo}
        onNuevo={handleNuevo}
        paginacion={{ page, totalPages }}
        onPageChange={setPage}
      />

      <ProveedoresModal
        abierto={modalAbierto}
        proveedorEdit={proveedorEdit}
        guardando={guardando}
        paises={paises}
        ciudades={ciudades}
        onGuardar={handleGuardar}
        onCerrar={handleCerrarModal}
        onPaisChange={handlePaisChange}
      />
    </div>
  );
}
