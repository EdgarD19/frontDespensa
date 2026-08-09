import { ClipboardList } from "lucide-react";
import { labelTipoAjuste } from "./tiposAjuste";

const ESTADO_LABEL = {
  PENDIENTE_DE_AUTORIZACION: "Pendiente de autorización",
  AUTORIZADO: "Autorizado",
  RECHAZADO: "Rechazado",
};

function formatFechaHora(iso) {
  if (!iso) return "—";
  const s = String(iso);
  try {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  } catch {
    /* ignore */
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return s;
}

export default function HistorialAjustes({ items, autorizandoId, onAutorizar, canAutorizar }) {
  if (!items?.length) {
    return (
      <div className="rounded-xl border border-dashed border-[#2a2a32] bg-[#111114]/50 p-10 text-center text-sm text-[#5a5a6e]">
        Aún no hay ajustes registrados.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#1e1e24] bg-[#111114] overflow-hidden">
      <div className="px-5 py-4 border-b border-[#1e1e24]">
        <h2 className="text-base font-semibold text-[#e1e1eb] flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-[#22c55e] shrink-0" aria-hidden />
          Historial de Ajustes
        </h2>
        <p className="text-xs text-[#5a5a6e] mt-0.5">Los más recientes primero</p>
      </div>
      <ul className="divide-y divide-[#1e1e24]">
        {items.map((row, idx) => {
          const pendiente = row.estado === "PENDIENTE_DE_AUTORIZACION";
          const diff = row.diferencia;
          const diffNum = diff == null || Number.isNaN(Number(diff)) ? null : Number(diff);
          const diffStr =
            diffNum == null ? "—" : `${diffNum > 0 ? "+" : ""}${diffNum}`;
          const meta = [
            labelTipoAjuste(row.tipoAjuste),
            formatFechaHora(row.fechaAjuste),
            row.autorizadoPor ? `Autorizado por: ${row.autorizadoPor}` : null,
            ESTADO_LABEL[row.estado] || row.estado,
          ]
            .filter(Boolean)
            .join(" • ");

          return (
            <li
              key={row.id ?? `${row.idProducto}-${row.fechaAjuste}-${idx}`}
              className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 hover:bg-[#13131a]/80 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#f1f1f3] truncate">{row.nombreProducto || "—"}</p>
                <p className="text-sm text-[#5a5a6e] mt-1 leading-snug">{meta}</p>
                {canAutorizar && pendiente && row.id != null ? (
                  <button
                    type="button"
                    disabled={autorizandoId === row.id}
                    onClick={() => onAutorizar(row)}
                    className="mt-2 text-xs font-semibold rounded-lg bg-[#3b82f6]/90 hover:bg-[#3b82f6] text-white px-3 py-1.5 disabled:opacity-40 sm:hidden"
                  >
                    {autorizandoId === row.id ? "…" : "Autorizar"}
                  </button>
                ) : null}
              </div>
              <div className="flex items-center gap-4 shrink-0">
                {canAutorizar && pendiente && row.id != null ? (
                  <button
                    type="button"
                    disabled={autorizandoId === row.id}
                    onClick={() => onAutorizar(row)}
                    className="hidden sm:inline-flex text-xs font-semibold rounded-lg bg-[#3b82f6]/90 hover:bg-[#3b82f6] text-white px-3 py-1.5 disabled:opacity-40"
                  >
                    {autorizandoId === row.id ? "…" : "Autorizar"}
                  </button>
                ) : null}
                <span
                  className={`text-lg font-semibold tabular-nums sm:text-right min-w-[3rem] ${
                    diffNum == null
                      ? "text-[#5a5a6e]"
                      : diffNum > 0
                        ? "text-[#22c55e]"
                        : diffNum < 0
                          ? "text-rose-400"
                          : "text-[#7a7a8c]"
                  }`}
                >
                  {diffStr}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
