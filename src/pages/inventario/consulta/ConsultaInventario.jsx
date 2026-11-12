import { useState, useEffect, useMemo } from "react";

import PageHeader from "../../../components/ui/PageHeader";
import { Link } from "react-router-dom";
import {  } from "lucide-react";
import ConsultaInventarioFilters from "./ConsultaInventarioFilters";
import ConsultaInventarioReport from "./ConsultaInventarioReport";
import { getProductos } from "../../../api/productosApi";
import { getCategorias, getUnidades } from "../../../api/maestrosApi";
import { apiErrorMessage } from "../../../api/errors";
import { getEstadoStock } from "../utils";

const ITEMS_PER_PAGE = 10;

export default function ConsultaInventario() {
  const [productos, setProductos]           = useState([]);
  const [categorias, setCategorias]         = useState([]);
  const [unidades, setUnidades]             = useState([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState(null);

  const [search, setSearch]                 = useState("");
  const [filterCategoria, setFilterCategoria] = useState("");
  const [filterUnidad, setFilterUnidad]     = useState("");
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
        try {
          const unis = await getUnidades();
          if (!cancelled) setUnidades(unis.map((u) => u.nombre).filter(Boolean));
        } catch {
          /* el filtro sigue usando las unidades derivadas de los productos */
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

  const { categoriasOptions, unidadesOptions } = useMemo(() => {
    const fromProductos = new Set(productos.map((p) => p.categoria).filter(Boolean));
    const fromApi = categorias.map((c) => c.nombre).filter(Boolean);
    const cats = [...new Set([...fromApi, ...fromProductos])].sort((a, b) =>
      a.localeCompare(b)
    );

    const unidadesProductos = new Set(productos.map((p) => p.unidadMedida).filter(Boolean));
    const unidadesApi = unidades.filter(Boolean);
    const unis = [...new Set([...unidadesApi, ...unidadesProductos])].sort((a, b) =>
      a.localeCompare(b)
    );

    return { categoriasOptions: cats, unidadesOptions: unis };
  }, [productos, categorias, unidades]);

  const productosFiltrados = useMemo(() => {
    return productos
      .filter((p) => {
        const matchSearch =
          !search ||
          p.nombre?.toLowerCase().includes(search.toLowerCase()) ||
          p.codigoBarras?.includes(search) ||
          p.descripcion?.toLowerCase().includes(search.toLowerCase());
        const matchCat = !filterCategoria || p.categoria === filterCategoria;
        const matchUnidad = !filterUnidad || p.unidadMedida === filterUnidad;
        const estado = getEstadoStock(p);
        const matchStock =
          filterStock === "todos" ||
          (filterStock === "normal" && estado === "normal") ||
          (filterStock === "sin"    && estado === "sin");
        return matchSearch && matchCat && matchUnidad && matchStock;
      })
      .sort((a, b) => a.nombre?.localeCompare(b.nombre) || 0);
  }, [productos, search, filterCategoria, filterUnidad, filterStock]);

  const totalItems    = productosFiltrados.length;
  const totalPages    = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const safePage      = Math.min(currentPage, totalPages - 1);
  const pageProductos = productosFiltrados.slice(safePage * ITEMS_PER_PAGE, (safePage + 1) * ITEMS_PER_PAGE);

  const handleSearch        = (v) => { setSearch(v);                 setCurrentPage(0); };
  const handleCategoria    = (v) => { setFilterCategoria(v);        setCurrentPage(0); };
  const handleUnidad       = (v) => { setFilterUnidad(v);           setCurrentPage(0); };
  const handleStock        = (v) => { setFilterStock(v);            setCurrentPage(0); };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 space-y-6">
      <PageHeader backTo="/inventario" title="Consulta de inventario" />

      {error && (
        <div className="rounded-none border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      <ConsultaInventarioFilters
        search={search}
        setSearch={handleSearch}
        filterCategoria={filterCategoria}
        setFilterCategoria={handleCategoria}
        filterUnidad={filterUnidad}
        setFilterUnidad={handleUnidad}
        filterStock={filterStock}
        setFilterStock={handleStock}
        categoriasOptions={categoriasOptions}
        unidadesOptions={unidadesOptions}
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
