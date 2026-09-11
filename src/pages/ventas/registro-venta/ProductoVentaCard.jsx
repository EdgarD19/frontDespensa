import { Plus, Scale } from "lucide-react";
import { formatMoney, parsePrecioVenta, parseStockDisponible } from "./utils";

export default function ProductoVentaCard({ producto, onAgregar, disabled }) {
  const esPesable = producto.productoPesable === "si";
  const precio = parsePrecioVenta(producto);
  const stock = parseStockDisponible(producto);
  const sinStock = stock <= 0;
  const unidadLabel = producto.unitAbbreviation || (esPesable ? "kg" : "u.");

  return (
    <div className="rounded-xl border border-[#1e1e24] bg-[#111114] overflow-hidden flex flex-col p-3 gap-2">
      {esPesable && (
        <div className="flex items-center gap-1 text-[#06b6d4]">
          <Scale className="w-3.5 h-3.5" aria-hidden />
          <span className="text-[10px] font-semibold uppercase tracking-wide">Pesable</span>
        </div>
      )}
      <p className="text-sm font-semibold text-[#f1f1f3] line-clamp-2 min-h-[2.5rem]">{producto.nombre || "—"}</p>
      <div className="flex justify-between items-baseline gap-2 text-sm">
        <span className="text-[#22c55e] font-semibold tabular-nums">
          {esPesable ? `${formatMoney(precio)}/${unidadLabel}` : formatMoney(precio)}
        </span>
        <span
          className={`text-xs tabular-nums ${sinStock ? "text-rose-400 font-medium" : "text-[#9a9aac]"}`}
        >
          Stock: {stock} {esPesable ? "kg" : ""}
        </span>
      </div>
      <button
        type="button"
        disabled={disabled || sinStock}
        onClick={() => onAgregar(producto, esPesable ? 1.0 : 1)}
        className="w-full inline-flex items-center justify-center gap-1 rounded-lg bg-[#22c55e]/90 hover:bg-[#22c55e] text-[#0d0d0f] text-xs font-semibold py-2.5 disabled:opacity-40 disabled:pointer-events-none mt-1"
      >
        <Plus className="w-3.5 h-3.5" aria-hidden />
        Agregar
      </button>
    </div>
  );
}
