import { Link } from "react-router-dom";
import { LogIn, LogOut, BarChart3 } from "lucide-react";
import { hubCardClass as cardClass, hubIconClass } from "../../components/ui/hubStyles";

const MODULOS = [
  {
    to: "/caja/apertura-cierre",
    label: "Apertura y Cierre",
    descripcion: "Abre la caja con el efectivo inicial y ciérrala con el arqueo del día.",
    icon: LogIn,
  },
  {
    to: "/caja/ingresos-egresos",
    label: "Ingresos y Egresos",
    descripcion: "Registra entradas y salidas de efectivo con su motivo.",
    icon: LogOut,
  },
  {
    to: "/caja/dashboard",
    label: "Dashboard Financiero",
    descripcion: "Resumen del día e historial de cierres con diferencias.",
    icon: BarChart3,
  },
];

export default function Caja() {
  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Caja</h1>
        <p className="text-sm text-white/40">Selecciona un módulo para continuar</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULOS.map((m) => {
          const { to, label, descripcion, icon: Icon } = m;
          return (
          <Link
            key={to}
            to={to}
            className={cardClass}
          >
            <div className={hubIconClass}>
              <Icon className="w-8 h-8" aria-hidden />
            </div>
            <div className="text-center space-y-1">
              <p className="text-base font-semibold text-white group-hover:text-white transition-colors leading-tight">
                {label}
              </p>
              {descripcion && (
                <p className="text-xs text-white/40 leading-relaxed line-clamp-2">{descripcion}</p>
              )}
            </div>
          </Link>
          );
        })}
      </div>
    </div>
  );
}
