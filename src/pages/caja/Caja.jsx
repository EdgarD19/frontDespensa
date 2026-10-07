import { LogIn, LogOut, BarChart3 } from "lucide-react";

const MODULOS = [
  {
    to: null,
    label: "Apertura y Cierre",
    descripcion: "Apertura y cierre de caja diaria. Próximamente.",
    icon: LogIn,
    pronto: true,
  },
  {
    to: null,
    label: "Ingresos y Egresos",
    descripcion: "Registro de ingresos y egresos de caja. Próximamente.",
    icon: LogOut,
    pronto: true,
  },
  {
    to: null,
    label: "Dashboard Financiero",
    descripcion: "Resumen financiero y reportes. Próximamente.",
    icon: BarChart3,
    pronto: true,
  },
];

const cardClass =
  "group flex flex-col items-center justify-center gap-3 rounded-none border border-white/10 bg-[#0c0c0e] p-6 transition-all duration-200 aspect-[4/3] cursor-default";

export default function Caja() {
  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Caja</h1>
        <p className="text-sm text-white/40">Selecciona un modulo para continuar</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULOS.map(({ label, descripcion, icon: Icon, pronto }) => (
          <div key={label} className={`${cardClass} ${pronto ? "opacity-40" : ""}`}>
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-none bg-[var(--accent)]/8 border border-[#22c55e]/15 text-[#22c55e]">
              <Icon className="w-8 h-8" aria-hidden />
            </div>
            <div className="text-center space-y-1">
              <p className="text-base font-semibold text-white leading-tight">{label}</p>
              <p className="text-xs text-white/40 leading-relaxed line-clamp-2">{descripcion}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
