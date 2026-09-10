import { useState } from "react";
import { ClipboardList, Eye, PenLine, X, Save } from "lucide-react";

function fmtFechaHora(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleString("es-PY", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return String(iso);
}

function EstadoBadge({ estado }) {
  const aplicado = estado === "APLICADO";
  return (
    <span
      className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${
        aplicado
          ? "bg-[#22c55e]/10 text-[#22c55e]"
          : "bg-yellow-500/10 text-yellow-400"
      }`}
    >
      {aplicado ? "Aplicado" : "En Proceso"}
    </span>
  );
}

function calcDiff(it) {
  const raw = String(it.stockFisico ?? "").trim();
  if (raw === "") return 0;
  const f = Number(raw);
  const s = Number(it.stockSistema ?? 0);
  if (!Number.isFinite(f)) return 0;
  return f - s;
}

export default function ListasConteo({
  sesiones,
  aplicandoId,
  onChangeFisico,
  onAplicar,
  error,
}) {
  const [abiertaId, setAbiertaId] = useState(null);
  const abierta = sesiones.find((s) => s.id === abiertaId) || null;
  const esAplicado = abierta?.estado === "APLICADO";
  const aplicando = aplicandoId === abierta?.id;

  if (sesiones.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#2a2a32] bg-[#111114]/50 p-10 text-center text-sm text-[#5a5a6e]">
        Aún no generaste listas de conteo. Seleccioná productos arriba y confirmá
        para crear la primera.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#1e1e24] bg-[#111114] overflow-hidden">
      <div className="px-5 py-4 border-b border-[#1e1e24] flex items-center gap-2">
        <ClipboardList className="w-5 h-5 text-[#22c55e] shrink-0" aria-hidden />
        <h2 className="text-base font-semibold text-[#e1e1eb]">Listas Generadas</h2>
        <span className="ml-auto text-xs text-[#5a5a6e] tabular-nums">
          {sesiones.length} lista{sesiones.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-[#5a5a6e] border-b border-[#1e1e24]">
              <th className="px-5 py-2 font-medium">N° Registro</th>
              <th className="px-3 py-2 font-medium">Fecha/Hora</th>
              <th className="px-3 py-2 font-medium">Categoría/Filtro</th>
              <th className="px-3 py-2 font-medium">Estado</th>
              <th className="px-2 py-2 text-right font-medium">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e1e24]">
            {sesiones.map((s) => (
              <tr key={s.id} className="hover:bg-[#13131a]/80 transition-colors">
                <td className="px-5 py-3 font-semibold text-[#f1f1f3] tabular-nums">
                  #{s.id}
                </td>
                <td className="px-3 py-3 text-[#9a9aac] whitespace-nowrap">
                  {fmtFechaHora(s.fechaHora)}
                </td>
                <td className="px-3 py-3 text-[#e1e1eb]">
                  {s.descripcion}
                  {s.motivo ? (
                    <span className="block text-xs text-[#5a5a6e] mt-0.5">
                      {s.motivo}
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-3">
                  <EstadoBadge estado={s.estado} />
                </td>
                <td className="px-2 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => setAbiertaId(s.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#22c55e] hover:text-green-400 transition-colors"
                  >
                    {s.estado === "APLICADO" ? (
                      <>
                        <Eye className="w-4 h-4" /> Ver
                      </>
                    ) : (
                      <>
                        <PenLine className="w-4 h-4" /> Contar
                      </>
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {abierta && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1a1a20] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Lista #{abierta.id}
                </h2>
                <p className="text-xs text-[#7a7a8c] mt-0.5">
                  {abierta.descripcion}
                  {abierta.motivo ? ` • ${abierta.motivo}` : ""} • {fmtFechaHora(abierta.fechaHora)}
                </p>
              </div>
              <button
                onClick={() => setAbiertaId(null)}
                className="p-1 text-white/40 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
                >
                  {error}
                </div>
              )}

              <div className="rounded-xl border border-[#1e1e24] bg-[#111114] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wide text-[#5a5a6e] border-b border-[#1e1e24]">
                        <th className="px-4 py-2 font-medium">Producto</th>
                        <th className="px-3 py-2 font-medium text-right">
                          Stock en Sistema
                        </th>
                        <th className="px-3 py-2 font-medium">Stock Físico</th>
                        <th className="px-3 py-2 font-medium text-right">
                          Diferencia
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e1e24]">
                      {abierta.items.map((it) => {
                        const diff = calcDiff(it);
                        const diffCls =
                          diff > 0
                            ? "text-[#22c55e]"
                            : diff < 0
                              ? "text-rose-400"
                              : "text-[#6e6e80]";
                        return (
                          <tr key={it.idProducto} className="hover:bg-[#13131a]/60">
                            <td className="px-4 py-3 min-w-[12rem]">
                              <span className="font-medium text-[#f1f1f3] block truncate">
                                {it.nombre}
                              </span>
                              {it.unidadMedida ? (
                                <span className="text-xs text-[#5a5a6e]">
                                  {it.unidadMedida}
                                </span>
                              ) : null}
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums text-[#f1f1f3] whitespace-nowrap">
                              {it.stockSistema}
                            </td>
                            <td className="px-3 py-3 w-28">
                              <input
                                type="number"
                                inputMode="numeric"
                                min={0}
                                step={1}
                                value={it.stockFisico}
                                onChange={(e) =>
                                  onChangeFisico(abierta.id, it.idProducto, e.target.value)
                                }
                                disabled={esAplicado || aplicando}
                                placeholder="contado"
                                className="w-full rounded-md border border-[#2a2a32] bg-[#0d0d0f] px-2.5 py-2 text-sm text-[#f1f1f3] placeholder:text-[#4a4a5a] focus:border-[#22c55e]/50 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                            </td>
                            <td
                              className={`px-3 py-3 text-right font-semibold tabular-nums whitespace-nowrap ${diffCls}`}
                            >
                              {diff > 0 ? `+${diff}` : diff}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                </table>
              </div>
            </div>

              <div className="flex items-center justify-between pt-1">
                {!esAplicado && (
                  <span className="text-sm text-[#5a5a6e]">
                    {abierta.items.length} producto{abierta.items.length !== 1 ? "s" : ""}
                  </span>
                )}
                {esAplicado ? (
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-[#22c55e]">
                    Lista aplicada.
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onAplicar(abierta.id)}
                    disabled={aplicando}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#22c55e] hover:bg-green-400 disabled:opacity-40 disabled:pointer-events-none text-black font-medium rounded-lg transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    {aplicando ? "Aplicando…" : "Guardar / Aplicar Ajuste"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}