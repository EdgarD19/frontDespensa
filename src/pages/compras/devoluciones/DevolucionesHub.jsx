import { Link } from "react-router-dom";
import { RotateCcw, History } from "lucide-react";
import { hubCardClass as cardClass, hubIconClass as iconClass } from "../../../components/ui/hubStyles";

const SUB_MODULOS = [
  {
    to: "/compras/devoluciones/nueva",
    label: "Devoluciones e Intercambios",
    descripcion: "Registrar devolución o intercambio de productos a proveedor.",
    icon: RotateCcw,
  },
  {
    to: "/compras/devoluciones/historial",
    label: "Historial de Operaciones",
    descripcion: "Consultar y filtrar devoluciones e intercambios registrados.",
    icon: History,
    disabled: true,
  },
];

export default function DevolucionesHub() {
  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-[#f1f1f3] tracking-tight">Devoluciones e Intercambios</h1>
        <p className="text-sm text-[#5a5a6e]">Selecciona una operación para continuar</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SUB_MODULOS.map((m) => {
          const { to, label, descripcion, icon: Icon, disabled } = m;
          const contenido = (
            <div className="flex flex-col items-center justify-center gap-3">
              <div className={iconClass}>
                <Icon className="w-8 h-8" aria-hidden />
              </div>
              <div className="text-center space-y-1">
                <p className="text-base font-semibold text-white leading-tight">{label}</p>
                <p className="text-xs text-[#5a5a6e] leading-relaxed line-clamp-2">{descripcion}</p>
              </div>
            </div>
          );
          if (disabled) {
            return (
              <div key={label} aria-disabled="true" className={`${cardClass} opacity-50 cursor-not-allowed select-none`}>
                {contenido}
              </div>
            );
          }
          return (
            <Link key={label} to={to} className={cardClass}>
              {contenido}
            </Link>
          );
        })}
      </div>
    </div>
  );
}