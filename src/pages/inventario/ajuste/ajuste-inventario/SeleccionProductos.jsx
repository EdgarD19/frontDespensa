import { Search, Package } from "lucide-react";
import { getEstadoStock } from "../../utils";
import { stockEntero } from "./utils";

function StockBadge({ producto, stock }) {
  const est = getEstadoStock(producto);
  if (est === "sin") {
    return <span className="text-xs sm:text-sm font-semibold text-rose-400 whitespace-nowrap">Sin Stock</span>;
  }
  if (est === "bajo") {
    return (
      <span className="text-xs sm:text-sm font-semibold text-amber-400 tabular-nums whitespace-nowrap">
        {stock} (Bajo)
      </span>
    );
  }
  if (est === "desconocido") {
    return <span className="text-xs sm:text-sm text-[#5a5a6e] tabular-nums whitespace-nowrap">{stock}</span>;
  }
  return (
    <span className="text-xs sm:text-sm font-semibold text-[#22c55e] tabular-nums whitespace-nowrap">{stock}</span>
  );
}

export default function SeleccionProductos({
  loading,
  search,
  onSearchChange,
  productosFiltrados,
  productoSeleccionado,
  onSelectProducto,
}) {
  return (
    <div className="rounded-xl border border-[#1e1e24] bg-[#111114] overflow-hidden">
      <div className="px-5 pt-5 pb-3 border-b border-[#1e1e24]">
        <h2 className="text-base font-semibold text-[#e1e1eb] flex items-center gap-2">
          <Package className="w-5 h-5 text-[#22c55e] shrink-0" aria-hidden />
          Selección de Productos
        </h2>
      </div>
      <div className="p-5 pt-4 space-y-4">
        <div className="rounded-lg border border-[#1e1e24] bg-[#0d0d0f] px-3 py-2.5 text-xs sm:text-sm text-[#9a9aac] leading-snug">
          Registrá entradas, salidas o ajustes de stock. Cada movimiento queda en el historial y actualiza
          el stock del producto.
        </div>

        <label className="block space-y-1">
          <span className="sr-only">Buscar producto</span>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a5a6e]" />
            <input
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              disabled={loading}
              placeholder="Buscar por nombre o código de barras…"
              className="w-full rounded-lg border border-[#2a2a32] bg-[#0d0d0f] pl-10 pr-3 py-2.5 text-sm text-[#f1f1f3] placeholder:text-[#4a4a5a] focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/20 outline-none disabled:opacity-50"
            />
          </div>
        </label>

        <div className="rounded-lg border border-[#1e1e24] overflow-hidden max-h-[min(24rem,50vh)] overflow-y-auto bg-[#0d0d0f]">
          {loading ? (
            <p className="p-4 text-sm text-[#5a5a6e]">Cargando productos…</p>
          ) : productosFiltrados.length === 0 ? (
            <p className="p-4 text-sm text-[#5a5a6e]">No hay coincidencias.</p>
          ) : (
            <ul className="divide-y divide-[#1e1e24]">
              {productosFiltrados.map((p) => {
                const sel = productoSeleccionado?.id === p.id;
                const st = stockEntero(p);
                const sub = [p.codigoBarras ? String(p.codigoBarras) : null, p.categoria]
                  .filter(Boolean)
                  .join(" • ");
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => onSelectProducto(p)}
                      className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${
                        sel
                          ? "bg-[#22c55e]/10"
                          : "border-l-transparent hover:bg-[#15151a]"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-[#f1f1f3] block truncate">{p.nombre}</span>
                        {sub ? (
                          <span className="text-xs text-[#5a5a6e] block truncate mt-0.5">{sub}</span>
                        ) : null}
                      </div>
                      <StockBadge producto={p} stock={st} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
