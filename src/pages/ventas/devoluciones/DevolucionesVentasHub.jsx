import { Link } from "react-router-dom";
import { ArrowLeftRight, Ban, ArrowLeft } from "lucide-react";
import { hubCardClass as cardClass, hubIconClass } from "../../../components/ui/hubStyles";

const SUB_MODULOS = [
  {
    to: "/ventas/devoluciones/intercambios",
    label: "Intercambio",
    icon: ArrowLeftRight,
  },
  {
    to: null,
    label: "Anulación",
    descripcion: "Gestión de anulaciones de ventas. Próximamente.",
    icon: Ban,
  },
];

export default function DevolucionesVentasHub() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/ventas" className="p-2 rounded-none hover:bg-white/10 text-white/50 transition-colors" aria-label="Volver">
          <ArrowLeft size={18} />
        </Link>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-white tracking-tight">Devoluciones de ventas</h1>
          <p className="text-sm text-white/40">Gestión de intercambios y anulaciones de ventas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
        {SUB_MODULOS.map((m) => {
          const contenido = (
            <div className={`flex flex-col items-center justify-center gap-3 ${!m.to ? "opacity-40" : ""}`}>
              <div className={hubIconClass}>
                <m.icon className="w-8 h-8" aria-hidden />
              </div>
              <div className="text-center space-y-1">
                <p className="text-base font-semibold text-white leading-tight">{m.label}</p>
                {m.descripcion && (
                  <p className="text-xs text-white/40 leading-relaxed line-clamp-2">{m.descripcion}</p>
                )}
              </div>
            </div>
          );
          return m.to ? (
            <Link key={m.label} to={m.to} className={cardClass}>{contenido}</Link>
          ) : (
            <div key={m.label} className={`${cardClass} cursor-default pointer-events-none`}>{contenido}</div>
          );
        })}
      </div>
    </div>
  );
}
