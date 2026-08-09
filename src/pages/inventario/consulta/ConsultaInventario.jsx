
// useState  → estado local del componente
// useEffect → ejecuta código tras el render (aquí: carga inicial de productos)
// useMemo   → memoriza un valor calculado para no recalcularlo en cada render
import { useState, useEffect, useMemo } from "react";

// Componentes hijos:
//   ConsultaInventarioFilters → barra de filtros (search, categoría, marca, stock)
//   ConsultaInventarioReport  → tabla/reporte con los productos filtrados
import ConsultaInventarioFilters from "./ConsultaInventarioFilters";
import ConsultaInventarioReport from "./ConsultaInventarioReport";

// Función que llama al backend para obtener la lista paginada de productos
import { getProductos } from "../../../api/productosApi";

// Extrae un mensaje legible del error que devuelve Axios/fetch
import { apiErrorMessage } from "../../../api/errors";

// Función utilitaria que calcula el estado de stock de un producto:
// devuelve "normal", "bajo" o "sin" según stockActual vs stockMinimo
import { getEstadoStock } from "../utils";

/*
    // COMPONENTE PRINCIPAL: ConsultaInventario
  Este componente es el "orquestador" de la vista de consulta de inventario.
  Su trabajo:
    1. Cargar los productos del backend al montar
    2. Mantener el estado de los filtros
    3. Derivar las opciones de los selects (categorías, marcas) desde los datos
    4. Filtrar y ordenar los productos según los filtros activos
    5. Pasarle todo a los componentes hijos (Filters y Report)
*/
export default function ConsultaInventario() {

  // ESTADOS

  const [productos, setProductos]           = useState([]);     // Lista completa del backend
  const [loading, setLoading]               = useState(true);   // true mientras espera la respuesta
  const [error, setError]                   = useState(null);   // Mensaje de error (null = sin error)

  // Estados de cada filtro de la barra de búsqueda
  const [search, setSearch]                 = useState("");         // Búsqueda libre (nombre, código, etc.)
  const [filterCategoria, setFilterCategoria] = useState("");       // Categoría seleccionada ("" = todas)
  const [filterMarca, setFilterMarca]       = useState("");         // Marca seleccionada ("" = todas)
  const [filterStock, setFilterStock]       = useState("todos");    // Estado de stock: "todos"|"normal"|"bajo"|"sin"

  // CARGA INICIAL DE DATOS 

  /*
    useEffect con array vacío [] → se ejecuta UNA sola vez al montar el componente.

  */
  useEffect(() => {
    let cancelled = false; // Bandera: pasa a true si el componente se desmonta

    (async () => {
      try {
        setError(null);
        setLoading(true);
        const res = await getProductos({ pageSize: 500 }); // Trae hasta 500 productos
        if (!cancelled) setProductos(res.content || []); // Solo actualiza si seguimos montados
      } catch (err) {
        if (!cancelled) {
          setError(apiErrorMessage(err) || "Error al cargar productos");
          setProductos([]);
        }
      } finally {
        if (!cancelled) setLoading(false); // Siempre quita el spinner (si seguimos montados)
      }
    })(); // ← Paréntesis que INVOCA la función async inmediatamente

    // Función de limpieza: se ejecuta cuando el componente se desmonta
    return () => {
      cancelled = true; // Marca que ya no interesa la respuesta pendiente
    };
  }, []); // [] → solo al montar


  /*
        OPCIONES DERIVADAS PARA LOS SELECTS (useMemo) 
    useMemo(() => calcular, [deps])
   
    Paso a paso de categoriasOptions:
      productos.map(p => p.categoria)   → ["Lácteos", "Lácteos", "Bebidas", null, ...]
      .filter(Boolean)                  → elimina null, undefined y ""
      new Set(...)                      → elimina duplicados (Set solo guarda únicos)
      [...new Set(...)]                 → convierte el Set de vuelta a array
      .sort(localeCompare)              → ordena alfabéticamente en español
  */
  const { categoriasOptions, marcasOptions } = useMemo(() => {
    const cats = [...new Set(productos.map((p) => p.categoria).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b)
    );
    const mars = [...new Set(productos.map((p) => p.marca).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b)
    );
    return { categoriasOptions: cats, marcasOptions: mars };
  }, [productos]); // Solo recalcula cuando cambia la lista de productos

  // PRODUCTOS FILTRADOS (useMemo) 

  const productosFiltrados = useMemo(() => {
    return productos
      .filter((p) => {
        /*
          Filtro de búsqueda libre: nombre, código de barras y observaciones.
          Si `search` está vacío (!search), el producto siempre pasa.
        */
        const matchSearch =
          !search ||
          p.nombre?.toLowerCase().includes(search.toLowerCase()) ||
          p.codigoBarras?.includes(search) ||
          p.observaciones?.toLowerCase().includes(search.toLowerCase());

        // Filtro de categoría: coincidencia exacta (no parcial)
        const matchCat = !filterCategoria || p.categoria === filterCategoria;

        // Filtro de marca: coincidencia exacta
        const matchMarca = !filterMarca || p.marca === filterMarca;

        /*
          Filtro de estado de stock:
          getEstadoStock(p) devuelve "normal", "bajo" o "sin"
          comparamos con el valor del select (filterStock).
          "todos" siempre pasa (primera condición del ||).
        */
        const estado = getEstadoStock(p);
        const matchStock =
          filterStock === "todos" ||
          (filterStock === "normal" && estado === "normal") ||
          (filterStock === "bajo"   && estado === "bajo")   ||
          (filterStock === "sin"    && estado === "sin");

        // El producto pasa el filtro global solo si cumple LOS CUATRO criterios
        return matchSearch && matchCat && matchMarca && matchStock;
      })
      // Ordena los resultados alfabéticamente por nombre
      .sort((a, b) => a.nombre?.localeCompare(b.nombre) || 0);

  }, [productos, search, filterCategoria, filterMarca, filterStock]);
  // ↑ Recalcula solo cuando cambia alguno de estos cinco valores


  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">

      {/* Encabezado de la sección */}
      <div>
        <h1 className="text-2xl font-semibold text-[#f1f1f3] tracking-tight">
          Consulta de Inventario
        </h1>
        <p className="text-sm text-[#5a5a6e]">
          Listado completo de productos
        </p>
      </div>

      {/*
        Renderizado condicional del error:
        Si error tiene valor → muestra el bloque rojo
        Si es null → no renderiza nada
      */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/*
        ConsultaInventarioFilters: barra de filtros.
        Recibe los valores actuales de cada filtro y sus setters
        para que el hijo pueda actualizar el estado del padre (lifting state up).
        disabled={loading} → deshabilita los inputs mientras carga
      */}
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

      {/*
        ConsultaInventarioReport: tabla con los productos.
        Si loading es true → pasa [] para que muestre el estado vacío/spinner
        Si loading es false → pasa los productos ya filtrados y ordenados
      */}
      <ConsultaInventarioReport
        productos={loading ? [] : productosFiltrados}
        loading={loading}
      />

    </div>
  );
}
