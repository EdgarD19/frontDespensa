import { Link } from "react-router-dom";
import { ClipboardList, Package, Search, Settings, ArrowRight } from "lucide-react";
import { hubCardClass as cardClass, hubIconClass } from "../../components/ui/hubStyles";

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
    label: "Ajuste de stock",
    icon: ClipboardList,
  },
];

export default function InventarioHub() {
  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-[#f1f1f3] tracking-tight">Inventario</h1>
        <p className="text-sm text-[#5a5a6e]">Selecciona un modulo para continuar</p>
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
              <p className="text-base font-semibold text-[#e1e1eb] group-hover:text-white transition-colors leading-tight">
                {label}
              </p>
              {descripcion && (
                <p className="text-xs text-[#5a5a6e] leading-relaxed line-clamp-2">{descripcion}</p>
              )}
            </div>
          </Link>
          );
        })}
      </div>
    </div>
  );
}
