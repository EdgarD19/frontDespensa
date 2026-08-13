import { useState, useEffect, useMemo } from "react";
import ConsultaInventarioFilters from "./ConsultaInventarioFilters";
import ConsultaInventarioReport from "./ConsultaInventarioReport";
import { getProductos } from "../../../api/productosApi";
import { apiErrorMessage } from "../../../api/errors";
import { getEstadoStock } from "../utils";

export default function ConsultaInventario() {
  const [productos, setProductos]           = useState([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState(null);

  const [search, setSearch]                 = useState("");
  const [filterCategoria, setFilterCategoria] = useState("");
  const [filterMarca, setFilterMarca]       = useState("");
  const [filterStock, setFilterStock]       = useState("todos");

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

  const { categoriasOptions, marcasOptions } = useMemo(() => {
    const cats = [...new Set(productos.map((p) => p.categoria).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b)
    );
    const mars = [...new Set(productos.map((p) => p.marca).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b)
    );
    return { categoriasOptions: cats, marcasOptions: mars };
  }, [productos]);

  const productosFiltrados = useMemo(() => {
    return productos
      .filter((p) => {
        const matchSearch =
          !search ||
          p.nombre?.toLowerCase().includes(search.toLowerCase()) ||
          p.codigoBarras?.includes(search) ||
          p.observaciones?.toLowerCase().includes(search.toLowerCase());
        const matchCat = !filterCategoria || p.categoria === filterCategoria;
        const matchMarca = !filterMarca || p.marca === filterMarca;
        const estado = getEstadoStock(p);
        const matchStock =
          filterStock === "todos" ||
          (filterStock === "normal" && estado === "normal") ||
          (filterStock === "bajo"   && estado === "bajo")   ||
          (filterStock === "sin"    && estado === "sin");
        return matchSearch && matchCat && matchMarca && matchStock;
      })
      .sort((a, b) => a.nombre?.localeCompare(b.nombre) || 0);
  }, [productos, search, filterCategoria, filterMarca, filterStock]);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-[#f1f1f3] tracking-tight">Consulta de Inventario</h1>
        <p className="text-sm text-[#5a5a6e]">Listado completo de productos</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      <ConsultaInventarioFilters
        search={search}
        setSearch={setSearch}
        filterCategoria={filterCategoria}
        setFilterCategoria={setFilterCategoria}
        filterMarca={filterMarca}
        setFilterMarca={setFilterMarca}
        filterStock={filterStock}
        setFilterStock={setFilterStock}
        categoriasOptions={categoriasOptions}
        marcasOptions={marcasOptions}
        disabled={loading}
      />

      <ConsultaInventarioReport
        productos={loading ? [] : productosFiltrados}
        loading={loading}
      />
    </div>
  );
}
