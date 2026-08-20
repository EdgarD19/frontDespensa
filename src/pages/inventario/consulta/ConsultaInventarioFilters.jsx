import { Search } from "lucide-react";

const fieldClass = "flex items-center gap-2 rounded-lg px-3 py-2 bg-white/5 border border-white/10";
const inputClass = "flex-1 bg-transparent border-none outline-none w-full text-white placeholder:text-white/30 focus:ring-0 text-sm";
const selectClass = "w-full bg-transparent border-none outline-none text-white focus:ring-0 cursor-pointer text-sm";
const labelClass = "block text-xs font-semibold text-white/40 mb-1.5 uppercase tracking-wide";

const stockOptions = [
  { value: "todos",  label: "Todos los estados" },
  { value: "normal", label: "Stock normal" },
  { value: "bajo",   label: "Stock bajo" },
  { value: "sin",    label: "Sin stock" },
];

export default function ConsultaInventarioFilters({
  search,
  setSearch,
  filterCategoria,
  setFilterCategoria,
  filterStock,
  setFilterStock,
  categoriasOptions = [],
  disabled = false,
}) {
  return (
    <div className="rounded-lg bg-white/5 border border-white/10 p-4">

      <div className="flex items-center gap-2 pb-3 mb-4 border-b border-white/10">
        <Search className="w-4 h-4 text-white/40 flex-shrink-0" />
        <h3 className="text-white font-semibold text-sm">Búsqueda y filtrado de productos</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

        <div className="sm:col-span-2">
          <label className={labelClass}>Búsqueda general</label>
          <div className={fieldClass}>
            <Search className="w-4 h-4 text-white/30" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nombre, código de barras..."
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
                <option key={c} value={c}>{c}</option>
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
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

      </div>
    </div>
  );
}
