import { useState } from "react";
import { Link } from "react-router-dom";
import { Package, Search, ClipboardList, Settings, AlertTriangle, PackageSearch, PackageX, PanelRightClose, PanelRightOpen } from "lucide-react";

const CARD_CLASS = "group flex flex-col items-center justify-center gap-3 rounded-2xl border border-[#1e1e24] bg-[#111114] p-6 transition-all duration-200 hover:border-[#22c55e]/40 hover:bg-[#13131a] aspect-[4/3]";

export default function InventarioHub() {
  const [showPanel, setShowPanel] = useState(false);

  return (
    <div className="flex gap-6 h-full">
      <div className="flex-1 max-w-4xl mx-auto py-8 px-4 space-y-8 min-w-0">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-[#f1f1f3] tracking-tight">Inventario</h1>
          <p className="text-sm text-[#5a5a6e]">Panel de control del m&oacute;dulo de inventario</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-[#3a3a4a] uppercase tracking-widest">Acciones r&aacute;pidas</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Link to="/inventario/abm" className={CARD_CLASS}>
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#22c55e]/8 border border-[#22c55e]/15 text-[#22c55e]">
                <PackageSearch className="w-7 h-7" />
              </div>
              <span className="text-sm font-semibold text-white">Productos</span>
            </Link>
            <Link to="/inventario/consulta" className={CARD_CLASS}>
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#22c55e]/8 border border-[#22c55e]/15 text-[#22c55e]">
                <Search className="w-7 h-7" />
              </div>
              <span className="text-sm font-semibold text-white">Consulta Stock</span>
            </Link>
            <Link to="/inventario/ajuste" className={CARD_CLASS}>
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#22c55e]/8 border border-[#22c55e]/15 text-[#22c55e]">
                <ClipboardList className="w-7 h-7" />
              </div>
              <span className="text-sm font-semibold text-white">Movimientos</span>
            </Link>
            <Link to="/inventario/maestros" className={CARD_CLASS}>
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#22c55e]/8 border border-[#22c55e]/15 text-[#22c55e]">
                <Settings className="w-7 h-7" />
              </div>
              <span className="text-sm font-semibold text-white">Maestros</span>
            </Link>
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
                  <Package className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5a5a6e]">Total de productos</span>
                </div>
                <span className="text-sm font-bold text-white">--</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-[#111114] px-4 py-3 border border-[#1e1e24]">
                <div className="flex items-center gap-2 text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5a5a6e]">Stock bajo</span>
                </div>
                <span className="text-sm font-bold text-white">--</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-[#111114] px-4 py-3 border border-[#1e1e24]">
                <div className="flex items-center gap-2 text-red-400">
                  <PackageX className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5a5a6e]">Sin stock</span>
                </div>
                <span className="text-sm font-bold text-white">--</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#1e1e24] bg-[#0d0d0f] overflow-hidden">
            <div className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-[#3a3a4a]">Informaci&oacute;n</div>
            <div className="px-4 pb-4 space-y-3">
              <div className="rounded-lg bg-[#111114] px-4 py-3 border border-[#1e1e24]">
                <h3 className="text-xs font-medium text-white/60 mb-2">&Uacute;ltimos movimientos</h3>
                <p className="text-[11px] text-white/30">Sin datos disponibles</p>
              </div>
              <div className="rounded-lg bg-[#111114] px-4 py-3 border border-[#1e1e24]">
                <h3 className="text-xs font-medium text-white/60 mb-2">Alertas de reposici&oacute;n</h3>
                <p className="text-[11px] text-white/30">Sin datos disponibles</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
