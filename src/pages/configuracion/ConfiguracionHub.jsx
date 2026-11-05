import { Link } from "react-router-dom";
import { Tags, Globe, FileText, Building2 } from "lucide-react";
import { hubCardClass as cardClass, hubIconClass } from "../../components/ui/hubStyles";

const MODULOS = [
  {
    to: "/configuracion/categorias",
    label: "Categorías y subcategorías",
    descripcion: "Agrega y organiza las categorías y subcategorías de productos.",
    icon: Tags,
  },
  {
    to: "/configuracion/paises",
    label: "Países y ciudades",
    descripcion: "Agrega y actualiza los países y ciudades del sistema.",
    icon: Globe,
  },
  {
    to: "/configuracion/comprobantes",
    label: "Comprobantes (DNIT)",
    descripcion: "Registra el timbrado DNIT y la numeración de las facturas.",
    icon: FileText,
  },
  {
    to: "/configuracion/empresa",
    label: "Datos de la empresa",
    descripcion: "Razón social, RUC y datos que aparecen en el ticket de venta.",
    icon: Building2,
  },
];

export default function ConfiguracionHub() {
  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Configuración</h1>
        <p className="text-sm text-white/40">Selecciona un módulo para continuar</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 max-w-3xl mx-auto gap-4">
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
                  <p className="text-xs text-white/40 leading-relaxed line-clamp-2">{descripcion}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}