import { useState, useMemo } from "react";
import { ClipboardList, CalendarRange } from "lucide-react";
import {
  labelTipoMovimiento,
  motivosDeTipo,
} from "./tiposAjuste";

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

const inputFilter =
  "w-full rounded-lg border border-[#2a2a32] bg-[#111114] px-3 py-2 text-sm text-[#f1f1f3] placeholder:text-[#4a4a5a] focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/25 outline-none disabled:opacity-50 disabled:cursor-not-allowed";

const TIPO_TAG = {
  ENTRADA: "bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/25",
  SALIDA: "bg-rose-500/10 text-rose-400 border-rose-500/25",
  AJUSTE: "bg-amber-500/10 text-amber-400 border-amber-500/25",
};

export default function HistorialAjustes({
  items,
  filtrosIniciales,
  onFiltrosChange,
}) {
  const [desde, setDesde] = useState(filtrosIniciales?.desde ?? "");
  const [hasta, setHasta] = useState(filtrosIniciales?.hasta ?? "");
  const [tipoFiltro, setTipoFiltro] = useState("");

  const motivosFront = useMemo(
    () => (tipoFiltro ? motivosDeTipo(tipoFiltro) : []),
    [tipoFiltro]
  );

  function aplicarFechas() {
    onFiltrosChange?.({ desde: desde || undefined, hasta: hasta || undefined });
  }

  const filtrados = useMemo(() => {
    if (!items?.length) return items || [];
    if (!tipoFiltro) return items;
    return items.filter((row) => row.tipoMovimiento === tipoFiltro);
  }, [items, tipoFiltro]);

  if (!filtrados?.length) {
    return (
      <div className="rounded-xl border border-dashed border-[#2a2a32] bg-[#111114]/50 p-10 text-center text-sm text-[#5a5a6e]">
        {items?.length ? "No hay movimientos que coincidan con los filtros." : "Aún no hay movimientos de stock registrados."}
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
        <p className="text-xs text-[#5a5a6e] mt-0.5">Con filtros por rango de fechas y tipo</p>
      </div>

      <div className="px-5 py-4 border-b border-[#1e1e24] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <label className="block space-y-1">
          <span className="text-[11px] font-medium text-[#9a9aac]">Desde</span>
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            onBlur={aplicarFechas}
            className={inputFilter}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] font-medium text-[#9a9aac]">Hasta</span>
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            onBlur={aplicarFechas}
            className={inputFilter}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] font-medium text-[#9a9aac]">
            Tipo de movimiento{" "}
            <span className="text-[#5a5a6e]">(local)</span>
          </span>
          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value)}
            className={inputFilter}
          >
            <option value="">Todos</option>
            <option value="ENTRADA">Entrada</option>
            <option value="SALIDA">Salida</option>
            <option value="AJUSTE">Ajuste</option>
          </select>
        </label>
        <label className="block space-y-1">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#9a9aac]">
            Motivo{" "}
            <span className="text-[#5a5a6e] font-normal">(próximamente)</span>
          </span>
          <select disabled className={inputFilter} title="Requiere backend: el detalle no incluye el motivo aún">
            <option value="">{motivosFront.length ? "Seleccionar…" : "Requiere backend"}</option>
            {motivosFront.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <ul className="divide-y divide-[#1e1e24]">
        {filtrados.map((row, idx) => {
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
                  {row.tipoMovimiento || "—"}
                </span>
              </div>
              <span className="text-[11px] text-[#5a5a6e] inline-flex items-center gap-1 shrink-0">
                <CalendarRange className="w-3.5 h-3.5" aria-hidden />
                {formatFechaHora(row.fecha)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}