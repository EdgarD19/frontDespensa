import { X } from "lucide-react";

export default function ConfirmModal({
  abierto,
  titulo,
  mensaje,
  confirmarLabel = "Confirmar",
  confirmarClass = "bg-[var(--accent)] text-black hover:bg-[var(--accent-hover)]",
  cargando = false,
  onConfirmar,
  onCerrar,
}) {
  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onCerrar}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#0c0c0e] border border-white/10 rounded-none w-full max-w-sm shadow-2xl"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 className="text-sm font-semibold text-white">{titulo}</h2>
          <button type="button" onClick={onCerrar}
            className="p-1 rounded text-white/40 hover:text-white hover:bg-[#1a1f2e] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-4">
          <p className="text-sm text-white/70">{mensaje}</p>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-white/10">
          <button type="button" onClick={onCerrar} disabled={cargando}
            className="rounded-none border border-white/10 bg-white/[0.03] px-4 py-1.5 text-sm text-white/70 hover:text-white disabled:opacity-40 transition-colors">
            Cancelar
          </button>
          <button type="button" onClick={onConfirmar} disabled={cargando}
            className={`rounded-none px-4 py-1.5 text-sm font-semibold disabled:opacity-40 transition-colors ${confirmarClass}`}>
            {cargando ? "Procesando..." : confirmarLabel}
          </button>
        </div>
      </div>
    </div>
  );
}