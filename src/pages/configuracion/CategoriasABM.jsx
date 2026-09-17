import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { SeccionCategorias, SeccionSubcategorias } from "../inventario/maestros/MaestrosABM";

function AccordionSection({ titulo, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-white/[0.03] hover:bg-white/[0.06] transition-colors text-left">
        <h3 className="text-white font-medium text-sm">{titulo}</h3>
        <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

export default function CategoriasABM() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-[#f1f1f3] tracking-tight">
          Categorías y Subcategorías
        </h1>
        <p className="text-sm text-[#5a5a6e]">
          Gestión de categorías y subcategorías de productos
        </p>
      </div>
      <div className="space-y-5">
        <AccordionSection titulo="Categorías" defaultOpen={true}>
          <SeccionCategorias />
        </AccordionSection>
        <AccordionSection titulo="Subcategorías">
          <SeccionSubcategorias />
        </AccordionSection>
      </div>
    </div>
  );
}