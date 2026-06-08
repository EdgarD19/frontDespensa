import { useState, useEffect, useCallback } from "react";
import { DollarSign, TrendingDown, TrendingUp, BarChart3, PieChart, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { getDashboardFinanciero } from "../../../api/cajaApi";

const PERIODOS = [
  { key: "HOY", label: "Hoy" },
  { key: "SEMANA", label: "Esta semana" },
  { key: "MES", label: "Este mes" },
  { key: "ANIO", label: "Este a\u00f1o" },
];

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

const formatCurrency = (n) => {
  if (n == null) return "Gs. --";
  return "Gs. " + Number(n).toLocaleString("es-PY", { minimumFractionDigits: 0 });
};

export default function DashboardFinanciero() {
  const [periodo, setPeriodo] = useState("HOY");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getDashboardFinanciero(periodo);
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

  const renderIndicador = (indicador, titulo, icon, color, negativo = false) => {
    if (!indicador) return null;
    const total = indicador.total || 0;
    const variacion = indicador.variacionPorcentual;
    const positiva = variacion != null && (negativo ? variacion <= 0 : variacion >= 0);

    return (
      <div className="rounded-xl border border-[#1e1e24] bg-[#111114] px-5 py-4 flex flex-col gap-1">
        <div className="flex items-center gap-2" style={{ color }}>
          {icon}
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5a5a6e]">{titulo}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold text-white">{formatCurrency(total)}</span>
          {variacion != null && (
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
              positiva ? "text-[#22c55e] bg-[#22c55e]/10" : "text-red-400 bg-red-500/10"
            }`}>
              {positiva ? "+" : ""}{variacion.toFixed(1)}%
            </span>
          )}
        </div>
      </div>
    );
  };

  const utilidad = data?.utilidadNeta?.total || 0;
  const esPerdida = utilidad < 0;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-[#f1f1f3] tracking-tight">Dashboard Financiero</h1>
        <p className="text-sm text-[#5a5a6e]">Panel de control financiero del negocio</p>
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

      {esPerdida && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/5 px-5 py-4">
          <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-red-400">P&eacute;rdida en el periodo</p>
            <p className="text-xs text-red-400/60">Los egresos superan a los ingresos en {formatCurrency(Math.abs(utilidad))}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {renderIndicador(data?.ingresos, "Ingresos totales", <DollarSign className="w-4 h-4" />, "#22c55e")}
        {renderIndicador(data?.egresos, "Egresos totales", <TrendingDown className="w-4 h-4" />, "#ef4444", true)}
        {renderIndicador(data?.utilidadNeta, "Utilidad Neta", <TrendingUp className="w-4 h-4" />, esPerdida ? "#ef4444" : "#22c55e")}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-xl border border-[#1e1e24] bg-[#111114] p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-white/40" />
            <h3 className="text-sm font-medium text-white/60">Top 5 Categor&iacute;as</h3>
          </div>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-sm text-white/30">Cargando...</div>
          ) : data?.topCategorias?.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.topCategorias} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e24" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#5a5a6e", fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => "$" + (v >= 1000 ? (v / 1000).toFixed(0) + "k" : v)} />
                <YAxis type="category" dataKey="label" tick={{ fill: "#b0b0c0", fontSize: 12 }} axisLine={false} tickLine={false} width={110} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1a1a20", border: "1px solid #2a2a30", borderRadius: 8, fontSize: 13 }}
                  labelStyle={{ color: "#b0b0c0" }}
                  formatter={(value) => [formatCurrency(value), "Ventas"]}
                />
                <Bar dataKey="valor" radius={[0, 4, 4, 0]} maxBarSize={28}>
                  {data.topCategorias.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-sm text-white/30">Sin datos</div>
          )}
        </div>

        <div className="rounded-xl border border-[#1e1e24] bg-[#111114] p-6">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-4 h-4 text-white/40" />
            <h3 className="text-sm font-medium text-white/60">M&eacute;todo de Pago</h3>
          </div>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-sm text-white/30">Cargando...</div>
          ) : data?.metodoPago?.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.metodoPago} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e24" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#5a5a6e", fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => "$" + (v >= 1000 ? (v / 1000).toFixed(0) + "k" : v)} />
                <YAxis type="category" dataKey="label" tick={{ fill: "#b0b0c0", fontSize: 12 }} axisLine={false} tickLine={false} width={110} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1a1a20", border: "1px solid #2a2a30", borderRadius: 8, fontSize: 13 }}
                  labelStyle={{ color: "#b0b0c0" }}
                  formatter={(value) => [formatCurrency(value), "Total"]}
                />
                <Bar dataKey="valor" radius={[0, 4, 4, 0]} maxBarSize={28}>
                  {data.metodoPago.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-sm text-white/30">Sin datos</div>
          )}
        </div>
      </div>
    </div>
  );
}
