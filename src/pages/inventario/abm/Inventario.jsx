import { useState, useEffect } from "react";
import ProductForm from "./ProductForm";
import ProductList from "./ProductList";
import {
  getProductos,
  createProducto,
  updateProducto,
  deleteProducto,
  apiErrorMessage,
} from "../../../api/productosApi";
import { getCategorias, getUnidades, getProveedores, getSubcategorias } from "../../../api/maestrosApi";
import { absoluteApiOrigin } from "../../../api/client";

const INITIAL_FORM = {
  id: null,
  codigo: "",
  codigoBarras: "",
  nombre: "",
  idCategoria: "",
  categoria: "",
  idSubcategoria: "",
  subcategoria: "",
  marca: "",
  productoPesable: "no",
  idUnidad: "",
  unidadMedida: "",
  precioCompra: "",
  precioVenta: "",
  precioCompraKg: "",
  precioVentaKg: "",
  stockMinimo: "",
  stockActual: "",
  idProveedor: "",
  proveedor: "",
  foto: "",
  imagenNombre: "",
  observaciones: "",
};

export default function Inventario() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [filterCategoria, setFilterCategoria] = useState("");
  const [filterStock, setFilterStock] = useState("todos");

  // Maestros para el formulario
  const [categorias, setCategorias] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [subcategorias, setSubcategorias] = useState([]);
  const [maestrosError, setMaestrosError] = useState(null);

  const swaggerUrl = `${absoluteApiOrigin()}/swagger-ui.html`;

  const loadProductos = async () => {
    try {
      setError(null);
      const res = await getProductos({ pageSize: 200, search: search || undefined });
      setProductos(res.content);
    } catch (err) {
      setError(apiErrorMessage(err) || "Error al cargar productos");
      setProductos([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMaestros = async () => {
    try {
      setMaestrosError(null);
      const [cats, unids, provs] = await Promise.all([
        getCategorias(),
        getUnidades(),
        getProveedores(),
      ]);
      setCategorias(cats || []);
      setUnidades(unids || []);
      setProveedores(provs || []);
    } catch (err) {
      setCategorias([]);
      setUnidades([]);
      setProveedores([]);
      setMaestrosError(
        `${apiErrorMessage(err)} · En desarrollo, Vite reenvía /DespensaProyect a http://localhost:8081 (véase vite.config). Opcional: VITE_API_BASE_URL en .env para otro origen.`
      );
    }
  };

  useEffect(() => {
    loadMaestros();
  }, []);

  useEffect(() => {
    if (formData.idCategoria) {
      getSubcategorias(Number(formData.idCategoria))
        .then(setSubcategorias)
        .catch(() => setSubcategorias([]));
    } else {
      setSubcategorias([]);
    }
  }, [formData.idCategoria]);

  useEffect(() => {
    loadProductos();
  }, [search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { ...formData };
    const precioCompra = data.productoPesable === "si" ? data.precioCompraKg : data.precioCompra;
    const precioVenta = data.productoPesable === "si" ? data.precioVentaKg : data.precioVenta;

    if (Number(precioCompra) < 0 || Number(precioVenta) < 0) return;
    if (Number(data.stockMinimo || 0) < 0) return;

    const idCat = data.idCategoria ? Number(data.idCategoria) : null;
    const idUnid = data.idUnidad ? Number(data.idUnidad) : null;
    const idProv = data.idProveedor ? Number(data.idProveedor) : null;

    if (!editingId && (!idCat || !idUnid || !idProv)) {
      setError("Debe seleccionar categoría, unidad de medida y proveedor para crear un producto.");
      return;
    }

    try {
      setError(null);
      if (editingId) {
        const updated = await updateProducto(editingId, data);
        setProductos((prev) =>
          prev.map((p) => (p.id === editingId ? { ...p, ...updated } : p))
        );
        setEditingId(null);
      } else {
        await createProducto(data, idCat, idUnid, idProv);
        await loadProductos();
      }
      setFormData(INITIAL_FORM);
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
      idCategoria: producto.idCategoria ?? "",
      idSubcategoria: producto.idSubcategoria ?? "",
      idUnidad: producto.idUnidad ?? "",
      idProveedor: producto.idProveedor ?? "",
      productoPesable: producto.productoPesable || "no",
    });
    setEditingId(producto.id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Está seguro de eliminar este producto?")) return;
    try {
      setError(null);
      await deleteProducto(id);
      setProductos((prev) => prev.filter((p) => p.id !== id));
      if (editingId === id) {
        setFormData(INITIAL_FORM);
        setEditingId(null);
      }
    } catch (err) {
      setError(apiErrorMessage(err) || "Error al eliminar");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#f0f6fc]">Inventario</h1>
        <p className="text-[#8b949e] text-sm mt-1">
          Gestiona tus productos y stock en un solo lugar
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/20 border border-red-500/50 px-4 py-3 text-red-200 text-sm">
          {error}
        </div>
      )}

      {maestrosError && (
        <div className="rounded-lg bg-red-500/20 border border-red-500/50 px-4 py-3 text-red-200 text-sm space-y-1">
          <p className="font-medium">No se pudieron cargar categorías, unidades ni proveedores.</p>
          <p className="text-red-200/90">{maestrosError}</p>
        </div>
      )}

      {!maestrosError &&
        categorias.length === 0 &&
        unidades.length === 0 &&
        proveedores.length === 0 && (
          <div className="rounded-lg bg-amber-500/20 border border-amber-500/50 px-4 py-3 text-amber-200 text-sm">
            No hay categorías, unidades o proveedores en la base. Insertá registros en PostgreSQL (por
            ejemplo el <span className="font-mono text-xs">init.sql</span> del backend) o desde Swagger:{" "}
            <span className="font-mono text-xs break-all">{swaggerUrl}</span>.
          </div>
        )}

      <div className="flex flex-col lg:flex-row gap-5">
        <div className="lg:max-w-sm">
          <ProductForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleSubmit}
            onClear={handleClear}
            isEditing={!!editingId}
            lockNonPriceFields={!!editingId}
            categorias={categorias}
            subcategorias={subcategorias}
            unidades={unidades}
            proveedores={proveedores}
            loading={loading}
          />
        </div>
        <div className="flex-1">
          <ProductList
            products={loading ? [] : productos}
            onEdit={handleEdit}
            onDelete={handleDelete}
            search={search}
            setSearch={setSearch}
            filterCategoria={filterCategoria}
            setFilterCategoria={setFilterCategoria}
            filterStock={filterStock}
            setFilterStock={setFilterStock}
          />
        </div>
      </div>
    </div>
  );
}
