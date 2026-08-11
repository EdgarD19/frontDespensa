import { ClipboardList } from "lucide-react";
import { labelTipoMovimiento, labelClasificacion } from "./tiposAjuste";

function formatFechaHora(iso) {
  if (!iso) return "—";
  const s = String(iso);
  try {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString("es-PY", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  } catch {
    /* -- */
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return s;
}

const TIPO_TAG = {
  ENTRADA: "bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/25",
  SALIDA: "bg-rose-500/10 text-rose-400 border-rose-500/25",
  AJUSTE: "bg-amber-500/10 text-amber-400 border-amber-500/25",
};

export default function HistorialAjustes({ items }) {
  if (!items?.length) {
    return (
      <div className="rounded-xl border border-dashed border-[#2a2a32] bg-[#111114]/50 p-10 text-center text-sm text-[#5a5a6e]">
        Aún no hay movimientos de stock registrados.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#1e1e24] bg-[#111114] overflow-hidden">
      <div className="px-5 py-4 border-b border-[#1e1e24]">
        <h2 className="text-base font-semibold text-[#e1e1eb] flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-[#22c55e] shrink-0" aria-hidden />
          Historial de Movimientos
        </h2>
        <p className="text-xs text-[#5a5a6e] mt-0.5">Los más recientes primero</p>
      </div>
      <ul className="divide-y divide-[#1e1e24]">
        {items.map((row, idx) => {
          const cant = row.cantidad;
          const cantNum = cant == null || Number.isNaN(Number(cant)) ? null : Number(cant);
          const cantStr =
            cantNum == null ? "—" : `${cantNum > 0 ? "+" : ""}${cantNum}`;
          const meta = [
            labelTipoMovimiento(row.tipoMovimiento),
            formatFechaHora(row.fecha),
            row.referencia ? `Ref: ${row.referencia}` : null,
          ]
            .filter(Boolean)
            .join(" • ");

          return (
            <li
              key={row.id ?? `${row.idProducto}-${row.fecha}-${idx}`}
              className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 hover:bg-[#13131a]/80 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#f1f1f3] truncate">{row.producto || "—"}</p>
                <p className="text-sm text-[#5a5a6e] mt-1 leading-snug">{meta}</p>
                <span
                  className={`inline-flex mt-2 text-[11px] font-semibold rounded-md border px-2 py-0.5 ${
                    TIPO_TAG[row.tipoMovimiento] || "bg-[#2a2a32] text-[#9a9aac] border-[#3a3a46]"
                  }`}
                >
                  {labelClasificacion(row.tipoMovimiento, row.clasificacion)}
                </span>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <span
                  className={`text-lg font-semibold tabular-nums sm:text-right min-w-[3rem] ${
                    cantNum == null
                      ? "text-[#5a5a6e]"
                      : cantNum > 0
                        ? "text-[#22c55e]"
                        : cantNum < 0
                          ? "text-rose-400"
                          : "text-[#7a7a8c]"
                  }`}
                >
                  {cantStr}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
