import { DollarSign, TrendingUp, TrendingDown, LogIn, LogOut, Lock, Unlock, History } from "lucide-react";

const KPI_CLASS = "flex flex-col gap-1 rounded-xl border border-[#1e1e24] bg-[#111114] px-5 py-4";
const CARD_CLASS = "group flex flex-col items-center justify-center gap-3 rounded-2xl border border-[#1e1e24] bg-[#111114] p-6 aspect-[4/3] opacity-40 cursor-default";

export default function Caja() {
  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-[#f1f1f3] tracking-tight">Caja</h1>
        <p className="text-sm text-[#5a5a6e]">Panel de control del módulo de caja</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-[#3a3a4a] uppercase tracking-widest">KPIs</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className={KPI_CLASS}>
            <div className="flex items-center gap-2 text-[#22c55e]">
              <DollarSign className="w-4 h-4" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5a5a6e]">Saldo actual</span>
            </div>
            <span className="text-xl font-bold text-white">$ --</span>
          </div>
          <div className={KPI_CLASS}>
            <div className="flex items-center gap-2 text-blue-400">
              <TrendingUp className="w-4 h-4" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5a5a6e]">Ingresos del día</span>
            </div>
            <span className="text-xl font-bold text-white">$ --</span>
          </div>
          <div className={KPI_CLASS}>
            <div className="flex items-center gap-2 text-red-400">
              <TrendingDown className="w-4 h-4" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5a5a6e]">Egresos del día</span>
            </div>
            <span className="text-xl font-bold text-white">$ --</span>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-[#3a3a4a] uppercase tracking-widest">Acciones rápidas</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={CARD_CLASS}>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#22c55e]/8 border border-[#22c55e]/15 text-[#22c55e]">
              <Unlock className="w-7 h-7" />
            </div>
            <span className="text-sm font-semibold text-white">Abrir Caja</span>
          </div>
          <div className={CARD_CLASS}>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#22c55e]/8 border border-[#22c55e]/15 text-[#22c55e]">
              <LogIn className="w-7 h-7" />
            </div>
            <span className="text-sm font-semibold text-white">Registrar Ingreso</span>
          </div>
          <div className={CARD_CLASS}>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#22c55e]/8 border border-[#22c55e]/15 text-[#22c55e]">
              <LogOut className="w-7 h-7" />
            </div>
            <span className="text-sm font-semibold text-white">Registrar Egreso</span>
          </div>
          <div className={CARD_CLASS}>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#22c55e]/8 border border-[#22c55e]/15 text-[#22c55e]">
              <Lock className="w-7 h-7" />
            </div>
            <span className="text-sm font-semibold text-white">Cerrar Caja</span>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-[#3a3a4a] uppercase tracking-widest">Información</h2>
        <div className="grid grid-cols-1 gap-4">
          <div className="rounded-xl border border-[#1e1e24] bg-[#111114] p-5">
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-white/40" />
              <h3 className="text-sm font-medium text-white/60">Últimos movimientos de caja</h3>
            </div>
            <p className="text-xs text-white/30">Sin datos disponibles</p>
          </div>
        </div>
      </section>
    </div>
  );
}
