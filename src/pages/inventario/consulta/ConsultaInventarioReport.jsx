import { Search, Loader2 } from "lucide-react";

const fieldClass = "flex items-center gap-2 rounded-lg px-3 py-2 bg-white/5 border border-white/10";
const inputClass = "flex-1 bg-transparent border-none outline-none w-full text-white placeholder:text-white/30 focus:ring-0 text-sm";

export default function ConsultaInventarioReport({ productos, loading }) {
  const count = productos?.length ?? 0;

  return (
    <div className="rounded-lg bg-white/5 border border-white/10 flex flex-col min-h-[60vh]">

      <div className="p-4 border-b border-white/10 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Inventario detallado</h2>
          <p className="text-xs text-white/40 mt-0.5">{loading ? "Cargando..." : `${count} productos`}</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/40 gap-3">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="text-sm">Cargando inventario...</span>
          </div>
        ) : count === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="w-8 h-8 text-white/20 mb-3" />
            <p className="text-white/40 text-sm">No hay productos que coincidan con los filtros</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="bg-white/5 text-left">
                  <th className="px-4 py-3 font-medium text-white/40 border-b border-white/10">Código</th>
                  <th className="px-4 py-3 font-medium text-white/40 border-b border-white/10">Producto</th>
                  <th className="px-4 py-3 font-medium text-white/40 border-b border-white/10">Categoría</th>
                  <th className="px-4 py-3 font-medium text-white/40 border-b border-white/10">Marca</th>
                  <th className="px-4 py-3 font-medium text-white/40 border-b border-white/10">Unidad</th>
                  <th className="px-4 py-3 font-medium text-white/40 border-b border-white/10 text-center">Stock</th>
                </tr>
              </thead>
              <tbody>
                {productos.map((p) => {
                  const rawStock = p.stockActual ?? p.stock;
                  const stockUnknown = rawStock === "" || rawStock === undefined || rawStock === null;
                  const stock = Number(rawStock ?? 0);
                  const stockText = stockUnknown || !Number.isFinite(stock)
                    ? "—"
                    : `${stock}${p.unidadMedida ? ` ${p.unidadMedida}` : ""}`;

                  return (
                    <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-white/40 font-mono text-xs align-middle">
                        {p.codigoBarras || "—"}
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <p className="font-medium text-white truncate max-w-[14rem]" title={p.nombre}>{p.nombre}</p>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        {p.categoria ? (
                          <span className="inline-block rounded-full bg-[var(--accent-green)]/15 text-[var(--accent-green)] px-2.5 py-0.5 text-xs font-medium">
                            {p.categoria}
                          </span>
                        ) : (
                          <span className="text-white/40">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <span className="text-white/50 text-sm">{p.marca || "—"}</span>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <span className="text-white/50 text-sm">{p.unidadMedida || "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-white/60 tabular-nums align-middle">
                        {stockText}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
