import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { DollarSign, TrendingUp, TrendingDown, LogIn, LogOut, Lock, Unlock, History, PanelRightClose, PanelRightOpen } from "lucide-react";
import { getCajaActual } from "../../api/cajaApi";

const CARD_LINK_CLASS = "group flex flex-col items-center justify-center gap-3 rounded-2xl border border-[#1e1e24] bg-[#111114] p-6 transition-all duration-200 hover:border-[#22c55e]/40 hover:bg-[#13131a] aspect-[4/3]";
const CARD_DISABLED_CLASS = "group flex flex-col items-center justify-center gap-3 rounded-2xl border border-[#1e1e24] bg-[#111114] p-6 aspect-[4/3] opacity-40 cursor-default";

const format = (n) => {
  if (n == null) return "$ --";
  return "$" + Number(n).toLocaleString("es-PY", { minimumFractionDigits: 0 });
};

export default function Caja() {
  const [showPanel, setShowPanel] = useState(false);
  const [caja, setCaja] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getCajaActual();
        if (!cancelled) setCaja(data);
      } catch {
        if (!cancelled) setCaja(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const abierta = caja?.estado === "ABIERTA";
  const saldo = abierta
    ? (caja.montoInicial || 0) + (caja.totalIngresos || 0) - (caja.totalEgresos || 0)
    : null;

  return (
    <div className="flex gap-6 h-full">
      <div className="flex-1 max-w-4xl mx-auto py-8 px-4 space-y-8 min-w-0">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-[#f1f1f3] tracking-tight">Caja</h1>
          <p className="text-sm text-[#5a5a6e]">Panel de control del m&oacute;dulo de caja</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-[#3a3a4a] uppercase tracking-widest">Acciones r&aacute;pidas</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {abierta ? (
              <div className={CARD_DISABLED_CLASS}>
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#22c55e]/8 border border-[#22c55e]/15 text-[#22c55e]">
                  <Unlock className="w-7 h-7" />
                </div>
                <span className="text-sm font-semibold text-white">Caja abierta</span>
              </div>
            ) : (
              <Link to="/caja/apertura" className={CARD_LINK_CLASS}>
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#22c55e]/8 border border-[#22c55e]/15 text-[#22c55e]">
                  <Unlock className="w-7 h-7" />
                </div>
                <span className="text-sm font-semibold text-white">Abrir Caja</span>
              </Link>
            )}

            {abierta ? (
              <Link to="/caja/movimientos" className={CARD_LINK_CLASS}>
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#22c55e]/8 border border-[#22c55e]/15 text-[#22c55e]">
                  <LogIn className="w-7 h-7" />
                </div>
                <span className="text-sm font-semibold text-white">Ingresos y Egresos</span>
              </Link>
            ) : (
              <div className={CARD_DISABLED_CLASS}>
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#22c55e]/8 border border-[#22c55e]/15 text-[#22c55e]">
                  <LogIn className="w-7 h-7" />
                </div>
                <span className="text-sm font-semibold text-white">Caja cerrada</span>
              </div>
            )}

            {abierta ? (
              <Link to="/caja/apertura" className={CARD_LINK_CLASS}>
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#22c55e]/8 border border-[#22c55e]/15 text-[#22c55e]">
                  <Lock className="w-7 h-7" />
                </div>
                <span className="text-sm font-semibold text-white">Cerrar Caja</span>
              </Link>
            ) : (
              <div className={CARD_DISABLED_CLASS}>
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#22c55e]/8 border border-[#22c55e]/15 text-[#22c55e]">
                  <Lock className="w-7 h-7" />
                </div>
                <span className="text-sm font-semibold text-white">Caja cerrada</span>
              </div>
            )}
          </div>
        </section>
      </div>

      <button onClick={() => setShowPanel(!showPanel)}
        className="mt-6 -ml-3 z-10 self-start p-1.5 rounded-l-md bg-[#111114] border border-[#1e1e24] border-r-0 text-[#3a3a4a] hover:text-[#8a8a9a] transition-all flex-shrink-0">
        {showPanel ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
      </button>

      <div className={`transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0 ${showPanel ? "w-72 opacity-100" : "w-0 opacity-0"}`}>
        <div className="w-72 py-6 pr-4 space-y-4">
          <div className="rounded-xl border border-[#1e1e24] bg-[#0d0d0f] overflow-hidden">
            <div className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-[#3a3a4a]">KPIs</div>
            <div className="px-4 pb-4 space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-[#111114] px-4 py-3 border border-[#1e1e24]">
                <div className="flex items-center gap-2 text-[#22c55e]">
                  <DollarSign className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5a5a6e]">Saldo actual</span>
                </div>
                <span className="text-sm font-bold text-white">{loading ? "$ --" : format(saldo)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-[#111114] px-4 py-3 border border-[#1e1e24]">
                <div className="flex items-center gap-2 text-blue-400">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5a5a6e]">Ingresos</span>
                </div>
                <span className="text-sm font-bold text-white">{loading ? "$ --" : format(caja?.totalIngresos)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-[#111114] px-4 py-3 border border-[#1e1e24]">
                <div className="flex items-center gap-2 text-red-400">
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5a5a6e]">Egresos</span>
                </div>
                <span className="text-sm font-bold text-white">{loading ? "$ --" : format(caja?.totalEgresos)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#1e1e24] bg-[#0d0d0f] overflow-hidden">
            <div className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-[#3a3a4a]">Informaci&oacute;n</div>
            <div className="px-4 pb-4 space-y-3">
              <div className="rounded-lg bg-[#111114] px-4 py-3 border border-[#1e1e24]">
                <div className="flex items-center gap-2 mb-2">
                  <History className="w-3.5 h-3.5 text-white/40" />
                  <h3 className="text-xs font-medium text-white/60">&Uacute;ltimos movimientos de caja</h3>
                </div>
                <p className="text-[11px] text-white/30">Sin datos disponibles</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
