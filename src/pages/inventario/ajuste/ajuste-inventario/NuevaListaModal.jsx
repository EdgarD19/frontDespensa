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
      if (e.key === "Escape") onCerrar();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1a1a20] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Nueva lista de conteo
            </h2>
            <p className="text-xs text-[#7a7a8c] mt-0.5">
              Buscá productos, elegí motivo y generá la lista.
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="p-1 text-white/40 hover:text-white transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
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