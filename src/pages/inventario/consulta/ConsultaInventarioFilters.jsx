import { Search } from "lucide-react";

/* Mismo lenguaje visual que ProductList / formularios inventario */
const fieldClass =
  "flex items-center gap-2 rounded-[25px] py-2.5 px-4 bg-[#171717] shadow-[inset_2px_5px_10px_rgb(5,5,5)]";
const inputClass =
  "flex-1 bg-transparent border-none outline-none w-full text-[#d3d3d3] placeholder-[#8b949e] focus:ring-0 text-sm";
const selectClass =
  "w-full bg-transparent border-none outline-none text-[#d3d3d3] focus:ring-0 cursor-pointer text-sm";
const labelClass = "block text-xs font-semibold text-[#8b949e] mb-1.5 uppercase tracking-wide";

const stockOptions = [
  { value: "todos", label: "Todos los estados" },
  { value: "normal", label: "Stock normal" },
  { value: "bajo", label: "Stock bajo" },
  { value: "sin", label: "Sin stock" },
];

export default function ConsultaInventarioFilters({
  search,
  setSearch,
  filterCategoria,
  setFilterCategoria,
  filterMarca,
  setFilterMarca,
  filterStock,
  setFilterStock,
  categoriasOptions = [],
  marcasOptions = [],
  disabled = false,
}) {
  return (
    <div className="bg-[#171717] rounded-[25px] p-6 shadow-[inset_2px_5px_10px_rgb(5,5,5)]">
      <div className="flex items-center gap-2 pb-3 mb-5 border-b border-[var(--accent-cyan)]/35">
        <Search className="w-5 h-5 text-[var(--accent-cyan)] flex-shrink-0" />
        <h3 className="text-[#f0f6fc] font-semibold text-base">Búsqueda y filtrado de productos</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="sm:col-span-2">
          <label className={labelClass}>Búsqueda general</label>
          <div className={fieldClass}>
            <Search className="w-5 h-5 flex-shrink-0 text-[#8b949e]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nombre, código de barras o código interno..."
              disabled={disabled}
              className={inputClass}
            />
          </div>
        </div>

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
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

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
