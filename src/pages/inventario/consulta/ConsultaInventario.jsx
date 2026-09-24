import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ConsultaInventarioFilters from "./ConsultaInventarioFilters";
import ConsultaInventarioReport from "./ConsultaInventarioReport";
import { getProductos } from "../../../api/productosApi";
import { getCategorias } from "../../../api/maestrosApi";
import { apiErrorMessage } from "../../../api/errors";
import { getEstadoStock } from "../utils";

const ITEMS_PER_PAGE = 10;

export default function ConsultaInventario() {
  const [productos, setProductos]           = useState([]);
  const [categorias, setCategorias]         = useState([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState(null);

  const [search, setSearch]                 = useState("");
  const [filterCategoria, setFilterCategoria] = useState("");
  const [filterStock, setFilterStock]       = useState("todos");
  const [currentPage, setCurrentPage]       = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        setLoading(true);
        const [es] = await Promise.all([getProductos({ pageSize: 500 })]);
        if (!cancelled && es?.content) setProductos(es.content);
        try {
          const cats = await getCategorias();
          if (!cancelled) setCategorias(cats.map((c) => ({ id: c.id, nombre: c.nombre })));
        } catch {
          /* el filtro sigue usando las categorías derivadas de los productos */
        }
      } catch (err) {
        if (!cancelled) {
          setError(apiErrorMessage(err) || "Error al cargar productos");
          setProductos([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const { categoriasOptions } = useMemo(() => {
    const fromProductos = new Set(productos.map((p) => p.categoria).filter(Boolean));
    const fromApi = categorias.map((c) => c.nombre).filter(Boolean);
    const cats = [...new Set([...fromApi, ...fromProductos])].sort((a, b) =>
      a.localeCompare(b)
    );
    return { categoriasOptions: cats };
  }, [productos, categorias]);

  const productosFiltrados = useMemo(() => {
    return productos
      .filter((p) => {
        const matchSearch =
          !search ||
          p.nombre?.toLowerCase().includes(search.toLowerCase()) ||
          p.codigoBarras?.includes(search) ||
          p.descripcion?.toLowerCase().includes(search.toLowerCase());
        const matchCat = !filterCategoria || p.categoria === filterCategoria;
        const estado = getEstadoStock(p);
        const matchStock =
          filterStock === "todos" ||
          (filterStock === "normal" && estado === "normal") ||
          (filterStock === "sin"    && estado === "sin");
        return matchSearch && matchCat && matchStock;
      })
      .sort((a, b) => a.nombre?.localeCompare(b.nombre) || 0);
  }, [productos, search, filterCategoria, filterStock]);

  const totalItems    = productosFiltrados.length;
  const totalPages    = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const safePage      = Math.min(currentPage, totalPages - 1);
  const pageProductos = productosFiltrados.slice(safePage * ITEMS_PER_PAGE, (safePage + 1) * ITEMS_PER_PAGE);

  const handleSearch        = (v) => { setSearch(v);                 setCurrentPage(0); };
  const handleCategoria    = (v) => { setFilterCategoria(v);        setCurrentPage(0); };
  const handleStock        = (v) => { setFilterStock(v);            setCurrentPage(0); };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/inventario" className="p-2 rounded-lg hover:bg-white/10 text-white/50 transition-colors" aria-label="Volver">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-2xl font-semibold text-[#f1f1f3] tracking-tight">Consulta de Inventario</h1>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      <ConsultaInventarioFilters
        search={search}
        setSearch={handleSearch}
        filterCategoria={filterCategoria}
        setFilterCategoria={handleCategoria}
        filterStock={filterStock}
        setFilterStock={handleStock}
        categoriasOptions={categoriasOptions}
        disabled={loading}
      />

      <ConsultaInventarioReport
        productos={loading ? [] : pageProductos}
        loading={loading}
        currentPage={safePage}
        totalPages={totalPages}
        totalItems={totalItems}
        setCurrentPage={setCurrentPage}
      />
    </div>
  );
}
