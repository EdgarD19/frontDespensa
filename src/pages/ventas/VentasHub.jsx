import { Link } from "react-router-dom";
import { Users, ScanLine, History, LineChart, Undo2 } from "lucide-react";
import { hubCardClass as cardClass, hubIconClass } from "../../components/ui/hubStyles";

const MODULOS = [
  {
    to: "/ventas/registro",
    label: "Registro de venta",
    descripcion: "Ventas por unidad, código de barras y comprobante.",
    icon: ScanLine,
  },
  {
    to: "/ventas/clientes",
    label: "Clientes",
    descripcion: "Alta, baja y modificacion de clientes",
    icon: Users,
  },
  {
    to: null,
    label: "Historial de Ventas",
    descripcion: "Consulta de ventas anteriores. Próximamente.",
    icon: History,
    pronto: true,
  },
  {
    to: null,
    label: "Reporte de ventas",
    descripcion: "Reportes y estadisticas de ventas. Próximamente.",
    icon: LineChart,
    pronto: true,
  },
  {
    to: null,
    label: "Devoluciones de ventas",
    descripcion: "Gestión de devoluciones de ventas. Próximamente.",
    icon: Undo2,
    pronto: true,
  },
];

export default function Ventas() {
    return (
        <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
            <div className="space-y-1">
                <h1 className="text-2xl font-semibold text-[#f1f1f3] tracking-tight">Ventas</h1>
                <p className="text-sm text-[#5a5a6e]">Selecciona un modulo para continuar</p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {MODULOS.map((m) => {
                    const {to, label, descripcion, icon: Icon, pronto} = m;
                    const contenido = (
                        <div className={`flex flex-col items-center justify-center gap-3 ${pronto ? "opacity-40" : ""}`}>
                            <div className={hubIconClass}>
                                <Icon className="w-8 h-8" aria-hidden/>
                            </div>
                            <div className="text-center space-y-1">
                                <h2 className="text-base font-semibold text-white tracking-tight">{label}</h2>
                                <p className="text-xs text-[#5a5a6e] leading-relaxed line-clamp-2">{descripcion}</p>
                            </div>
                        </div>
                    );
                    return to ? (
                        <Link key={label} to={to} className={cardClass}>{contenido}</Link>
                    ) : (
                        <div key={label} className={`${cardClass} cursor-default pointer-events-none`}>{contenido}</div>
                    );
                })}
            </div>
        </div>
    );
}
 