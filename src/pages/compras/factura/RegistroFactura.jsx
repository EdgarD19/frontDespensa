import { Link } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import CompraEspontanea from "./CompraEspontanea";

export default function RegistroFactura() {
  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/compras" className="p-2 rounded-lg hover:bg-white/10 text-white/50 transition-colors" aria-label="Volver">
          <ArrowLeft size={18} />
        </Link>
        <div className="space-y-1 flex-1">
          <h1 className="text-2xl font-semibold text-[#f1f1f3] tracking-tight">Registrar Factura</h1>
          <p className="text-sm text-[#5a5a6e] flex items-center gap-1"><FileText className="w-4 h-4" /> Compra esporádica a proveedor</p>
        </div>
      </div>
      <CompraEspontanea />
    </div>
  );
}