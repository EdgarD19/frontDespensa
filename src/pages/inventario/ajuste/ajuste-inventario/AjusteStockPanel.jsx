import { Package } from "lucide-react";
import AjusteStock from "./AjusteStock";

export default function AjusteStockPanel({
  puedeRegistrar,
  productoSeleccionado,
  formData,
  setFormData,
  diferencia,
  loading,
  submitting,
  onSolicitar,
  onLimpiar,
}) {
  if (!puedeRegistrar) {
    return (
      <div className="rounded-xl border border-[#1e1e24] bg-[#111114] p-6 text-sm text-[#7a7a8c]">
        No podés crear solicitudes de ajuste con tu rol actual. Podés revisar el historial y autorizar si
        corresponde.
      </div>
    );
  }

  if (!productoSeleccionado) {
    return (
      <div className="rounded-xl border border-dashed border-[#2a2a32] bg-[#111114] min-h-[20rem] flex flex-col items-center justify-center text-center px-6 py-10">
        <Package className="w-10 h-10 text-[#3a3a4a] mb-3" aria-hidden />
        <p className="text-sm text-[#9a9aac] font-medium">Seleccioná un producto</p>
        <p className="text-xs text-[#5a5a6e] mt-1 max-w-xs">
          Elegí un ítem de la lista de la izquierda para ver el formulario de ajuste de stock.
        </p>
      </div>
    );
  }

  return (
    <AjusteStock
      producto={productoSeleccionado}
      formData={formData}
      setFormData={setFormData}
      diferencia={Number.isFinite(diferencia) ? diferencia : 0}
      disabled={loading}
      submitting={submitting}
      onSolicitar={onSolicitar}
      onLimpiar={onLimpiar}
    />
  );
}
