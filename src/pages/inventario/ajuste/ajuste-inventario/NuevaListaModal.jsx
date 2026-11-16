import { useEffect } from "react";
import { X } from "lucide-react";
import AjusteStock from "./AjusteStock";

export default function NuevaListaModal({
  abierto,
  productos,
  categorias,
  disabled,
  onGenerar,
  onCerrar,
}) {
  useEffect(() => {
    if (!abierto) return;
    function onKey(e) {
      // No cerrar mientras se está creando la lista en el backend.
      if (e.key === "Escape" && !disabled) onCerrar();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [abierto, onCerrar, disabled]);

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0c0c0e] border border-white/10 rounded-none w-full max-w-4xl h-[85vh] max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Nueva lista de conteo
            </h2>
            <p className="text-xs text-white/50 mt-0.5">
              Buscá productos, elegí motivo y generá la lista.
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            disabled={disabled}
            className="p-1 text-white/40 hover:text-white transition-colors disabled:opacity-30 disabled:pointer-events-none"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex-1 min-h-0 overflow-hidden">
          <AjusteStock
            productos={productos}
            categorias={categorias}
            disabled={disabled}
            onGenerar={onGenerar}
          />
        </div>
      </div>
    </div>
  );
}