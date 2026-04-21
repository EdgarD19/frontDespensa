import { PencilLine, Check } from "lucide-react";
import { TIPOS_AJUSTE } from "./tiposAjuste";

function stockEnteroActual(producto) {
  const n = Number(producto?.stockActual ?? 0);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

const inputClass =
  "w-full rounded-lg border border-[#2a2a32] bg-[#0d0d0f] px-3 py-2.5 text-sm text-[#f1f1f3] placeholder:text-[#4a4a5a] focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/25 outline-none disabled:opacity-50";

export default function FormularioAjuste({
  producto,
  formData,
  setFormData,
  diferencia,
  disabled,
  submitting,
  onSolicitar,
  onLimpiar,
}) {
  if (!producto) return null;

  const stockBase = stockEnteroActual(producto);
  const unidad = producto.unidadMedida || producto.unidad || "unid.";
  const subtitulo = [producto.codigoBarras ? String(producto.codigoBarras) : null, producto.categoria]
    .filter(Boolean)
    .join(" • ");

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  const nuevoNum =
    formData.nuevoStock === "" || Number.isNaN(Number(formData.nuevoStock))
      ? null
      : Number(formData.nuevoStock);

  return (
    <div className="rounded-xl border border-[#1e1e24] bg-[#111114] overflow-hidden">
      <div className="px-5 pt-5 pb-4 border-b border-[#1e1e24]">
        <h2 className="text-base font-semibold text-[#e1e1eb] flex items-center gap-2">
          <PencilLine className="w-5 h-5 text-[#22c55e] shrink-0" aria-hidden />
          Ajuste de Stock
        </h2>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSolicitar();
        }}
        className="p-5 space-y-4"
      >
        <div className="rounded-lg border border-[#1e1e24] bg-[#0d0d0f] p-4 flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[#f1f1f3] truncate">{producto.nombre}</p>
            {subtitulo ? (
              <p className="text-xs text-[#5a5a6e] mt-0.5 truncate">{subtitulo}</p>
            ) : null}
          </div>
          <div className="text-center shrink-0">
            <p className="text-2xl font-bold text-[#22c55e] tabular-nums leading-none">{stockBase}</p>
            <p className="text-[10px] uppercase tracking-wide text-[#5a5a6e] mt-1">Stock actual</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-[#7a7a8c]">
              Tipo de Ajuste <span className="text-amber-500">*</span>
            </span>
            <select
              name="tipoAjuste"
              value={formData.tipoAjuste}
              onChange={handleChange}
              disabled={disabled}
              required
              className={inputClass}
            >
              <option value="">Seleccionar tipo…</option>
              {TIPOS_AJUSTE.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-[#7a7a8c]">
              Fecha del Ajuste <span className="text-amber-500">*</span>
            </span>
            <input
              type="date"
              name="fechaAjuste"
              value={formData.fechaAjuste}
              onChange={handleChange}
              disabled={disabled}
              required
              className={inputClass}
            />
          </label>
        </div>

        {formData.tipoAjuste === "OTRO" && (
          <label className="block space-y-1">
            <span className="text-xs font-medium text-[#7a7a8c]">
              Detalle (obligatorio para &quot;Otro&quot;) <span className="text-amber-500">*</span>
            </span>
            <textarea
              name="detalleOtro"
              value={formData.detalleOtro}
              onChange={handleChange}
              disabled={disabled}
              rows={2}
              placeholder="Describe el motivo u origen del ajuste"
              className={`${inputClass} resize-y min-h-[4rem]`}
            />
          </label>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-[#7a7a8c]">Stock Actual</span>
            <input
              type="text"
              readOnly
              value={`${stockBase} ${unidad}`}
              className="w-full rounded-lg border border-[#2a2a32] bg-[#15151a] px-3 py-2.5 text-sm text-[#9a9aac] tabular-nums cursor-not-allowed"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-[#7a7a8c]">
              Nuevo Stock <span className="text-amber-500">*</span>
            </span>
            <input
              type="number"
              name="nuevoStock"
              inputMode="numeric"
              step={1}
              min={0}
              value={formData.nuevoStock}
              onChange={handleChange}
              disabled={disabled}
              required
              className={inputClass}
            />
          </label>
        </div>

        <label className="block space-y-1">
          <span className="text-xs font-medium text-[#7a7a8c]">
            Justificación Detallada <span className="text-amber-500">*</span>
          </span>
          <textarea
            name="justificacion"
            value={formData.justificacion}
            onChange={handleChange}
            disabled={disabled}
            rows={4}
            required
            placeholder="Describa detalladamente el motivo del ajuste…"
            className={`${inputClass} resize-y min-h-[6rem]`}
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-medium text-[#7a7a8c]">
            Autorizado por <span className="text-amber-500">*</span>
          </span>
          <input
            type="text"
            name="autorizadoPor"
            value={formData.autorizadoPor}
            onChange={handleChange}
            disabled={disabled}
            required
            placeholder="Nombre de quien autoriza el ajuste"
            className={inputClass}
          />
        </label>

        <div className="rounded-lg bg-[#1a1a22] border border-[#2a2a36] text-[#f1f1f3] px-4 py-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[#7a7a8c]">Stock actual</span>
            <span className="tabular-nums font-medium">{stockBase}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#7a7a8c]">Nuevo stock</span>
            <span className="tabular-nums font-medium">{nuevoNum == null ? "—" : nuevoNum}</span>
          </div>
          <div className="pt-2 border-t border-[#2a2a36] flex justify-between items-baseline">
            <span className="text-[#7a7a8c] text-sm">Diferencia</span>
            <span
              className={`text-2xl font-bold tabular-nums ${
                diferencia > 0 ? "text-[#22c55e]" : diferencia < 0 ? "text-rose-400" : "text-[#e1e1eb]"
              }`}
            >
              {Number.isFinite(diferencia) ? (diferencia > 0 ? `+${diferencia}` : diferencia) : "—"}
            </span>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2">
          <button
            type="button"
            disabled={disabled || submitting}
            onClick={onLimpiar}
            className="rounded-lg border border-[#2a2a32] bg-[#15151a] px-4 py-2.5 text-sm font-medium text-[#b0b0c0] hover:bg-[#1a1a22] hover:text-[#e1e1eb] disabled:opacity-40"
          >
            Limpiar
          </button>
          <button
            type="submit"
            disabled={disabled || submitting}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#22c55e]/90 hover:bg-[#22c55e] text-[#0d0d0f] text-sm font-semibold px-5 py-2.5 disabled:opacity-40 disabled:pointer-events-none border border-[#22c55e]/30"
          >
            <Check className="w-4 h-4" aria-hidden />
            {submitting ? "Procesando…" : "Procesar Ajuste"}
          </button>
        </div>
      </form>
    </div>
  );
}
