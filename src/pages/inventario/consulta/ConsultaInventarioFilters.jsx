import { Search } from "lucide-react";

const inputClass =
  "flex-1 bg-transparent border-none outline-none w-full text-white placeholder-[#5a5a6e] focus:ring-0 text-sm";
const selectClass =
  "w-full bg-transparent border-none outline-none text-white focus:ring-0 cursor-pointer text-sm";
const labelClass = "block text-xs font-semibold text-[#5a5a6e] mb-1.5 uppercase tracking-wide";

const stockOptions = [
  { value: "todos",  label: "Todos los estados" },
  { value: "normal", label: "Stock normal" },
  { value: "bajo",   label: "Stock bajo" },
  { value: "sin",    label: "Sin stock" },
];

export default function ConsultaInventarioFilters({
  search, setSearch,
  filterCategoria, setFilterCategoria,
  filterMarca, setFilterMarca,
  filterStock, setFilterStock,
  categoriasOptions = [],
  marcasOptions = [],
  disabled = false,
}) {
  return (
    <div className="rounded-xl border border-[#1e1e24] bg-[#111114] p-5">
      <div className="flex items-center gap-2 pb-3 mb-4 border-b border-[#1e1e24]">
        <Search className="w-5 h-5 text-[#22c55e] flex-shrink-0" />
        <h3 className="text-[#f1f1f3] font-semibold text-base">Búsqueda y filtrado</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="sm:col-span-2">
          <label className={labelClass}>Búsqueda general</label>
          <div className="flex items-center gap-2 rounded-lg border border-[#1e1e24] bg-white/5 px-3 py-2.5">
            <Search className="w-4 h-4 flex-shrink-0 text-[#5a5a6e]" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Nombre, código de barras..." disabled={disabled} className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Categoría</label>
          <div className="flex items-center gap-2 rounded-lg border border-[#1e1e24] bg-white/5 px-3 py-2.5">
            <select value={filterCategoria} onChange={(e) => setFilterCategoria(e.target.value)}
              disabled={disabled} className={selectClass}>
              <option value="">Todas</option>
              {categoriasOptions.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
          </div>
        </div>
        <div>
          <label className={labelClass}>Marca</label>
          <div className="flex items-center gap-2 rounded-lg border border-[#1e1e24] bg-white/5 px-3 py-2.5">
            <select value={filterMarca} onChange={(e) => setFilterMarca(e.target.value)}
              disabled={disabled} className={selectClass}>
              <option value="">Todas</option>
              {marcasOptions.map((m) => (<option key={m} value={m}>{m}</option>))}
            </select>
          </div>
        </div>
        <div>
          <label className={labelClass}>Estado de stock</label>
          <div className="flex items-center gap-2 rounded-lg border border-[#1e1e24] bg-white/5 px-3 py-2.5">
            <select value={filterStock} onChange={(e) => setFilterStock(e.target.value)}
              disabled={disabled} className={selectClass}>
              {stockOptions.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
