import { useState, useEffect, useCallback } from "react";
import { Package, TrendingUp, DollarSign } from "lucide-react";
import { getProductosMasVendidos } from "../../../api/ingresosApi";

const PERIODOS = [
  { key: "HOY", label: "Hoy" },
  { key: "SEMANA", label: "Esta semana" },
  { key: "MES", label: "Este mes" },
  { key: "ANIO", label: "Este a\u00f1o" },
];

const formatCurrency = (n) => {
  if (n == null) return "$ --";
  return "$" + Number(n).toLocaleString("es-PY", { minimumFractionDigits: 0 });
};

export default function ProductosMasVendidosDashboard() {
  const [periodo, setPeriodo] = useState("HOY");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getProductosMasVendidos(periodo);
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [periodo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-[#f1f1f3] tracking-tight">Productos m&aacute;s vendidos</h1>
        <p className="text-sm text-[#5a5a6e]">Top 5 productos por volumen de ventas</p>
      </div>

      <div className="flex gap-2">
        {PERIODOS.map((p) => (
          <button key={p.key} onClick={() => setPeriodo(p.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              periodo === p.key
                ? "bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/30"
                : "bg-[#111114] text-[#5a5a6e] border border-[#1e1e24] hover:border-[#3a3a4a] hover:text-[#b0b0c0]"
            }`}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-[#1e1e24] bg-[#111114] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1e1e24] flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#22c55e]" />
          <h3 className="text-sm font-medium text-white/60">Ranking de productos</h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-white/30">Cargando...</div>
        ) : data?.productos?.length > 0 ? (
          <div className="divide-y divide-[#1e1e24]">
            {data.productos.map((prod, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 hover:bg-[#0d0d0f]/50 transition-colors">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                  i === 0 ? "bg-yellow-500/10 text-yellow-400" :
                  i === 1 ? "bg-gray-400/10 text-gray-400" :
                  i === 2 ? "bg-amber-700/10 text-amber-600" :
                  "bg-[#1e1e24] text-[#5a5a6e]"
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{prod.nombre}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">{formatCurrency(prod.montoTotal)}</p>
                </div>
                <div className="text-right min-w-[80px]">
                  <div className="flex items-center gap-1.5 justify-end">
                    <Package className="w-3.5 h-3.5 text-[#5a5a6e]" />
                    <span className="text-sm text-[#b0b0c0]">{Number(prod.unidadesVendidas).toLocaleString("es-PY")}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-white/30">Sin ventas en el periodo seleccionado</div>
        )}
      </div>
    </div>
  );
}
