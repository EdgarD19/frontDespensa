import { useState } from "react";
import { Plus } from "lucide-react";
import { formatMoney, parsePrecioVenta, parseStockDisponible } from "./utils";

export default function ProductoVentaCard({ producto, onAgregar, disabled }) {
  const [cantidad, setCantidad] = useState(1);

  const precio = parsePrecioVenta(producto);
  const stock = parseStockDisponible(producto);
  const sinStock = stock <= 0;

  function handleAgregar() {
    const q = Math.max(1, Math.trunc(Number(cantidad)));
    if (!Number.isFinite(q) || q < 1) return;
    onAgregar(producto, q);
    setCantidad(1);
  }

  return (
    <div className="rounded-xl border border-[#1e1e24] bg-[#111114] overflow-hidden flex flex-col p-3 gap-2">
      <p className="text-sm font-semibold text-[#f1f1f3] line-clamp-2 min-h-[2.5rem]">{producto.nombre || "—"}</p>
      <p className="text-xs text-[#5a5a6e] truncate">{producto.codigoBarras ? `CB ${producto.codigoBarras}` : "Sin código"}</p>
      <div className="flex justify-between items-baseline gap-2 text-sm">
        <span className="text-[#22c55e] font-semibold tabular-nums">{formatMoney(precio)}</span>
        <span
          className={`text-xs tabular-nums ${sinStock ? "text-rose-400 font-medium" : "text-[#9a9aac]"}`}
        >
          Stock: {sinStock ? "0" : stock}
        </span>
      </div>
      <div className="flex items-center gap-2 mt-auto pt-1">
        <label className="sr-only" htmlFor={`qty-${producto.id}`}>
          Cantidad
        </label>
        <input
          id={`qty-${producto.id}`}
          type="number"
          min={1}
          max={Math.max(1, stock)}
          step={1}
          value={cantidad}
          disabled={disabled || sinStock}
          onChange={(e) => setCantidad(e.target.value)}
          className="w-16 rounded-lg border border-[#2a2a32] bg-[#0d0d0f] px-2 py-1.5 text-sm text-[#f1f1f3] tabular-nums disabled:opacity-40"
        />
        <button
          type="button"
          disabled={disabled || sinStock}
          onClick={handleAgregar}
          className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-[#22c55e]/90 hover:bg-[#22c55e] text-[#0d0d0f] text-xs font-semibold py-2 disabled:opacity-40 disabled:pointer-events-none"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden />
          Agregar
        </button>
      </div>
    </div>
  );
}
