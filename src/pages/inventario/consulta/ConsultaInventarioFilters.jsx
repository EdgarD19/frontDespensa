import { Search, X } from "lucide-react";

const fieldClass = "flex items-center gap-2 rounded-none px-3 py-2 bg-white/[0.03] border border-white/10";
const inputClass = "flex-1 bg-transparent border-none outline-none w-full text-white placeholder:text-white/30 focus:ring-0 text-sm";
const selectClass = "w-full bg-transparent border-none outline-none text-white focus:ring-0 cursor-pointer text-sm";

const stockOptions = [
  { value: "todos",  label: "Todos los estados" },
  { value: "normal", label: "Stock normal" },
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
    <div className="flex items-center gap-3">
      <div className={`${fieldClass} flex-[2] relative`}>
        <Search className="w-4 h-4 text-white/30 flex-shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, código..."
          disabled={disabled}
          className={inputClass}
        />
        {!disabled && search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            title="Limpiar búsqueda"
            aria-label="Limpiar búsqueda"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-none text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className={`${fieldClass} flex-1`}>
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

      <div className={`${fieldClass} flex-1`}>
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
  );
}
