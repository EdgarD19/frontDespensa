import { useState } from "react";
import { ClipboardList, Loader2, Eye, X, Package } from "lucide-react";
import { getEstadoStock } from "../utils";

function statusBadge(estado) {
  if (estado === "normal") return "text-green-400 bg-green-400/10 border border-green-400/20";
  if (estado === "bajo") return "text-amber-400 bg-amber-400/10 border border-amber-400/20";
  if (estado === "sin") return "text-red-400 bg-red-400/10 border border-red-400/20";
  return "text-[#5a5a6e] bg-white/5 border border-white/10";
}

const fmt = (n) =>
  Number.isFinite(n) && n > 0
    ? "$" + n.toLocaleString("es-PY", { minimumFractionDigits: 2 })
    : "—";

export default function ConsultaInventarioReport({ productos, loading }) {
  const count = productos?.length ?? 0;
  const [detalle, setDetalle] = useState(null);

  return (
    <div className="rounded-xl border border-[#1e1e24] bg-[#111114] overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-[#1e1e24]">
        <ClipboardList className="w-5 h-5 text-[#22c55e] flex-shrink-0" />
        <h3 className="text-[#f1f1f3] font-semibold text-base">
          Inventario detallado — {loading ? "…" : count} productos
        </h3>
      </div>

      <div className="p-4 sm:p-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#22c55e]" />
            <span className="text-sm text-[#5a5a6e]">Cargando inventario…</span>
          </div>
        ) : count === 0 ? (
          <p className="text-[#5a5a6e] text-center py-12 text-sm">No hay productos que coincidan con los filtros.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="text-xs text-[#5a5a6e] uppercase tracking-wider border-b border-white/10">
                  <th className="text-left py-3 pr-2">Código</th>
                  <th className="text-left py-3 px-2">Producto</th>
                  <th className="text-center py-3 px-2">Stock</th>
                  <th className="text-center py-3 px-2">Stock mín.</th>
                  <th className="text-right py-3 px-2">Precio venta</th>
                  <th className="text-right py-3 px-2">Precio compra</th>
                  <th className="text-center py-3 px-2">Estado</th>
                  <th className="text-center py-3 pl-2">Detalles</th>
                </tr>
              </thead>
              <tbody>
                {productos.map((p) => {
                  const rawStock = p.stockActual ?? p.stock;
                  const stock = Number(rawStock ?? 0);
                  const stockMin = Number(p.stockMinimo ?? 0);
                  const estado = getEstadoStock(p);
                  const precioVenta = Number(p.precioVenta ?? 0);
                  const precioCompra = Number(p.precioCompra ?? 0);

                  return (
                    <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 pr-2 text-[#5a5a6e] font-mono text-xs">{p.codigoBarras || "—"}</td>
                      <td className="py-3 px-2">
                        <p className="text-white font-medium truncate max-w-[12rem]" title={p.nombre}>{p.nombre}</p>
                      </td>
                      <td className="py-3 px-2 text-center text-white tabular-nums">{Number.isFinite(stock) ? stock : "—"}</td>
                      <td className="py-3 px-2 text-center text-white/60 tabular-nums">{Number.isFinite(stockMin) && stockMin > 0 ? stockMin : "—"}</td>
                      <td className="py-3 px-2 text-right text-white tabular-nums">{fmt(precioVenta)}</td>
                      <td className="py-3 px-2 text-right text-white/60 tabular-nums">{fmt(precioCompra)}</td>
                      <td className="py-3 px-2 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${statusBadge(estado)}`}>
                          {estado === "normal" ? "Normal" : estado === "bajo" ? "Bajo" : estado === "sin" ? "Sin stock" : "—"}
                        </span>
                      </td>
                      <td className="py-3 pl-2 text-center">
                        <button onClick={() => setDetalle(p)}
                          className="p-1.5 rounded-lg text-[#5a5a6e] hover:text-[#22c55e] hover:bg-[#22c55e]/10 transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setDetalle(null)}>
          <div onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm mx-4 rounded-2xl border border-[#1e1e24] bg-[#111114] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e24]">
              <div className="flex items-center gap-2 min-w-0">
                <Package className="w-4 h-4 text-[#22c55e] flex-shrink-0" />
                <h3 className="text-sm font-semibold text-white truncate">{detalle.nombre}</h3>
              </div>
              <button onClick={() => setDetalle(null)}
                className="p-1 rounded-lg text-[#5a5a6e] hover:text-white hover:bg-white/5 transition-colors flex-shrink-0 ml-2">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-[#5a5a6e]">Categoría</span>
                <span className="text-white font-medium">{detalle.categoria || "—"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-[#5a5a6e]">Subcategoría</span>
                <span className="text-white font-medium">{detalle.subcategoria || "—"}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-[#5a5a6e]">Marca</span>
                <span className="text-white font-medium">{detalle.marca || "—"}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
