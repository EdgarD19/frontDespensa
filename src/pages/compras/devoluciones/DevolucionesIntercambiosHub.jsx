import { Link } from "react-router-dom";
import { RotateCcw, ArrowLeftRight, Ban, ArrowLeft } from "lucide-react";
import { hubCardClass as cardClass, hubIconClass } from "../../../components/ui/hubStyles";

const SUB_MODULOS = [
  {
    to: "/compras/devoluciones-intercambios/devoluciones",
    label: "Devolución",
    icon: RotateCcw,
  },
  {
    to: "/compras/devoluciones-intercambios/intercambios",
    label: "Intercambio",
    icon: ArrowLeftRight,
  },
  {
    to: "/compras/devoluciones-intercambios/anulaciones",
    label: "Anulación",
    icon: Ban,
  },
];

export default function DevolucionesIntercambiosHub() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/compras" className="p-2 rounded-lg hover:bg-white/10 text-white/50 transition-colors" aria-label="Volver">
          <ArrowLeft size={18} />
        </Link>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-[#f1f1f3] tracking-tight">Devoluciones e Intercambios</h1>
          <p className="text-sm text-[#5a5a6e]">Registrar devoluciones, intercambios y anulaciones de compras</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {SUB_MODULOS.map((m) => (
          <Link key={m.label} to={m.to} className={cardClass}>
            <div className="flex flex-col items-center justify-center gap-3">
              <div className={hubIconClass}>
                <m.icon className="w-8 h-8" aria-hidden />
              </div>
              <p className="text-base font-semibold text-white leading-tight">{m.label}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}