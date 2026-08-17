import { Search, Pencil, ChevronLeft, ChevronRight, ToggleLeft, ToggleRight, Plus } from "lucide-react";

function formatPrecioVenta(p) {
  const n = Number(p.precioVenta ?? p.price ?? 0);
  return n.toLocaleString("es-PY");
}

export default function ProductList({
  products = [],
  loading = false,
  search = "",
  onSearch,
  onSeleccionar,
  onToggleActivo,
  onNuevo,
  paginacion = { page: 0, totalPages: 0 },
  onPageChange,
}) {
  return (
    <div className="flex flex-col gap-4">

      {/* Barra superior */}
      <div className="flex items-center gap-3 py-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Buscar por nombre, código de barras..."
            className="w-full bg-white/5 border border-white/10 rounded-lg
              pl-9 pr-4 py-2 text-sm text-white placeholder:text-white/30
              focus:outline-none focus:border-[var(--accent-green)] transition-colors"
          />
        </div>

        <button
          type="button"
          onClick={onNuevo}
          className="flex items-center gap-2 bg-[var(--accent-green)] hover:opacity-90
            text-black text-sm font-medium px-4 py-2 rounded-lg
            transition-opacity whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Nuevo producto
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-[var(--bg-card)] border border-white/5 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-white/40 text-left">
              <th className="px-4 py-3 font-medium">Código</th>
              <th className="px-4 py-3 font-medium">Producto</th>
              <th className="px-4 py-3 font-medium">Categoría</th>
              <th className="px-4 py-3 font-medium">Unidad</th>
              <th className="px-4 py-3 font-medium text-right">Precio venta</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium w-24" aria-label="Acciones" />
            </tr>
          </thead>

          <tbody>
            {loading && (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-white/5">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-white/10 rounded animate-pulse w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            )}

            {!loading && products.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-white/30">
                  No se encontraron productos.
                </td>
              </tr>
            )}

            {!loading && products.map((p) => {
              const activo = p.activo !== false;

              return (
                <tr
                  key={p.id}
                  onClick={() => onSeleccionar?.(p)}
                  className={`border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors ${
                    !activo ? "opacity-60" : ""
                  }`}
                >
                  <td className="px-4 py-3 text-white/40 font-mono text-xs">
                    {p.codigoBarras || "—"}
                  </td>
                  <td className="px-4 py-3 text-white font-medium truncate max-w-[14rem]" title={p.nombre}>
                    {p.nombre}
                  </td>
                  <td className="px-4 py-3">
                    {p.categoria ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
                        {p.categoria}
                      </span>
                    ) : (
                      <span className="text-white/30">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-white/70">
                    {p.unidadMedida || "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-[var(--accent-green)] tabular-nums">
                    ₲{formatPrecioVenta(p)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      activo
                        ? "bg-green-500/10 text-green-400"
                        : "bg-red-500/10 text-red-400"
                    }`}>
                      {activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSeleccionar?.(p);
                        }}
                        className="p-1.5 rounded text-white/40 hover:text-green-400 hover:bg-green-500/10 transition-colors"
                        title="Editar producto"
                        aria-label="Editar producto"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleActivo?.(p);
                        }}
                        className={`p-1.5 rounded transition-colors ${
                          activo
                            ? "text-green-400 hover:bg-green-500/10"
                            : "text-white/40 hover:text-green-400 hover:bg-green-500/10"
                        }`}
                        title={activo ? "Inactivar producto" : "Activar producto"}
                        aria-label={activo ? "Inactivar producto" : "Activar producto"}
                      >
                        {activo ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {paginacion.totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm text-white/50">
          <button
            type="button"
            onClick={() => onPageChange(paginacion.page - 1)}
            disabled={paginacion.page === 0}
            className="p-1.5 rounded hover:bg-white/10 disabled:opacity-30
              disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} />
          </button>

          <span>
            Página {paginacion.page + 1} de {paginacion.totalPages}
          </span>

          <button
            type="button"
            onClick={() => onPageChange(paginacion.page + 1)}
            disabled={paginacion.page >= paginacion.totalPages - 1}
            className="p-1.5 rounded hover:bg-white/10 disabled:opacity-30
              disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
