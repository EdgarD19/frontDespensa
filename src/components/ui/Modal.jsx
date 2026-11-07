import { useEffect } from "react";
import { X, Loader2 } from "lucide-react";

/**
 * Modal estándar del proyecto (antes ModalShell en ComprobantesConfig).
 * Panel #0c0c0e, borde white/10, footer con Cancelar + acción positiva.
 * Es responsable: onCerrar (clic afuera/Escape), onSubmit del form interno.
 */
export default function Modal({ titulo, onCerrar, onSubmit, children, textoOk, deshabilitado = false, enviando = false }) {
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onCerrar(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onCerrar]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form onSubmit={onSubmit} className="flex w-full max-w-2xl flex-col overflow-hidden rounded-none border border-white/10 bg-[#0c0c0e] shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">{titulo}</h2>
          <button type="button" onClick={onCerrar} aria-label="Cerrar"
            className="rounded-none p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-4 py-4">{children}</div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-white/10 px-4 py-3">
          <button type="button" onClick={onCerrar}
            className="rounded-none border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white/70 transition-colors hover:text-white">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={deshabilitado || enviando}
            className="flex items-center gap-2 rounded-none bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-40"
          >
            {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
            {textoOk}
          </button>
        </div>
      </form>
    </div>
  );
}
