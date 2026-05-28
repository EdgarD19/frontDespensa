import { Trash2, RotateCcw } from "lucide-react";
import { formatMoney, parsePrecioVenta, parseStockDisponible, esProductoPesable } from "./utils";

export default function CarritoVenta({ lineas, onCambiarCantidad, onEliminar, onCancelarTodo, subtotal, iva, total }) {
  return (
    <div className="rounded-xl border border-[#1e1e24] bg-[#111114] overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-[#1e1e24] flex justify-between items-center">
        <div>
          <h2 className="text-base font-semibold text-[#e1e1eb]">Venta actual</h2>
          <p className="text-xs text-[#5a5a6e]">Modificá cantidades o quitá ítems antes de confirmar</p>
        </div>
        <p className="text-lg font-bold text-[#22c55e] tabular-nums">{formatMoney(total)}</p>
      </div>
      <ul className="divide-y divide-[#1e1e24] max-h-[min(40vh,360px)] overflow-y-auto">
        {lineas.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-[#5a5a6e]">El carrito está vacío.</li>
        ) : (
          lineas.map((line) => {
            const pesable = esProductoPesable(line);
            const precio = parsePrecioVenta(line);
            const stockMax = parseStockDisponible(line);
            const sub = precio * line.cantidad;
            return (
              <li key={line.productoId} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#f1f1f3] truncate">{line.nombre}</p>
                  <p className="text-xs text-[#5a5a6e]">
                    {pesable
                      ? `${formatMoney(precio)}/kg · disp. ${stockMax} kg`
                      : `${formatMoney(precio)} c/u · máx. ${stockMax} u.`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number"
                    min={pesable ? 0.001 : 1}
                    max={stockMax}
                    step={pesable ? 0.1 : 1}
                    value={line.cantidad}
                    onChange={(e) => onCambiarCantidad(line.productoId, e.target.value)}
                    className="w-20 rounded-lg border border-[#2a2a32] bg-[#0d0d0f] px-2 py-1.5 text-sm text-[#f1f1f3] tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-xs text-[#5a5a6e] w-5">{pesable ? "kg" : "u."}</span>
                  <span className="text-sm font-semibold text-[#e1e1eb] w-24 text-right tabular-nums">
                    {formatMoney(sub)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onEliminar(line.productoId)}
                    className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30"
                    title="Quitar"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden />
                  </button>
                </div>
              </li>
            );
          })
        )}
      </ul>
      {lineas.length > 0 && (
        <div className="border-t border-[#1e1e24] px-4 py-3 space-y-1.5">
          <div className="flex justify-between text-sm text-[#9a9aac]">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatMoney(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-[#9a9aac]">
            <span>IVA (10%)</span>
            <span className="tabular-nums">{formatMoney(iva)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold text-[#f1f1f3] pt-1 border-t border-[#1e1e24]">
            <span>Total</span>
            <span className="tabular-nums">{formatMoney(total)}</span>
          </div>
          <button
            type="button"
            onClick={onCancelarTodo}
            className="mt-2 w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs font-semibold py-2"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden />
            Cancelar todo
          </button>
        </div>
      )}
    </div>
  );
}
