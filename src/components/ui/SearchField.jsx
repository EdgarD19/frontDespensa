import { Search, X } from "lucide-react";

/**
 * Campo de búsqueda estándar: icono a la izquierda, X de limpiar a la
 * derecha (o un slot `right` custom, p. ej. el botón de código de barras).
 * Unifica las ~15 variantes manuales de pl-9/pl-10/pl-[2.5rem] y bg-white/5.
 *
 * Props:
 *  - value/onChange: controlado
 *  - onEnter: (opcional) al pulsar Enter (escáner/confirmar)
 *  - size: "lg" (h-12, input del POS) | "md" (h-9/10 clásicos)
 *  - right: nodo custom de la derecha; por defecto la X de limpiar
 *  - wrapperClass/className: para estados locales (ancho, margenattop, etc)
 */
export default function SearchField({
  value,
  onChange,
  onEnter,
  onFocus: onFoco,
  placeholder = "Buscar…",
  ariaLabel = "Buscar",
  size = "md",
  autoFocus = false,
  disabled = false,
  label,
  id,
  right,
  wrapperClass = "",
  className = "",
}) {
  const alto = size === "lg" ? "h-12 text-base pl-11" : "h-10 text-sm pl-9";
  const hayTexto = String(value ?? "").length > 0;
  return (
    <div className={wrapperClass || "relative"}>
      {id && label && (
        <label htmlFor={id} className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/50 mb-1.5 block">
          {label}
        </label>
      )}
      <div className="relative">
        <Search
          aria-hidden="true"
          className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${size === "lg" ? "h-[18px] w-[18px]" : "h-4 w-4"} text-white/40`}
        />
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && onEnter) onEnter(e); }}
          onFocus={onFoco}
          placeholder={placeholder}
          aria-label={ariaLabel}
          autoFocus={autoFocus}
          disabled={disabled}
          autoComplete="off"
          className={`w-full rounded-none border border-white/10 bg-white/[0.03] outline-none transition-colors placeholder:text-white/30 text-white ${alto} ${hayTexto && !right ? "pr-9" : ""} ${right ? "pr-11" : ""} focus:border-[var(--accent)] disabled:opacity-50 ${className}`}
        />
        {right != null ? (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-auto">{right}</div>
        ) : hayTexto && !disabled ? (
          <button
            type="button"
            onClick={() => onChange("")}
            title="Limpiar búsqueda"
            aria-label="Limpiar búsqueda"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-none text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={15} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
