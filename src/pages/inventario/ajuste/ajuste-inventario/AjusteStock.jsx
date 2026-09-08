import { Check, Trash2, PackageOpen } from "lucide-react";
import {
  TIPOS_MOVIMIENTO,
  motivosDeTipo,
} from "./tiposAjuste";

const inputClass =
  "w-full rounded-lg border border-[#2a2a32] bg-[#111114] px-3 py-2.5 text-sm text-[#f1f1f3] placeholder:text-[#4a4a5a] focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/25 outline-none disabled:opacity-50 disabled:cursor-not-allowed";

function stockEnteroActual(producto) {
  const n = Number(producto?.stockActual ?? 0);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

export default function AjusteStock({
  formData,
  setFormData,
  items,
  setItems,
  disabled,
  submitting,
  onSolicitar,
  onLimpiar,
}) {
  if (!formData) return null;

  const tipo = formData.tipoMovimiento;
  const motivo = motivosDeTipo(tipo);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "tipoMovimiento") next.clasificacion = "";
      return next;
    });
  }

  function handleCantidad(idx, value) {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, cantidad: value } : it))
    );
  }

  function handleRemove(idx) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function unitLabel(it) {
    return it.producto?.unidadMedida
      ? String(it.producto.unidadMedida).trim()
      : "unid";
  }

  function resultadoDeItem(it) {
    const stock = stockEnteroActual(it.producto);
    const cant = Number(it.cantidad);
    if (!Number.isFinite(cant) || cant <= 0) return null;
    return tipo === "NEGATIVO" ? stock - cant : stock + cant;
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSolicitar();
      }}
      className="space-y-5"
    >
      {/* ==================== CABECERA ==================== */}
      <div className="space-y-4">
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
              {TIPOS_MOVIMIENTO.map(({ value, label, descripcion, requiereBackend }) => (
                <option
                  key={value}
                  value={value}
                  disabled={requiereBackend}
                  title={
                    requiereBackend
                      ? "Requiere actualización del backend"
                      : undefined
                  }
                >
                  {label} — {descripcion}
                  {requiereBackend ? " (próximamente)" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-[#9a9aac]">Motivo</span>
            <select
              name="clasificacion"
              value={formData.clasificacion}
              onChange={handleChange}
              disabled={disabled || !tipo}
              required
              className={inputClass}
            >
              <option value="">
                {tipo ? "Seleccioná un motivo…" : "Primero elegí el tipo"}
              </option>
              {motivo.map(({ value, label, requiereBackend }) => (
                <option
                  key={value}
                  value={value}
                  disabled={requiereBackend}
                  title={
                    requiereBackend
                      ? "Motivo no soportado por el backend actual"
                      : undefined
                  }
                >
                  {label}
                  {requiereBackend ? " (próximamente)" : ""}
                </option>
              ))}
            </select>
            {tipo ? (
              <span className="text-[11px] text-[#5a5a6e] block">
                {tipo === "POSITIVO"
                  ? "Incrementa el stock del producto."
                  : "Descuenta el stock del producto."}
              </span>
            ) : null}
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-[#9a9aac]">
              Observación{" "}
              <span className="text-[#5a5a6e] font-normal">(opcional)</span>
            </span>
            <input
              type="text"
              name="referencia"
              value={formData.referencia}
              onChange={handleChange}
              disabled={disabled}
              placeholder="Detalle, responsable, nota…"
              className={inputClass}
            />
          </label>
        </div>
      </div>

      {/* ==================== DETALLE DE ÍTEMS ==================== */}
      <div className="rounded-xl border border-[#1e1e24] bg-[#0d0d0f] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1e1e24] flex items-center gap-2">
          <PackageOpen className="w-4 h-4 text-[#22c55e]" aria-hidden />
          <h3 className="text-sm font-semibold text-[#e1e1eb]">
            Ítems a ajustar
          </h3>
          <span className="ml-auto text-xs text-[#5a5a6e] tabular-nums">
            {items.length} ítem{items.length !== 1 ? "s" : ""}
          </span>
        </div>

        {items.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-[#5a5a6e]">
            Todavía no hay productos. Usá el buscador de arriba para agregar
            ítems.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-[#5a5a6e] border-b border-[#1e1e24]">
                  <th className="px-4 py-2 font-medium">Producto</th>
                  <th className="px-3 py-2 font-medium">U.M.</th>
                  <th className="px-3 py-2 font-medium text-right">Stock actual</th>
                  <th className="px-3 py-2 font-medium">Cantidad ajustada</th>
                  <th className="px-3 py-2 font-medium text-right">Stock resultante</th>
                  <th className="px-2 py-2" aria-label="Eliminar" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e1e24]">
                {items.map((it, idx) => {
                  const stock = stockEnteroActual(it.producto);
                  const res = resultadoDeItem(it);
                  const neg = res != null && res < 0;
                  return (
                    <tr key={it.producto.id} className="hover:bg-[#111114]/60">
                      <td className="px-4 py-3 min-w-[12rem]">
                        <span className="font-medium text-[#f1f1f3] block truncate">
                          {it.producto.nombre}
                        </span>
                        {it.producto.codigoBarras ? (
                          <span className="text-xs text-[#5a5a6e] block truncate">
                            {it.producto.codigoBarras}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 text-[#9a9aac] whitespace-nowrap">
                        {unitLabel(it)}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-[#f1f1f3] whitespace-nowrap">
                        {stock}
                      </td>
                      <td className="px-3 py-3 w-28">
                        <input
                          type="number"
                          inputMode="numeric"
                          step={1}
                          min={1}
                          value={it.cantidad}
                          onChange={(e) => handleCantidad(idx, e.target.value)}
                          disabled={disabled || submitting}
                          placeholder="cant."
                          className="w-full rounded-md border border-[#2a2a32] bg-[#111114] px-2.5 py-2 text-sm text-[#f1f1f3] placeholder:text-[#4a4a5a] focus:border-[#22c55e]/50 outline-none disabled:opacity-50"
                        />
                      </td>
                      <td
                        className={`px-3 py-3 text-right font-semibold tabular-nums whitespace-nowrap ${
                          neg ? "text-rose-400" : "text-[#22c55e]"
                        }`}
                      >
                        {res == null ? (
                          <span className="text-[#5a5a6e] font-normal">—</span>
                        ) : (
                          res
                        )}
                      </td>
                      <td className="px-2 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemove(idx)}
                          disabled={disabled || submitting}
                          className="p-1.5 rounded-md text-[#5a5a6e] hover:text-rose-400 hover:bg-[#1e1e24] transition-colors disabled:opacity-40"
                          title="Quitar ítem"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={disabled || submitting}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[#22c55e] hover:bg-[#1aad4e] text-[#0d0d0f] text-sm font-semibold px-5 py-2.5 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <Check className="w-4 h-4" aria-hidden />
          {submitting ? "Procesando…" : "Registrar ajuste"}
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