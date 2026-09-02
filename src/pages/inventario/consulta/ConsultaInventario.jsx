import { useState, useEffect, useMemo } from "react";
import ConsultaInventarioFilters from "./ConsultaInventarioFilters";
import ConsultaInventarioReport from "./ConsultaInventarioReport";
import { getProductos } from "../../../api/productosApi";
import { apiErrorMessage } from "../../../api/errors";
import { getEstadoStock } from "../utils";

const ITEMS_PER_PAGE = 10;

export default function ConsultaInventario() {
  const [productos, setProductos]           = useState([]);
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
        const res = await getProductos({ pageSize: 500 });
        if (!cancelled) setProductos(res.content || []);
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
    const cats = [...new Set(productos.map((p) => p.categoria).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b)
    );
    return { categoriasOptions: cats };
  }, [productos]);

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
          (filterStock === "bajo"   && estado === "bajo")   ||
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
      <h1 className="text-2xl font-semibold text-[#f1f1f3] tracking-tight">Consulta de Inventario</h1>

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
