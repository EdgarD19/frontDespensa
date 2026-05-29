import { Link } from "react-router-dom";
import { Users, ScanLine, History } from "lucide-react";

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
];

const cardClass =
  "group flex flex-col items-stretch rounded-[25px] border border-[#30363d]/50 bg-[#252525] shadow-[inset_2px_5px_10px_rgb(5,5,5)] p-6 transition-all duration-300 hover:border-[var(--accent-green)]/40 hover:shadow-lg hover:scale-[1.02] focus-within:ring-2 focus-within:ring-[var(--accent-green)]/50 focus-within:ring-offset-2 focus-within:ring-offset-[var(--bg-main)]";

export default function Ventas() {
    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Ventas</h1>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {MODULOS.map((m) => {
                    const {to, label, descripcion, icon: Icon, pronto} = m;
                    const contenido = (
                        <div className={`flex flex-col items-center gap-4 sm:flex-row sm:text-left sm:items-start ${pronto ? "opacity-50" : ""}`}>
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#171717] text-[var(--accent-green)] shadow-[inset_2px_5px_10px_rgb(5,5,5)] group-hover:bg-black/60" >
                                <Icon className="w-7 h-7 aria-hidden"/>
                            </div>    
                            <div className="flex-1 space-y-1">
                                <h2 className="text-lg font-semibold text-white tracking-tight">{label}</h2>
                                <p className="text-sm text-[#8b949e] leading-relaxed">{descripcion}</p>
                            </div>
                        </div>
                    );
                    return to ? (
                        <Link key={label} to={to} className={cardClass}>{contenido}</Link>
                    ) : (
                        <div key={label} className={`${cardClass} cursor-default`}>{contenido}</div>
                    );
                })}
            </div>

        
        </div>
    );

}
 