import { Search } from "lucide-react";
import ProductoVentaCard from "./ProductoVentaCard";

export default function CatalogoProductos({
  loading,
  error,
  search,
  onSearchChange,
  onSearchKeyDown,
  categoria,
  onCategoriaChange,
  categoriasOpciones,
  productosFiltrados,
  onAgregarProducto,
  agregando,
}) {
  return (
    <div className="rounded-xl border border-[#1e1e24] bg-[#111114] overflow-hidden flex flex-col min-h-[320px]">
      <div className="px-4 py-3 border-b border-[#1e1e24]">
        <h2 className="text-base font-semibold text-[#e1e1eb]">Catálogo</h2>
        <p className="text-xs text-[#5a5a6e] mt-0.5">Nombre, código de barras o categoría</p>
      </div>
      <div className="p-4 space-y-3 border-b border-[#1e1e24]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a5a6e]" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={onSearchKeyDown}
            placeholder="Buscar… Enter con código de barras para localizar"
            disabled={loading}
            className="w-full rounded-lg border border-[#2a2a32] bg-[#0d0d0f] pl-10 pr-3 py-2.5 text-sm text-[#f1f1f3] placeholder:text-[#4a4a5a] focus:border-[#22c55e]/50 outline-none disabled:opacity-50"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#7a7a8c] mb-1">Categoría</label>
          <select
            value={categoria}
            onChange={(e) => onCategoriaChange(e.target.value)}
            disabled={loading}
            className="w-full rounded-lg border border-[#2a2a32] bg-[#0d0d0f] px-3 py-2 text-sm text-[#f1f1f3] outline-none disabled:opacity-50"
          >
            <option value="">Todas</option>
            {categoriasOpciones.map((c) => (
              <option key={String(c)} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="p-4 flex-1 overflow-y-auto max-h-[min(70vh,720px)]">
        {error ? (
          <p className="text-sm text-rose-300">{error}</p>
        ) : loading ? (
          <p className="text-sm text-[#5a5a6e]">Cargando productos…</p>
        ) : productosFiltrados.length === 0 ? (
          <p className="text-sm text-[#5a5a6e]">No hay productos que coincidan.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {productosFiltrados.map((p) => (
              <ProductoVentaCard
                key={p.id}
                producto={p}
                disabled={agregando}
                onAgregar={onAgregarProducto}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
