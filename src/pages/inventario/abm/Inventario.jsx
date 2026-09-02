// Hooks de React:
//   useState   → guarda valores que pueden cambiar (estado local)
//   useEffect  → ejecuta código cuando algo cambia (ej: al montar el componente)
//   useCallback → memoriza una función para que no se recree en cada render
import { useState, useEffect, useCallback } from "react";

import ProductForm from "./ProductForm";
import ProductList from "./ProductList";
import PrecioProductoModal from "./PrecioProductoModal";
import ConfirmModal from "./ConfirmModal";
import {
  getProductos,
  createProducto,
  updateProducto,
  apiErrorMessage,
} from "../../../api/productosApi";
import {
  getCategorias,
  getUnidades,
  getProveedores,
  getSubcategorias,
  getMarcas,
} from "../../../api/maestrosApi";

const DEBOUNCE_MS = 400;

// ESTADO INICIAL DEL FORMULARIO
/*
  INITIAL_FORM es un objeto "plantilla vacía" que representa un producto en blanco.
  Se usa en dos momentos:
    1. Al abrir el modal para CREAR un producto nuevo (todos los campos limpios).
    2. Al cerrar o limpiar el formulario (resetear a valores vacíos).
*/
const INITIAL_FORM = {
  id: null,
  codigoBarras: "",
  nombre: "",
  descripcion: "",
  idCategoria: "",
  categoria: "",
  idSubcategoria: "",
  subcategoria: "",
  idMarca: "",
  marca: "",
  productoPesable: "no",
  idUnidad: "",
  unidadMedida: "",
  idProveedor: "",
  proveedor: "",
  precio: "",
  activo: true,
};

// FUNCIÓN AUXILIAR: mergeProductoLista
function mergeProductoLista(prev, next) {
  // Spread: empieza copiando todo de prev, luego pisa con lo que trae next
  const m = { ...prev, ...next };

  // Para cada campo importante: si next lo trajo vacío/nulo, restauramos el de prev
  if (!next.categoria)     m.categoria     = prev.categoria;
  if (!next.idCategoria)   m.idCategoria   = prev.idCategoria;
  if (!next.idSubcategoria) m.idSubcategoria = prev.idSubcategoria;
  if (!next.subcategoria)  m.subcategoria  = prev.subcategoria;
  if (!next.idUnidad)      m.idUnidad      = prev.idUnidad;
  if (!next.unidadMedida)  m.unidadMedida  = prev.unidadMedida;
  if (!next.idProveedor)   m.idProveedor   = prev.idProveedor;
  if (!next.proveedor)     m.proveedor     = prev.proveedor;

  // Precios: si next no los trajo, conservar los anteriores
  if (!next.precioCompra    && prev.precioCompra)    m.precioCompra    = prev.precioCompra;
  if (!next.precioCompraKg  && prev.precioCompraKg)  m.precioCompraKg  = prev.precioCompraKg;

  return m;
}
// COMPONENTE PRINCIPAL: Inventario
/*
  - Mantener el estado global del módulo (lista de productos, formulario, modal, etc.)
  - Llamar a la API (backend)
  - Pasar datos y funciones a los componentes hijos

  "export default" significa que este componente es el que se exporta
  cuando otro archivo hace: import Inventario from "./Inventario"
*/
export default function Inventario() {
  const [productos, setProductos]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [formData, setFormData]         = useState(INITIAL_FORM);
  const [editingId, setEditingId]       = useState(null);
  const [search, setSearch]             = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [page, setPage]                 = useState(0);
  const [totalPages, setTotalPages]     = useState(0);
  const [modalOpen, setModalOpen]       = useState(false);
  const [precioProducto, setPrecioProducto] = useState(null);
  const [confirmarProducto, setConfirmarProducto] = useState(null);

  const [categorias, setCategorias]     = useState([]);
  const [unidades, setUnidades]         = useState([]);
  const [proveedores, setProveedores]   = useState([]);
  const [subcategorias, setSubcategorias] = useState([]);
  const [marcas, setMarcas]             = useState([]);
  const [maestrosAviso, setMaestrosAviso] = useState(null);

  useEffect(() => {
    const safe = async (fn) => { try { const v = await fn(); return Array.isArray(v) ? v : []; } catch { return []; } };
    (async () => {
      const [cats, unids, provs, marcasData] = await Promise.all([
        safe(getCategorias), safe(getUnidades), safe(getProveedores), safe(getMarcas),
      ]);
      setCategorias(cats); setUnidades(unids); setProveedores(provs); setMarcas(marcasData);
      if (cats.length === 0 && unids.length === 0 && provs.length === 0) {
        setMaestrosAviso("No hay categorías, unidades ni proveedores para el alta de productos.");
      }
    })();
  }, []);

  useEffect(() => {
    if (formData.idCategoria) {
      getSubcategorias(Number(formData.idCategoria))
        .then(setSubcategorias).catch(() => setSubcategorias([]));
    } else {
      setSubcategorias([]);
    }
  }, [formData.idCategoria]);

  useEffect(() => {
    const timer = setTimeout(() => { setSearchDebounced(search); setPage(0); }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const loadProductos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getProductos({ search: searchDebounced, page, pageSize: 10, sortBy: "nombre", sortDir: "ASC" });
      setProductos(Array.isArray(res.content) ? res.content : []);
      setTotalPages(typeof res.totalPages === "number" ? res.totalPages : 0);
    } catch (err) {
      setError(apiErrorMessage(err) || "Error al cargar productos");
      setProductos([]);
    } finally {
      setLoading(false);
    }
  }, [searchDebounced, page]);

  useEffect(() => { loadProductos(); }, [loadProductos]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setFormData(INITIAL_FORM);
    setEditingId(null);
    setError(null);
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (ev) => { if (ev.key === "Escape") closeModal(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [modalOpen, closeModal]);

  const openModalForAdd = () => {
    setFormData(INITIAL_FORM);
    setEditingId(null);
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { ...formData };

    const idUnid = data.idUnidad     ? Number(data.idUnidad)     : null;

    if (!String(data.nombre || "").trim()) {
      setError("El nombre del producto es obligatorio.");
      return;
    }

    if (!editingId) {
      const cb = String(data.codigoBarras || "").replace(/\D/g, "");
      if (cb && !/^\d{8,13}$/.test(cb)) {
        setError("El código de barras debe tener entre 8 y 13 dígitos, solo números.");
        return;
      }
      data.codigoBarras = cb;
    }

    try {
      setError(null);
      if (editingId) {
        const updated = await updateProducto(editingId, data);
        setProductos((prev) => prev.map((p) => (p.id === editingId ? mergeProductoLista(p, updated) : p)));
        setEditingId(null);
      } else {
        await createProducto(data, idUnid);
        await loadProductos();
      }
      setFormData(INITIAL_FORM);
      setModalOpen(false);
    } catch (err) {
      setError(apiErrorMessage(err) || "Error al guardar");
    }
  };

  const handleClear = () => {
    setFormData(INITIAL_FORM);
    setEditingId(null);
    setError(null);
  };

  const handleEdit = (producto) => {
    setFormData({
      ...producto,
      id: producto.id,
      idCategoria:   producto.idCategoria   ?? "",
      idSubcategoria: producto.idSubcategoria ?? "",
      idUnidad:      producto.idUnidad      ?? "",
      idProveedor:   producto.idProveedor   ?? "",
      idMarca:       producto.idMarca       ?? "",
      productoPesable: producto.productoPesable || "no",
      activo:        producto.activo !== false,
    });
    setEditingId(producto.id);
    setModalOpen(true);
  };

  const openPrecioModal = (producto) => {
    setError(null);
    setPrecioProducto(producto);
  };

  const closePrecioModal = () => {
    setPrecioProducto(null);
  };

  const handlePrecioActualizado = (updated) => {
    if (updated?.id) {
      setProductos((prev) =>
        prev.map((p) => (p.id === updated.id ? mergeProductoLista(p, updated) : p))
      );
    }
  };

  const handleToggleActivo = (producto) => {
    const id = producto.id;
    const nombre = producto.nombre || `producto #${id}`;
    const nuevoEstado = producto.activo === false;
    setConfirmarProducto({
      id,
      nombre,
      activar: nuevoEstado,
    });
  };

  const confirmarCambioEstado = async () => {
    if (!confirmarProducto) return;
    const { id, activar } = confirmarProducto;

    setError(null);
    try {
      await updateProducto(id, { ...productos.find((p) => p.id === id), activo: activar });
      setProductos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, activo: activar } : p))
      );
      setConfirmarProducto(null);
    } catch (err) {
      setError(apiErrorMessage(err) || "No se pudo cambiar el estado del producto.");
      setConfirmarProducto(null);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white mb-4">Gestión de Productos</h1>

      {error && (
        <div className="mb-4 px-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg py-3">{error}</div>
      )}

      {maestrosAviso && (
        <div className="mb-4 px-4 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm rounded-lg py-3">{maestrosAviso}</div>
      )}

      <ProductList
        products={loading ? [] : productos}
        loading={loading}
        search={search}
        onSearch={setSearch}
        onSeleccionar={handleEdit}
        onToggleActivo={handleToggleActivo}
        onPrecio={openPrecioModal}
        onNuevo={openModalForAdd}
        paginacion={{ page, totalPages }}
        onPageChange={setPage}
      />

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={closeModal}>
          <div role="dialog" aria-modal="true" className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <ProductForm
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleSubmit}
              onClose={closeModal}
              isEditing={!!editingId}
              categorias={categorias}
              subcategorias={subcategorias}
              unidades={unidades}
              proveedores={proveedores}
              loading={loading}
            />
          </div>
        </div>
      )}

      {precioProducto && (
        <PrecioProductoModal
          producto={precioProducto}
          onClose={closePrecioModal}
          onPrecioActualizado={handlePrecioActualizado}
        />
      )}

      {confirmarProducto && (
        <ConfirmModal
          abierto
          titulo={confirmarProducto.activar ? "Activar producto" : "Inactivar producto"}
          mensaje={`¿${confirmarProducto.activar ? "Activar" : "Inactivar"} "${confirmarProducto.nombre}"?`}
          confirmarLabel={confirmarProducto.activar ? "Activar" : "Inactivar"}
          confirmarClass={
            confirmarProducto.activar
              ? "bg-[#22c55e] text-[#0d0d0f] hover:bg-[#16a34a]"
              : "bg-[#ef4444] text-[#0d0d0f] hover:bg-[#dc2626]"
          }
          onConfirmar={confirmarCambioEstado}
          onCerrar={() => setConfirmarProducto(null)}
        />
      )}
    </div>
  );
}
