import { Link } from "react-router-dom";
import { Truck, ShoppingCart, Calendar, Users, TrendingUp, History } from "lucide-react";

const KPI_CLASS = "flex flex-col gap-1 rounded-xl border border-[#1e1e24] bg-[#111114] px-5 py-4";
const CARD_CLASS = "group flex flex-col items-center justify-center gap-3 rounded-2xl border border-[#1e1e24] bg-[#111114] p-6 transition-all duration-200 hover:border-[#22c55e]/40 hover:bg-[#13131a] aspect-[4/3]";

export default function ComprasHub() {
  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-[#f1f1f3] tracking-tight">Compras</h1>
        <p className="text-sm text-[#5a5a6e]">Panel de control del módulo de compras</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-[#3a3a4a] uppercase tracking-widest">KPIs</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className={KPI_CLASS}>
            <div className="flex items-center gap-2 text-[#22c55e]">
              <ShoppingCart className="w-4 h-4" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5a5a6e]">Compras del mes</span>
            </div>
            <span className="text-xl font-bold text-white">--</span>
          </div>
          <div className={KPI_CLASS}>
            <div className="flex items-center gap-2 text-blue-400">
              <Users className="w-4 h-4" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5a5a6e]">Proveedores activos</span>
            </div>
            <span className="text-xl font-bold text-white">--</span>
          </div>
          <div className={KPI_CLASS}>
            <div className="flex items-center gap-2 text-amber-400">
              <Calendar className="w-4 h-4" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5a5a6e]">Última compra</span>
            </div>
            <span className="text-xl font-bold text-white">--</span>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-[#3a3a4a] uppercase tracking-widest">Acciones rápidas</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <Link to="/compras/nueva" className={CARD_CLASS}>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#22c55e]/8 border border-[#22c55e]/15 text-[#22c55e]">
              <ShoppingCart className="w-7 h-7" />
            </div>
            <span className="text-sm font-semibold text-white">Nueva Compra</span>
          </Link>
          <Link to="/compras/proveedores" className={CARD_CLASS}>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#22c55e]/8 border border-[#22c55e]/15 text-[#22c55e]">
              <Truck className="w-7 h-7" />
            </div>
            <span className="text-sm font-semibold text-white">Proveedores</span>
          </Link>
          <Link to="/compras/historial" className={CARD_CLASS}>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#22c55e]/8 border border-[#22c55e]/15 text-[#22c55e]">
              <History className="w-7 h-7" />
            </div>
            <span className="text-sm font-semibold text-white">Historial de Compras</span>
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-[#3a3a4a] uppercase tracking-widest">Información</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-[#1e1e24] bg-[#111114] p-5">
            <h3 className="text-sm font-medium text-white/60 mb-3">Últimas compras</h3>
            <p className="text-xs text-white/30">Sin datos disponibles</p>
          </div>
          <div className="rounded-xl border border-[#1e1e24] bg-[#111114] p-5">
            <h3 className="text-sm font-medium text-white/60 mb-3">Productos más comprados</h3>
            <p className="text-xs text-white/30">Sin datos disponibles</p>
          </div>
        </div>
      </section>
    </div>
  );
}
