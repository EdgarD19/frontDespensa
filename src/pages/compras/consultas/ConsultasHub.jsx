import { Link } from "react-router-dom";
import { FileText, BarChart3, ArrowLeft } from "lucide-react";
import { hubCardClass as cardClass, hubIconClass } from "../../../components/ui/hubStyles";

const SUB_MODULOS = [
  {
    to: "/compras/consultas/facturas",
    label: "Lista de Facturas",
    icon: FileText,
  },
  {
    to: "/compras/consultas/reportes",
    label: "Reportes de Compras",
    icon: BarChart3,
  },
];

export default function ConsultasHub() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/compras" className="p-2 rounded-lg hover:bg-white/10 text-white/50 transition-colors" aria-label="Volver">
          <ArrowLeft size={18} />
        </Link>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-[#f1f1f3] tracking-tight">Consultas e Historial</h1>
          <p className="text-sm text-[#5a5a6e]">Consultar facturas registradas y generar reportes de compras</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SUB_MODULOS.map((m) => {
          const { label, icon: Icon } = m;
          const content = (
            <div className="flex flex-col items-center justify-center gap-3">
              <div className={hubIconClass}>
                <Icon className="w-8 h-8" aria-hidden />
              </div>
              <p className="text-base font-semibold text-white leading-tight">{label}</p>
            </div>
          );
          return m.to ? (
            <Link key={label} to={m.to} className={cardClass}>{content}</Link>
          ) : (
            <div key={label} className={`${cardClass} cursor-default pointer-events-none`} aria-disabled="true">
              <div className="opacity-40">{content}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}