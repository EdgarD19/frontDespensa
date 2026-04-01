// ícono de lupa 
import { Search } from "lucide-react";

// Contenedor de cada campo: fondo oscuro, bordes pill, sombra interior
const fieldClass =
  "flex items-center gap-2 rounded-[25px] py-2.5 px-4 bg-[#171717] shadow-[inset_2px_5px_10px_rgb(5,5,5)]";

// Input de texto: sin fondo propio, sin borde, texto claro
const inputClass =
  "flex-1 bg-transparent border-none outline-none w-full text-[#d3d3d3] placeholder-[#8b949e] focus:ring-0 text-sm";

// Select (desplegable): mismas reglas que el input
const selectClass =
  "w-full bg-transparent border-none outline-none text-[#d3d3d3] focus:ring-0 cursor-pointer text-sm";

// Label encima de cada campo: mayúsculas pequeñas con tracking amplio
const labelClass = "block text-xs font-semibold text-[#8b949e] mb-1.5 uppercase tracking-wide";

// DATOS ESTÁTICOS: opciones del select "Estado de stock"

/*
    value → el string que se guarda en el estado (filterStock)
    label → el texto que ve el usuario en el desplegable
*/
const stockOptions = [
  { value: "todos",  label: "Todos los estados" },
  { value: "normal", label: "Stock normal" },
  { value: "bajo",   label: "Stock bajo" },
  { value: "sin",    label: "Sin stock" },
];


/*
  Componente presentacional:  Solo muestra los controles de filtro y notifica cambios al padre

  Props que recibe:
    search / setSearch               → input de búsqueda libre
    filterCategoria / setFilterCategoria → select de categoría
    filterMarca / setFilterMarca     → select de marca
    filterStock / setFilterStock     → select de estado de stock
    categoriasOptions                → array de strings con las categorías disponibles
                                       (derivado de los productos en el padre con useMemo)
    marcasOptions                    → ídem para marcas
    disabled                         → booleano: deshabilita todos los controles
                                       mientras el padre está cargando datos
*/
export default function ConsultaInventarioFilters({
  search,
  setSearch,
  filterCategoria,
  setFilterCategoria,
  filterMarca,
  setFilterMarca,
  filterStock,
  setFilterStock,
  categoriasOptions = [], // Valor por defecto: array vacío (evita errores si no llega)
  marcasOptions = [],
  disabled = false,
}) {
  return (
    // Tarjeta contenedora con fondo oscuro y sombra interior
    <div className="bg-[#171717] rounded-[25px] p-6 shadow-[inset_2px_5px_10px_rgb(5,5,5)]">

      {/* Encabezado de la sección con ícono en color cyan */}
      <div className="flex items-center gap-2 pb-3 mb-5 border-b border-[var(--accent-cyan)]/35">
        {/*
          /35 es la opacidad del borde
        */}
        <Search className="w-5 h-5 text-[var(--accent-cyan)] flex-shrink-0" />
        <h3 className="text-[#f0f6fc] font-semibold text-base">
          Búsqueda y filtrado de productos
        </h3>
      </div>

      {/*
        Grid responsivo de filtros:
          1 columna  en mobile
          2 columnas en sm (≥640px)
          4 columnas en lg (≥1024px)

        El input de búsqueda ocupa 2 columnas en sm (sm:col-span-2)
        para tener más espacio al escribir, y vuelve a 1 en lg
        porque hay 4 columnas disponibles.
      */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* INPUT: Búsqueda general */}
        {/*
          sm:col-span-2 → en tablet ocupa las 2 columnas completas
          En lg (4 columnas) también ocupa 2, dejando las otras 2 para
          categoría y marca (filterStock queda debajo en lg con 1 columna).

          onChange inline: cada tecla llama a setSearch con el nuevo valor.
          Como setSearch viene del padre, actualiza el estado en ConsultaInventario,
          que re-renderiza y recalcula productosFiltrados con useMemo.
        */}
        <div className="sm:col-span-2">
          <label className={labelClass}>Búsqueda general</label>
          <div className={fieldClass}>
            <Search className="w-5 h-5 flex-shrink-0 text-[#8b949e]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nombre, código de barras o código interno..."
              disabled={disabled} // Bloqueado mientras carga el inventario
              className={inputClass}
            />
          </div>
        </div>

        {/* SELECT: Categoría */}
        {/*
          categoriasOptions es un array de strings (no de objetos {id, nombre}).
          Por eso key={c} y value={c} usan el string directamente,
          a diferencia de los selects en ProductForm que usaban {id, nombre}.
          El array viene derivado con useMemo en el padre desde los productos.
        */}
        <div>
          <label className={labelClass}>Categoría</label>
          <div className={fieldClass}>
            <select
              value={filterCategoria}
              onChange={(e) => setFilterCategoria(e.target.value)}
              disabled={disabled}
              className={selectClass}
            >
              <option value="">Todas las categorías</option>
              {categoriasOptions.map((c) => (
                // key={c} → usa el string como key (son únicos porque vienen de un Set)
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* SELECT: Marca  */}        
        <div>
          <label className={labelClass}>Marca</label>
          <div className={fieldClass}>
            <select
              value={filterMarca}
              onChange={(e) => setFilterMarca(e.target.value)}
              disabled={disabled}
              className={selectClass}
            >
              <option value="">Todas las marcas</option>
              {marcasOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/*
            SELECT: Estado de stock
          A diferencia de categorías y marcas (que vienen del backend),
          las opciones de stock son estáticas (definidas en stockOptions arriba).
          key={o.value} y value={o.value} usan el identificador interno,
          mientras que o.label es el texto visible para el usuario.
        */}
        <div>
          <label className={labelClass}>Estado de stock</label>
          <div className={fieldClass}>
            <select
              value={filterStock}
              onChange={(e) => setFilterStock(e.target.value)}
              disabled={disabled}
              className={selectClass}
            >
              {stockOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

      </div>
    </div>
  );
}
