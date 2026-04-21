import { Link } from "react-router-dom";
import { ClipboardList, Package, Search, ArrowRight } from "lucide-react";

const MODULOS = [
  {
    to: "/inventario/abm",
    label: "Gestor de productos",
    descripcion: "Alta, baja y modificacion de productos.",
    icon: Package,
  },
  {
    to: "/inventario/consulta",
    label: "Consulta",
    descripcion: "Consulta de inventario.",
    icon: Search,
  },
  {
    to: "/inventario/ajuste",
    label: "Tipos de movimientos",
    descripcion: "Registra entradas, salidas y ajuste de stock.",
    icon: ClipboardList,
  },
];

export default function InventarioHub() {
  return (
    <div className="max-w-3xl mx-auto py-10 px-2 space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-[#f1f1f3] tracking-tight">Inventario</h1>
        <p className="text-sm text-[#5a5a6e]">Selecciona un modulo para continuar</p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 gap-3">
        {MODULOS.map(({ to, label, descripcion, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="group flex items-center gap-5 rounded-xl border border-[#1e1e24] bg-[#111114] p-5 transition-all duration-200 hover:border-[#22c55e]/25 hover:bg-[#13131a]"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#22c55e]/8 border border-[#22c55e]/15 text-[#22c55e] transition-colors group-hover:bg-[#22c55e]/15">
              <Icon className="w-5 h-5" aria-hidden />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#e1e1eb] group-hover:text-white transition-colors leading-tight">
                {label}
              </p>
              <p className="text-xs text-[#5a5a6e] mt-0.5 leading-relaxed">{descripcion}</p>
            </div>

            <ArrowRight className="w-4 h-4 text-[#3a3a4a] group-hover:text-[#22c55e] group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}
