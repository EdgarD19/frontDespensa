import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * Cabecera estándar de página: flecha atrás + título (+ subtítulo) y un slot
 * dererror para acciones (botón "Nuevo...", meta, etc).
 * Reemplaza las variantes manuales ArrowLeft+h1 repartidas por el proyecto.
 */
export default function PageHeader({ backTo = "/", title, subtitle, right = null, backLabel = "Volver" }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 py-5">
      <div className="flex items-center gap-4">
        <Link to={backTo} aria-label={backLabel}
          className="rounded-none p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white">
          <ArrowLeft size={20} />
        </Link>
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold text-white tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-white/40">{subtitle}</p>}
        </div>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}
