import { useState, useEffect, useCallback } from "react";
import { Search, ChevronLeft, ChevronRight, Package } from "lucide-react";
import { getCompras } from "../../../api/comprasApi";

export default function HistorialCompras() {
  const [compras, setCompras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const DEBOUNCE_MS = 400;

  useEffect(() => {
    const t = setTimeout(() => { setSearchDebounced(search); setPage(0); }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCompras({ search: searchDebounced, page, size: 15 });
      setCompras(res.content || []);
      setTotalPages(res.totalPages || 0);
    } catch {
      setCompras([]);
    } finally {
      setLoading(false);
    }
  }, [searchDebounced, page]);

  useEffect(() => { load(); }, [load]);

  const formatFecha = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("es-PY", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-[#f1f1f3] tracking-tight">Historial de Compras</h1>
        <p className="text-sm text-[#5a5a6e]">Consultá las facturas de compra registradas</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3a3a4a]" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por proveedor..."
          className="w-full max-w-md bg-white/5 border border-white/10 rounded-lg pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#22c55e]/50" />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-[#5a5a6e] uppercase tracking-wider border-b border-white/10">
              <th className="text-left py-3 pr-2">#</th>
              <th className="text-left py-3 px-2">Fecha</th>
              <th className="text-left py-3 px-2">Proveedor</th>
              <th className="text-right py-3 px-2">Total</th>
              <th className="text-center py-3 pl-2">Items</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-white/5">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="py-3 px-2"><div className="h-4 bg-white/5 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : compras.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center">
                  <Package className="w-8 h-8 mx-auto text-[#3a3a4a] mb-2" />
                  <p className="text-sm text-[#5a5a6e]">Sin compras registradas</p>
                </td>
              </tr>
            ) : (
              compras.map((c, i) => (
                <tr key={c.idFacturaCompra} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 pr-2 text-white/60 text-xs">{page * 15 + i + 1}</td>
                  <td className="py-3 px-2 text-white">{formatFecha(c.fecha)}</td>
                  <td className="py-3 px-2 text-white font-medium">{c.proveedorNombre || "—"}</td>
                  <td className="py-3 px-2 text-right text-white font-semibold">
                    ${c.total ? Number(c.total).toLocaleString("es-PY", { minimumFractionDigits: 2 }) : "0.00"}
                  </td>
                  <td className="py-3 pl-2 text-center text-white/60">{c.cantidadItems ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
            className="p-2 rounded-lg text-[#5a5a6e] hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-[#5a5a6e]">Página {page + 1} de {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            className="p-2 rounded-lg text-[#5a5a6e] hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
