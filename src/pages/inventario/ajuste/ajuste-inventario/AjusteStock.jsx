import { Check } from "lucide-react";
import { TIPOS_MOVIMIENTO, clasificacionesDeTipo } from "./tiposAjuste";

const inputClass =
  "w-full rounded-lg border border-[#2a2a32] bg-[#111114] px-3 py-2.5 text-sm text-[#f1f1f3] placeholder:text-[#4a4a5a] focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/25 outline-none disabled:opacity-50";

function stockEnteroActual(producto) {
  const n = Number(producto?.stockActual ?? 0);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

export default function AjusteStock({
  producto,
  formData,
  setFormData,
  stockResultante,
  disabled,
  submitting,
  onSolicitar,
  onLimpiar,
}) {
  if (!producto) return null;

  const stockBase = stockEnteroActual(producto);

  const tipo = formData.tipoMovimiento;
  const clasificaciones = clasificacionesDeTipo(tipo);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  const cantidadNum =
    formData.cantidad === "" || Number.isNaN(Number(formData.cantidad))
      ? null
      : Number(formData.cantidad);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSolicitar();
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-[#9a9aac]">
            Tipo de movimiento
          </span>
          <select
            name="tipoMovimiento"
            value={formData.tipoMovimiento}
            onChange={handleChange}
            disabled={disabled}
            required
            className={inputClass}
          >
            <option value="">Seleccionar…</option>
            {TIPOS_MOVIMIENTO.map(({ value, label, descripcion }) => (
              <option key={value} value={value}>
                {label} — {descripcion}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-[#9a9aac]">
            Clasificación
          </span>
          <select
            name="clasificacion"
            value={formData.clasificacion}
            onChange={handleChange}
            disabled={disabled || !tipo}
            required
            className={inputClass}
          >
            <option value="">
              {tipo ? "Seleccionar…" : "Primero elegí un tipo"}
            </option>
            {clasificaciones.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-[#9a9aac]">Cantidad</span>
          <input
            type="number"
            name="cantidad"
            inputMode="numeric"
            step={1}
            value={formData.cantidad}
            onChange={handleChange}
            disabled={disabled}
            required
            placeholder={tipo === "AJUSTE" ? "Ej.: 5 o -3" : "Cantidad"}
            className={inputClass}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-[#9a9aac]">
            Referencia <span className="text-[#5a5a6e]">(opcional)</span>
          </span>
          <input
            type="text"
            name="referencia"
            value={formData.referencia}
            onChange={handleChange}
            disabled={disabled}
            placeholder="Remito, motivo, responsable…"
            className={inputClass}
          />
        </label>
      </div>

      <div className="flex items-center justify-between rounded-lg bg-[#111114] border border-[#1e1e24] px-4 py-3">
        <span className="text-sm text-[#7a7a8c]">
          Stock actual{" "}
          <span className="font-semibold text-[#f1f1f3] tabular-nums">
            {stockBase}
          </span>
        </span>
        <span className="text-sm text-[#7a7a8c]">
          Stock resultante{" "}
          <span
            className={`font-bold tabular-nums ${
              stockResultante != null && stockResultante < 0
                ? "text-rose-400"
                : stockResultante != null && stockResultante !== stockBase
                  ? "text-[#22c55e]"
                  : "text-[#f1f1f3]"
            }`}
          >
            {stockResultante == null ? "—" : stockResultante}
          </span>
        </span>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={disabled || submitting}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[#22c55e] hover:bg-[#1aad4e] text-[#0d0d0f] text-sm font-semibold px-5 py-2.5 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <Check className="w-4 h-4" aria-hidden />
          {submitting ? "Procesando…" : "Registrar movimiento"}
        </button>
        <button
          type="button"
          disabled={disabled || submitting}
          onClick={onLimpiar}
          className="rounded-lg border border-[#2a2a32] bg-[#111114] px-4 py-2.5 text-sm font-medium text-[#b0b0c0] hover:bg-[#1a1a22] hover:text-[#e1e1eb] disabled:opacity-40 transition-colors"
        >
          Limpiar
        </button>
      </div>
    </form>
  );
}
