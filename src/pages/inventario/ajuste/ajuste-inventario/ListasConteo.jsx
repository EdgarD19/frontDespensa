import { useState } from "react";
import { ClipboardList, FileText, PenLine, Check, X, Save } from "lucide-react";
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

function completo(s) {
  return s.items.every((it) => String(it.stockFisico ?? "").trim() !== "");
}

/** Planilla imprimible de conteo (estilos de impresión `.print-invoice`). */
function PlanillaConteoImpresion({ sesion }) {
  return (
    <div className="print-invoice hidden print:block print:p-8 print:bg-white print:text-black">
      <div className="max-w-2xl mx-auto font-sans text-sm text-black">
        <h1 className="text-lg font-bold border-b border-black pb-2 mb-3">
          Lista de Conteo de Stock
        </h1>
        <p className="mb-1">
          <strong>Nº Registro:</strong> #{sesion.id}
        </p>
        {sesion.numeroInforme ? (
          <p className="mb-1">
            <strong>Informe:</strong> {sesion.numeroInforme}
          </p>
        ) : null}
        <p className="mb-1">
          <strong>Fecha:</strong> {fmtFechaHora(sesion.fechaHora)}
        </p>
        {sesion.motivo ? (
          <p className="mb-1">
            <strong>Motivo:</strong> {nombreMotivo(sesion.motivo)}
          </p>
        ) : null}
        {sesion.descripcion ? (
          <p className="mb-4">
            <strong>Descripción:</strong> {sesion.descripcion}
          </p>
        ) : null}
        <table className="w-full border-collapse mb-4">
          <thead>
            <tr className="border-b border-black">
              <th className="text-left py-1 pr-2">Producto</th>
              <th className="text-left py-1 pr-2">U.M.</th>
              <th className="text-right py-1 pr-2">Stock en sistema</th>
              <th className="text-right py-1">Stock físico</th>
            </tr>
          </thead>
          <tbody>
            {sesion.items.map((it) => (
              <tr key={it.idProducto} className="border-b border-gray-300">
                <td className="py-1 pr-2">{it.nombre}</td>
                <td className="py-1 pr-2">{it.unidadMedida || "—"}</td>
                <td className="py-1 pr-2 text-right tabular-nums">{it.stockSistema}</td>
                <td className="py-1 text-right tabular-nums">{it.stockFisico}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
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
  const [cargarId, setCargarId] = useState(null);
  const [confirmarId, setConfirmarId] = useState(null);
  const [imprimirId, setImprimirId] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);

  const cargar = sesiones.find((s) => s.id === cargarId) || null;
  const confirmar = sesiones.find((s) => s.id === confirmarId) || null;
  const imprimir = sesiones.find((s) => s.id === imprimirId) || null;
  const aplicandoConfirmar = aplicandoId === confirmar?.id;

  const filtrosActivos =
    filtroEstado !== "" || filtroMotivo !== "" || fechaDesde !== "" || fechaHasta !== "";

  const totalItems = sesiones.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages - 1);
  const pageSesiones = sesiones.slice(
    safePage * ITEMS_PER_PAGE,
    (safePage + 1) * ITEMS_PER_PAGE
  );

  function imprimirPdf(id) {
    setImprimirId(id);
    setTimeout(() => {
      window.print();
      setImprimirId(null);
    }, 100);
  }

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
              <th className="px-2 py-2 text-right font-medium">Acciones</th>
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
            pageSesiones.map((s) => {
              const listo = completo(s);
              const aplicado = s.estado === "APLICADO";
              return (
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
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => imprimirPdf(s.id)}
                      className="p-1.5 rounded text-white/40 hover:text-[#22c55e] hover:bg-[#22c55e]/10 transition-colors"
                      title="Planilla / PDF"
                      aria-label="Generar PDF de la lista"
                    >
                      <FileText size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCargarId(s.id)}
                      className="p-1.5 rounded text-white/40 hover:text-[#22c55e] hover:bg-[#22c55e]/10 transition-colors"
                      title={aplicado ? "Ver carga de stock" : "Cargar stock físico"}
                      aria-label="Cargar stock físico"
                    >
                      <PenLine size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmarId(s.id)}
                      disabled={aplicado || !listo}
                      className="p-1.5 rounded text-white/40 hover:text-[#22c55e] hover:bg-[#22c55e]/10 transition-colors disabled:opacity-25 disabled:pointer-events-none"
                      title={listo ? "Confirmar ajuste" : "Cargá el stock físico primero"}
                      aria-label="Confirmar ajuste"
                    >
                      <Check size={16} />
                    </button>
                  </div>
                </td>
              </tr>
              );
            })
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

      {/* Modal: cargar stock físico (solo producto + stock a cargar) */}
      {cargar && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1a1a20] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Cargar Stock Físico — Lista #{cargar.id}
                </h2>
                <p className="text-xs text-[#7a7a8c] mt-0.5">
                  {cargar.descripcion}
                  {cargar.motivo ? ` • ${cargar.motivo}` : ""}
                  {cargar.numeroInforme ? ` • ${cargar.numeroInforme}` : ""}• {fmtFechaHora(cargar.fechaHora)}
                </p>
              </div>
              <button
                onClick={() => setCargarId(null)}
                className="p-1 text-white/40 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-[#5a5a6e] border-b border-[#1e1e24]">
                    <th className="px-4 py-2 font-medium">Producto</th>
                    <th className="px-3 py-2 font-medium">Stock Físico a cargar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e1e24]">
                  {cargar.items.map((it) => (
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
                      <td className="px-3 py-3 w-32">
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          step={1}
                          value={it.stockFisico}
                          onChange={(e) =>
                            onChangeFisico(cargar.id, it.idProducto, e.target.value)
                          }
                          disabled={cargar.estado === "APLICADO"}
                          placeholder="contado"
                          className="w-full rounded-md border border-[#2a2a32] bg-[#0d0d0f] px-2.5 py-2 text-sm text-[#f1f1f3] placeholder:text-[#4a4a5a] focus:border-[#22c55e]/50 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex items-center justify-between pt-1">
                <span className="text-sm text-[#5a5a6e]">
                  {cargar.items.filter((it) => String(it.stockFisico ?? "").trim() !== "").length} de {cargar.items.length} producto{cargar.items.length !== 1 ? "s" : ""} cargado{cargar.items.length !== 1 ? "s" : ""}
                </span>
                <button
                  type="button"
                  onClick={() => setCargarId(null)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#22c55e] hover:bg-green-400 text-black font-medium rounded-lg transition-colors"
                >
                  Listo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: resumen y confirmación del ajuste */}
      {confirmar && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1a1a20] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Confirmar Ajuste — Lista #{confirmar.id}
                </h2>
                <p className="text-xs text-[#7a7a8c] mt-0.5">
                  {confirmar.descripcion}
                  {confirmar.motivo ? ` • ${confirmar.motivo}` : ""}
                  {confirmar.numeroInforme ? ` • ${confirmar.numeroInforme}` : ""}• {fmtFechaHora(confirmar.fechaHora)}
                </p>
              </div>
              <button
                onClick={() => setConfirmarId(null)}
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
                        <th className="px-3 py-2 font-medium text-right">Cant. en sistema</th>
                        <th className="px-3 py-2 font-medium text-right">Stock físico cargado</th>
                        <th className="px-3 py-2 font-medium text-right">Diferencia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e1e24]">
                      {confirmar.items.map((it) => {
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
                            <td className="px-3 py-3 text-right tabular-nums text-[#f1f1f3] whitespace-nowrap">
                              {it.stockFisico}
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

              <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
                {confirmar.estado === "APLICADO" ? (
                  <>
                    <span className="inline-flex items-center gap-2 text-sm font-medium text-[#22c55e]">
                      Lista aplicada.
                    </span>
                    <button
                      type="button"
                      onClick={() => setConfirmarId(null)}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#22c55e] hover:bg-green-400 text-black font-medium rounded-lg transition-colors"
                    >
                      Cerrar
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-sm text-[#5a5a6e]">
                      Al confirmar, el stock se actualiza al conteo físico.
                    </span>
                    <button
                      type="button"
                      onClick={() => onAplicar(confirmar.id)}
                      disabled={aplicandoConfirmar}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#22c55e] hover:bg-green-400 disabled:opacity-40 disabled:pointer-events-none text-black font-medium rounded-lg transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      {aplicandoConfirmar ? "Aplicando…" : "Confirmar ajuste"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {imprimir && <PlanillaConteoImpresion sesion={imprimir} />}
    </div>
  );
}