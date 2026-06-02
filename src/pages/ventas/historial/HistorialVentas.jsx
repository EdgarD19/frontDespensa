import { useState, useEffect, useCallback } from "react";
import { Search, ChevronLeft, ChevronRight, FileText, Eye } from "lucide-react";
import { getFacturas } from "../../../api/ventasApi";

export default function HistorialVentas() {
  const [facturas, setFacturas] = useState([]);
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
      const res = await getFacturas({ search: searchDebounced, page, size: 15 });
      setFacturas(res.content || []);
      setTotalPages(res.totalPages || 0);
    } catch {
      setFacturas([]);
    } finally {
      setLoading(false);
    }
  }, [searchDebounced, page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-[#f1f1f3] tracking-tight">Historial de Ventas</h1>
        <p className="text-sm text-[#5a5a6e]">Consulta de comprobantes y ventas realizadas</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nro. factura..."
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[var(--accent-green)] transition-colors" />
        </div>
      </div>

      <div className="bg-[#111114] border border-[#1e1e24] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1e1e24] text-white/40 text-left">
              <th className="px-4 py-3 font-medium">N° Factura</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium text-right">Total</th>
              <th className="px-4 py-3 font-medium text-center">Estado</th>
              <th className="px-4 py-3 font-medium w-20" aria-label="Acciones" />
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-[#1e1e24]/60">
                {Array.from({ length: 6 }).map((_, j) => (
                  <td key={j} className="px-4 py-3"><div className="h-4 bg-white/10 rounded animate-pulse w-3/4" /></td>
                ))}
              </tr>
            ))}
            {!loading && facturas.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-white/30">No se encontraron ventas.</td></tr>
            )}
            {!loading && facturas.map((f) => (
              <tr key={f.idFactura} className="border-b border-[#1e1e24]/60 hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3 text-white font-mono text-xs">{f.numeroFactura}</td>
                <td className="px-4 py-3 text-white/70">
                  {f.fecha ? new Date(f.fecha).toLocaleDateString("es-PY", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                </td>
                <td className="px-4 py-3 text-white/70 max-w-[200px] truncate">{f.clienteNombre || "Consumidor Final"}</td>
                <td className="px-4 py-3 text-right text-white font-medium">
                  ₲{Number(f.total || 0).toLocaleString("es-PY")}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    f.estado === "PENDIENTE"
                      ? "bg-amber-500/10 text-amber-400"
                      : f.estado === "COMPLETADO"
                        ? "bg-green-500/10 text-green-400"
                        : "bg-white/10 text-white/50"
                  }`}>
                    {f.estado || "—"}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button className="p-1.5 rounded text-white/40 hover:text-[var(--accent-cyan)] hover:bg-white/5 transition-colors" title="Ver detalle">
                    <Eye size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-white/50">
          <span>Página {page + 1} de {totalPages}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(page - 1)} disabled={page === 0}
              className="p-1.5 rounded hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => setPage(page + 1)} disabled={page >= totalPages - 1}
              className="p-1.5 rounded hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
