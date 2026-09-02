import { X } from "lucide-react";

export default function ConfirmModal({
  abierto,
  titulo,
  mensaje,
  confirmarLabel = "Confirmar",
  confirmarClass = "bg-[#22c55e] text-[#0d0d0f] hover:bg-[#16a34a]",
  cargando = false,
  onConfirmar,
  onCerrar,
}) {
  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onCerrar}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#111114] border border-[#1e1e24] rounded-xl w-full max-w-sm shadow-2xl"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e1e24]">
          <h2 className="text-sm font-semibold text-[#f1f1f3]">{titulo}</h2>
          <button type="button" onClick={onCerrar}
            className="p-1 rounded text-[#5a5a6e] hover:text-[#e1e1eb] hover:bg-[#1a1f2e] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-4">
          <p className="text-sm text-[#9a9aac]">{mensaje}</p>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[#1e1e24]">
          <button type="button" onClick={onCerrar}
            className="rounded-lg border border-[#2a2a32] bg-[#0d0d0f] px-4 py-1.5 text-sm text-[#9a9aac] hover:text-[#e1e1eb] transition-colors">
            Cancelar
          </button>
          <button type="button" onClick={onConfirmar} disabled={cargando}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold disabled:opacity-40 transition-colors ${confirmarClass}`}>
            {cargando ? "Procesando..." : confirmarLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
