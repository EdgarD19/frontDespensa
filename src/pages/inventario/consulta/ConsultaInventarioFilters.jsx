import { Search } from "lucide-react";

const fieldClass = "flex items-center gap-2 rounded-lg px-3 py-2 bg-white/5 border border-white/10";
const inputClass = "flex-1 bg-transparent border-none outline-none w-full text-white placeholder:text-white/30 focus:ring-0 text-sm";
const selectClass = "w-full bg-transparent border-none outline-none text-white focus:ring-0 cursor-pointer text-sm";

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
    <div className="flex items-center gap-3">
      <div className={`${fieldClass} flex-[2]`}>
        <Search className="w-4 h-4 text-white/30 flex-shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, código..."
          disabled={disabled}
          className={inputClass}
        />
      </div>

      <div className={`${fieldClass} flex-1`}>
        <select
          value={filterCategoria}
          onChange={(e) => setFilterCategoria(e.target.value)}
          disabled={disabled}
          className={selectClass}
        >
          <option value="">Categoría</option>
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
