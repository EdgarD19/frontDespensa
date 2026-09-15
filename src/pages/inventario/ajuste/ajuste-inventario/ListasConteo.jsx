import { useState } from "react";
import { ClipboardList, Eye, PenLine, X, Save } from "lucide-react";
import Pagination from "../../../../components/ui/Pagination";

const ITEMS_PER_PAGE = 10;

const MOTIVO_LABELS = { ROBO: "Robo", MERMA: "Merma", REGALO: "Regalo", ERROR: "Error", OTROS: "Otros" };
function nombreMotivo(m) { return MOTIVO_LABELS[m] || m || "—"; }

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
      {aplicado ? "Aplicado" : "Pendiente"}
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
  total = 0,
  aplicandoId,
  filtroEstado = "",
  onFiltroEstadoChange,
  fechaDesde = "",
  onFechaDesdeChange,
  fechaHasta = "",
  onFechaHastaChange,
  filtroMotivo = "",
  onFiltroMotivoChange,
  onChangeFisico,
  onAplicar,
  error,
}) {
  const [abiertaId, setAbiertaId] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const abierta = sesiones.find((s) => s.id === abiertaId) || null;
  const esAplicado = abierta?.estado === "APLICADO";
  const aplicando = aplicandoId === abierta?.id;
  const filtrosActivos =
    filtroEstado !== "" || filtroMotivo !== "" || fechaDesde !== "" || fechaHasta !== "";

  const totalItems = sesiones.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages - 1);
  const pageSesiones = sesiones.slice(
    safePage * ITEMS_PER_PAGE,
    (safePage + 1) * ITEMS_PER_PAGE
  );

  if (total === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#2a2a32] bg-[#111114]/50 p-10 text-center text-sm text-[#5a5a6e]">
        Aún no generaste listas de conteo. Usá el botón "Nueva lista" para
        crear la primera.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#1e1e24] bg-[#111114] overflow-hidden">
      <div className="px-5 py-4 border-b border-[#1e1e24]">
        <div className="flex items-center gap-3 flex-wrap">
          <ClipboardList className="w-5 h-5 text-[#22c55e] shrink-0" aria-hidden />
          <h2 className="text-base font-semibold text-[#e1e1eb]">Listas Generadas</h2>
          <span className="ml-auto text-xs text-[#5a5a6e] tabular-nums whitespace-nowrap">
            {total} lista{total !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="block space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wide text-[#5a5a6e]">
              Estado
            </span>
            <select
              value={filtroEstado}
              onChange={(e) => {
                onFiltroEstadoChange?.(e.target.value);
                setCurrentPage(0);
              }}
              className="w-full rounded-lg border border-[#2a2a32] bg-[#0d0d0f] px-3 py-1.5 text-xs text-[#f1f1f3] focus:border-[#22c55e]/50 outline-none transition-colors"
            >
              <option value="">Todos</option>
              <option value="PENDIENTE">Pendientes</option>
              <option value="APLICADO">Aplicadas</option>
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wide text-[#5a5a6e]">
              Motivo
            </span>
            <select
              value={filtroMotivo}
              onChange={(e) => {
                onFiltroMotivoChange?.(e.target.value);
                setCurrentPage(0);
              }}
              className="w-full rounded-lg border border-[#2a2a32] bg-[#0d0d0f] px-3 py-1.5 text-xs text-[#f1f1f3] focus:border-[#22c55e]/50 outline-none transition-colors"
            >
              <option value="">Todos</option>
              {Object.entries(MOTIVO_LABELS).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wide text-[#5a5a6e]">
              Desde
            </span>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => {
                onFechaDesdeChange?.(e.target.value);
                setCurrentPage(0);
              }}
              className="w-full rounded-lg border border-[#2a2a32] bg-[#0d0d0f] px-3 py-1.5 text-xs text-[#f1f1f3] focus:border-[#22c55e]/50 outline-none transition-colors"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wide text-[#5a5a6e]">
              Hasta
            </span>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => {
                onFechaHastaChange?.(e.target.value);
                setCurrentPage(0);
              }}
              className="w-full rounded-lg border border-[#2a2a32] bg-[#0d0d0f] px-3 py-1.5 text-xs text-[#f1f1f3] focus:border-[#22c55e]/50 outline-none transition-colors"
            />
          </label>
        </div>

        {filtrosActivos ? (
          <button
            type="button"
            onClick={() => {
              onFiltroEstadoChange?.("");
              onFiltroMotivoChange?.("");
              onFechaDesdeChange?.("");
              onFechaHastaChange?.("");
              setCurrentPage(0);
            }}
            className="mt-3 text-xs font-medium text-[#22c55e] hover:text-green-400 transition-colors"
          >
            Limpiar filtros
          </button>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-[#5a5a6e] border-b border-[#1e1e24]">
              <th className="px-5 py-2 font-medium">N° Registro</th>
              <th className="px-3 py-2 font-medium">Fecha/Hora</th>
              <th className="px-3 py-2 font-medium">Motivo</th>
              <th className="px-3 py-2 font-medium">Estado</th>
              <th className="px-2 py-2 text-right font-medium">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e1e24]">
            {totalItems === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-sm text-[#5a5a6e]">
                  {filtrosActivos
                    ? "No se encontraron listas con esos filtros."
                    : "Aún no generaste listas de conteo."}
                </td>
              </tr>
            ) : (
            pageSesiones.map((s) => (
              <tr key={s.id} className="hover:bg-[#13131a]/80 transition-colors">
                <td className="px-5 py-3 font-semibold text-[#f1f1f3] tabular-nums">
                  #{s.id}
                  {s.numeroInforme ? (
                    <span className="block text-xs font-normal text-[#22c55e] mt-0.5">
                      {s.numeroInforme}
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-3 text-[#9a9aac] whitespace-nowrap">
                  {fmtFechaHora(s.fechaHora)}
                </td>
                <td className="px-3 py-3 text-[#e1e1eb]">
                  {nombreMotivo(s.motivo)}
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
                        <PenLine className="w-4 h-4" /> Conteo
                      </>
                    )}
                  </button>
                </td>
              </tr>
            ))
            )}
          </tbody>
        </table>
      </div>

      {totalItems > 0 && (
        <Pagination
          page={safePage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          pageSize={ITEMS_PER_PAGE}
          totalItems={totalItems}
          className="px-5 py-4 border-t border-[#1e1e24]"
        />
      )}

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
                  {abierta.motivo ? ` • ${abierta.motivo}` : ""}
                  {abierta.numeroInforme ? ` • ${abierta.numeroInforme}` : ""}• {fmtFechaHora(abierta.fechaHora)}
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