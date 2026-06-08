import { useState, useEffect, useCallback } from "react";
import { DollarSign, TrendingUp, ShoppingBag, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { getIngresos } from "../../../api/ingresosApi";

const PERIODOS = [
  { key: "HOY", label: "Hoy" },
  { key: "SEMANA", label: "Esta semana" },
  { key: "MES", label: "Este mes" },
  { key: "ANIO", label: "Este a\u00f1o" },
];

export default function IngresosDashboard() {
  const [periodo, setPeriodo] = useState("HOY");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getIngresos(periodo);
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

  const formatCurrency = (n) => {
    if (n == null) return "$ --";
    return "$" + Number(n).toLocaleString("es-PY", { minimumFractionDigits: 0 });
  };

  const variacionPositiva = data?.variacionPorcentual != null && data.variacionPorcentual >= 0;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-[#f1f1f3] tracking-tight">Ingresos Totales</h1>
        <p className="text-sm text-[#5a5a6e]">Dashboard de ingresos del m&oacute;dulo de ventas</p>
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

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-[#1e1e24] bg-[#111114] px-5 py-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[#22c55e]">
            <DollarSign className="w-4 h-4" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5a5a6e]">Total ingresos</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-white">
              {loading ? "$ --" : formatCurrency(data?.totalIngresos)}
            </span>
            {data?.variacionPorcentual != null && (
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                variacionPositiva ? "text-[#22c55e] bg-[#22c55e]/10" : "text-red-400 bg-red-500/10"
              }`}>
                {variacionPositiva ? "+" : ""}{data.variacionPorcentual.toFixed(1)}%
              </span>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-[#1e1e24] bg-[#111114] px-5 py-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-blue-400">
            <ShoppingBag className="w-4 h-4" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5a5a6e]">Cantidad facturas</span>
          </div>
          <span className="text-xl font-bold text-white">
            {loading ? "--" : (data?.cantidadFacturas ?? 0)}
          </span>
        </div>

        <div className="rounded-xl border border-[#1e1e24] bg-[#111114] px-5 py-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-amber-400">
            <TrendingUp className="w-4 h-4" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5a5a6e]">Periodo anterior</span>
          </div>
          <span className="text-xl font-bold text-white">
            {loading ? "$ --" : formatCurrency(data?.totalPeriodoAnterior)}
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-[#1e1e24] bg-[#111114] p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-white/40" />
          <h3 className="text-sm font-medium text-white/60">Ingresos por periodo</h3>
        </div>
        {loading ? (
          <div className="h-64 flex items-center justify-center text-sm text-white/30">Cargando...</div>
        ) : data?.datosGrafico?.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.datosGrafico} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e24" />
              <XAxis dataKey="label" tick={{ fill: "#5a5a6e", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#5a5a6e", fontSize: 12 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => "$" + (v >= 1000 ? (v / 1000).toFixed(0) + "k" : v)} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1a1a20", border: "1px solid #2a2a30", borderRadius: 8, fontSize: 13 }}
                labelStyle={{ color: "#b0b0c0" }}
                formatter={(value) => [formatCurrency(value), "Ingresos"]}
              />
              <Bar dataKey="valor" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-sm text-white/30">Sin datos para el periodo seleccionado</div>
        )}
      </div>
    </div>
  );
}
