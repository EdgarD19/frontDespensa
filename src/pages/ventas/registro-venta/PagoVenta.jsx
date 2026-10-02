import { Banknote, Landmark } from "lucide-react";
import { formatMoney, FORMA_PAGO_EFECTIVO, FORMA_PAGO_TRANSFERENCIA } from "./utils";

export default function PagoVenta({
  total,
  formaPago,
  onFormaPagoChange,
  montoPagado,
  onMontoChange,
  cambio,
  puedeConfirmar,
  onConfirmar,
  confirmando,
  mensajeBloqueo,
}) {
  const esEfectivo = formaPago === FORMA_PAGO_EFECTIVO;

  return (
    <div className="rounded-xl border border-[#1e1e24] bg-[#111114] p-4 space-y-4">
      <h3 className="text-sm font-semibold text-[#e1e1eb]">Pago</h3>

      <div>
        <p className="text-xs text-[#7a7a8c] mb-2">Forma de pago</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onFormaPagoChange(FORMA_PAGO_EFECTIVO)}
            className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
              esEfectivo
                ? "border-[#22c55e]/50 bg-[#22c55e]/15 text-[#22c55e]"
                : "border-[#2a2a32] bg-[#0d0d0f] text-[#9a9aac] hover:border-[#3a3a48]"
            }`}
          >
            <Banknote className="w-4 h-4 shrink-0" aria-hidden />
            Efectivo
          </button>
          <button
            type="button"
            onClick={() => onFormaPagoChange(FORMA_PAGO_TRANSFERENCIA)}
            className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
              !esEfectivo
                ? "border-[#22c55e]/50 bg-[#22c55e]/15 text-[#22c55e]"
                : "border-[#2a2a32] bg-[#0d0d0f] text-[#9a9aac] hover:border-[#3a3a48]"
            }`}
          >
            <Landmark className="w-4 h-4 shrink-0" aria-hidden />
            Transferencia
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-[#9a9aac]">Total</span>
          <span className="text-[#22c55e] font-bold tabular-nums text-lg">{formatMoney(total)}</span>
        </div>

        {esEfectivo ? (
          <label className="block space-y-1">
            <span className="text-xs text-[#7a7a8c]">Monto recibido</span>
            <input
              type="number"
              min={0}
              step="1"
              inputMode="numeric"
              value={montoPagado}
              onChange={(e) => onMontoChange(e.target.value)}
              className="w-full rounded-lg border border-[#2a2a32] bg-[#0d0d0f] px-3 py-2.5 text-sm text-[#f1f1f3] tabular-nums outline-none focus:border-[#22c55e]/50"
            />
          </label>
        ) : (
          <p className="text-xs text-[#5a5a6e] leading-relaxed rounded-lg border border-[#2a2a32] bg-[#0d0d0f] px-3 py-2.5">
            Se registra el pago por el <strong className="text-[#9a9aac]">total exacto</strong>. No aplica
            cambio.
          </p>
        )}

        <div className="flex justify-between text-sm pt-1">
          <span className="text-[#9a9aac]">Cambio</span>
          <span className="text-[#f1f1f3] font-semibold tabular-nums">{formatMoney(cambio)}</span>
        </div>
      </div>
      {mensajeBloqueo ? (
        <p className="text-xs text-amber-400/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          {mensajeBloqueo}
        </p>
      ) : null}
      <button
        type="button"
        disabled={!puedeConfirmar || confirmando}
        onClick={onConfirmar}
        className="w-full rounded-lg bg-[#22c55e]/90 hover:bg-[#22c55e] text-[#0d0d0f] font-semibold py-3 disabled:opacity-40 disabled:pointer-events-none"
      >
        {confirmando ? "Registrando…" : "Confirmar venta"}
      </button>
    </div>
  );
}
