import { Link } from "react-router-dom";
import { Tags, Globe } from "lucide-react";
import { hubCardClass as cardClass, hubIconClass } from "../../components/ui/hubStyles";

const MODULOS = [
  {
    to: "/configuracion/categorias",
    label: "Categorías y Subcategorías",
    descripcion: "Alta, baja y modificación de categorías y subcategorías de productos.",
    icon: Tags,
  },
  {
    to: "/configuracion/paises",
    label: "Países y Ciudades",
    descripcion: "Alta, baja y modificación de países y ciudades.",
    icon: Globe,
  },
];

export default function ConfiguracionHub() {
  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-[#f1f1f3] tracking-tight">Configuración</h1>
        <p className="text-sm text-[#5a5a6e]">Selecciona un módulo para continuar</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULOS.map((m) => {
          const { to, label, descripcion, icon: Icon } = m;
          return (
            <Link key={label} to={to} className={cardClass}>
              <div className="flex flex-col items-center justify-center gap-3">
                <div className={hubIconClass}>
                  <Icon className="w-8 h-8" aria-hidden />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-base font-semibold text-white leading-tight">{label}</p>
                  <p className="text-xs text-[#5a5a6e] leading-relaxed line-clamp-2">{descripcion}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}