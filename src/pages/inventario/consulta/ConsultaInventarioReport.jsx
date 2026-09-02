import { getEstadoStock } from "../utils";

const estadoStockConfig = {
  normal: { label: "Normal", cls: "bg-green-500/10 text-green-400" },
  bajo: { label: "Bajo", cls: "bg-amber-500/10 text-amber-400" },
  sin: { label: "Sin stock", cls: "bg-red-500/10 text-red-400" },
  desconocido: { label: "Desconocido", cls: "bg-white/10 text-white/40" },
};

const pageBtn = "px-2 py-1 rounded text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors text-sm";

export default function ConsultaInventarioReport({
  productos,
  loading,
  currentPage = 0,
  totalPages = 1,
  totalItems = 0,
  setCurrentPage,
}) {
  const count = productos?.length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-[var(--bg-card)] border border-white/5 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-white/40 text-left">
              <th className="px-4 py-3 font-medium">Código</th>
              <th className="px-4 py-3 font-medium">Producto</th>
              <th className="px-4 py-3 font-medium">Categoría</th>
              <th className="px-4 py-3 font-medium">Unidad</th>
              <th className="px-4 py-3 font-medium text-right">Stock actual</th>
              <th className="px-4 py-3 font-medium">Estado</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-white/5">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-white/10 rounded animate-pulse w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            )}

            {!loading && count === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-white/30">
                  No hay productos que coincidan con los filtros.
                </td>
              </tr>
            )}

            {!loading &&
              productos.map((p) => {
                const rawStock = p.stockActual ?? p.stock;
                const stockUnknown =
                  rawStock === "" || rawStock === undefined || rawStock === null;
                const stock = Number(rawStock ?? 0);
                const stockText =
                  stockUnknown || !Number.isFinite(stock)
                    ? "—"
                    : `${stock}${p.unidadMedida ? ` ${p.unidadMedida}` : ""}`;
                const estado = getEstadoStock(p);
                const estadoCfg = estadoStockConfig[estado] || estadoStockConfig.desconocido;

                return (
                  <tr
                    key={p.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-3 text-white/40 font-mono text-xs">
                      {p.codigoBarras || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white font-medium truncate max-w-[14rem]" title={p.nombre}>
                        {p.nombre}
                      </p>
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
                    <td className="px-4 py-3 text-white/70">{p.unidadMedida || "—"}</td>
                    <td className="px-4 py-3 text-right text-white/80 tabular-nums">
                      {stockText}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${estadoCfg.cls}`}>
                        {estadoCfg.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {!loading && totalItems > 0 && (
        <div className="flex items-center justify-center gap-1 text-sm select-none">
          <button
            disabled={currentPage <= 0}
            onClick={() => setCurrentPage(0)}
            className={pageBtn}
            title="Primera página"
          >
            &laquo;
          </button>
          <button
            disabled={currentPage <= 0}
            onClick={() => setCurrentPage(currentPage - 1)}
            className={pageBtn}
            title="Página anterior"
          >
            &lsaquo;
          </button>

          <span className="px-3 text-white/50">
            Página {currentPage + 1} de {totalPages}
          </span>

          <button
            disabled={currentPage >= totalPages - 1}
            onClick={() => setCurrentPage(currentPage + 1)}
            className={pageBtn}
            title="Página siguiente"
          >
            &rsaquo;
          </button>
          <button
            disabled={currentPage >= totalPages - 1}
            onClick={() => setCurrentPage(totalPages - 1)}
            className={pageBtn}
            title="Última página"
          >
            &raquo;
          </button>
        </div>
      )}
    </div>
  );
}