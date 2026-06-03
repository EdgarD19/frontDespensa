import { useState, useEffect, useCallback } from "react";
import { DollarSign, TrendingUp, TrendingDown, Plus, History as HistoryIcon, AlertCircle, Check, Search, Filter } from "lucide-react";
import { registrarMovimiento, getMovimientos } from "../../../api/cajaMovimientosApi";
import { getCajaActual } from "../../../api/cajaApi";
import { apiErrorMessage } from "../../../api/errors";

const CONCEPTOS_INGRESO = ["Fondeo de caja", "Otro"];
const CONCEPTOS_EGRESO = ["Retiro de efectivo", "Pago de servicios", "Gasto varios", "Compra de insumos", "Otro"];

const inputClass = "w-full rounded-lg border border-[#2a2a32] bg-[#0d0d0f] px-3 py-2.5 text-sm text-[#f1f1f3] placeholder:text-[#4a4a5a] focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/25 outline-none disabled:opacity-50";
const labelClass = "text-xs font-medium text-[#7a7a8c]";

export default function MovimientosCaja() {
  const [caja, setCaja] = useState(null);
  const [loadingCaja, setLoadingCaja] = useState(true);
  const [movimientos, setMovimientos] = useState([]);
  const [loadingMovs, setLoadingMovs] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [filtroTipo, setFiltroTipo] = useState("");
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);
  const [tab, setTab] = useState("registrar");

  const [form, setForm] = useState({
    tipoMovimiento: "INGRESO",
    concepto: "",
    monto: "",
    descripcion: "",
    autorizadoPor: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const loadCaja = useCallback(async () => {
    setLoadingCaja(true);
    try {
      const data = await getCajaActual();
      setCaja(data);
    } catch {
      setCaja(null);
    } finally {
      setLoadingCaja(false);
    }
  }, []);

  const loadMovimientos = useCallback(async () => {
    setLoadingMovs(true);
    try {
      const data = await getMovimientos({ tipo: filtroTipo || undefined, page, size: 50 });
      setMovimientos(data.content || []);
      setTotalPages(data.totalPages || 0);
    } catch {
      setMovimientos([]);
    } finally {
      setLoadingMovs(false);
    }
  }, [filtroTipo, page]);

  useEffect(() => { loadCaja(); }, [loadCaja]);
  useEffect(() => { loadMovimientos(); }, [loadMovimientos]);

  const resetForm = () => {
    setForm({ tipoMovimiento: "INGRESO", concepto: "", monto: "", descripcion: "", autorizadoPor: "" });
  };

  const conceptos = form.tipoMovimiento === "INGRESO" ? CONCEPTOS_INGRESO : CONCEPTOS_EGRESO;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setExito(null);

    const montoNum = parseFloat(form.monto.replace(",", "."));
    if (!Number.isFinite(montoNum) || montoNum <= 0) {
      setError("El monto debe ser mayor a 0");
      return;
    }
    if (!form.concepto) {
      setError("Seleccioná un concepto");
      return;
    }
    if (form.concepto === "Otro" && !form.descripcion.trim()) {
      setError("Completá la descripción para el concepto 'Otro'");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        tipoMovimiento: form.tipoMovimiento,
        concepto: form.concepto,
        monto: montoNum,
        descripcion: form.descripcion.trim() || undefined,
        autorizadoPor: form.autorizadoPor.trim() || undefined,
      };
      await registrarMovimiento(payload);
      setExito("Movimiento registrado correctamente");
      resetForm();
      await loadCaja();
      await loadMovimientos();
    } catch (err) {
      setError(apiErrorMessage(err) || "Error al registrar movimiento");
    } finally {
      setSubmitting(false);
    }
  };

  const format = (n) => {
    if (n == null) return "$0";
    return "$" + Number(n).toLocaleString("es-PY", { minimumFractionDigits: 0 });
  };

  const formatFecha = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("es-PY");
  };

  const saldoActual = caja
    ? (caja.montoInicial || 0) + (caja.totalIngresos || 0) - (caja.totalEgresos || 0)
    : null;

  if (loadingCaja) {
    return (
      <div className="max-w-5xl mx-auto py-8 px-4">
        <div className="space-y-4 animate-pulse">
          <div className="h-8 w-56 bg-white/5 rounded" />
          <div className="h-4 w-72 bg-white/5 rounded" />
          <div className="h-48 rounded-xl border border-[#1e1e24] bg-[#111114]" />
        </div>
      </div>
    );
  }

  if (!caja) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-4">
        <DollarSign className="w-12 h-12 text-[#5a5a6e] mx-auto" />
        <h1 className="text-lg font-semibold text-[#e1e1eb]">No hay caja abierta</h1>
        <p className="text-sm text-[#7a7a8c]">Abrí una caja desde Apertura y Cierre antes de registrar movimientos.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-[#f1f1f3] tracking-tight">Ingresos y Egresos</h1>
        <p className="text-sm text-[#5a5a6e]">Registrá movimientos de caja y consultá el historial</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-1 rounded-xl border border-[#1e1e24] bg-[#111114] px-5 py-4">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5a5a6e]">Saldo actual</span>
          <span className="text-xl font-bold text-[#22c55e]">{format(saldoActual)}</span>
        </div>
        <div className="flex flex-col gap-1 rounded-xl border border-[#1e1e24] bg-[#111114] px-5 py-4">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5a5a6e]">Ingresos</span>
          <span className="text-xl font-bold text-blue-400">{format(caja.totalIngresos)}</span>
        </div>
        <div className="flex flex-col gap-1 rounded-xl border border-[#1e1e24] bg-[#111114] px-5 py-4">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5a5a6e]">Egresos</span>
          <span className="text-xl font-bold text-rose-400">{format(caja.totalEgresos)}</span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
      {exito && (
        <div className="flex items-center gap-2 rounded-lg border border-[#22c55e]/30 bg-[#22c55e]/10 px-4 py-3 text-sm text-green-300">
          <Check className="w-4 h-4 shrink-0" />
          {exito}
        </div>
      )}

      <div className="flex gap-1 rounded-lg bg-[#0d0d0f] border border-[#1e1e24] p-1 w-fit">
        <button onClick={() => { setTab("registrar"); setError(null); setExito(null); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === "registrar" ? "bg-[#22c55e]/15 text-[#22c55e]" : "text-[#5a5a6e] hover:text-[#b0b0c0]"}`}>
          <Plus className="w-4 h-4" />
          Registrar
        </button>
        <button onClick={() => { setTab("historial"); setError(null); setExito(null); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === "historial" ? "bg-[#22c55e]/15 text-[#22c55e]" : "text-[#5a5a6e] hover:text-[#b0b0c0]"}`}>
          <HistoryIcon className="w-4 h-4" />
          Historial
        </button>
      </div>

      {tab === "registrar" && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-[#1e1e24] bg-[#111114] overflow-hidden">
          <div className="px-5 pt-5 pb-4 border-b border-[#1e1e24]">
            <h2 className="text-base font-semibold text-[#e1e1eb] flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#22c55e]" />
              Nuevo Movimiento
            </h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex gap-2 p-1 rounded-lg bg-[#0d0d0f] border border-[#1e1e24] w-fit">
              <button type="button" onClick={() => setForm((p) => ({ ...p, tipoMovimiento: "INGRESO", concepto: "" }))}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${form.tipoMovimiento === "INGRESO" ? "bg-[#22c55e]/15 text-[#22c55e]" : "text-[#5a5a6e] hover:text-[#b0b0c0]"}`}>
                Ingreso
              </button>
              <button type="button" onClick={() => setForm((p) => ({ ...p, tipoMovimiento: "EGRESO", concepto: "" }))}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${form.tipoMovimiento === "EGRESO" ? "bg-rose-500/15 text-rose-400" : "text-[#5a5a6e] hover:text-[#b0b0c0]"}`}>
                Egreso
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className={labelClass}>Concepto <span className="text-amber-500">*</span></span>
                <select value={form.concepto} onChange={(e) => setForm((p) => ({ ...p, concepto: e.target.value }))} required className={inputClass}>
                  <option value="">Seleccionar concepto…</option>
                  {conceptos.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label className="block space-y-1">
                <span className={labelClass}>Monto <span className="text-amber-500">*</span></span>
                <input type="number" step="0.01" min="0.01" value={form.monto} onChange={(e) => setForm((p) => ({ ...p, monto: e.target.value }))} required placeholder="0.00" className={inputClass} />
              </label>
            </div>

            {form.concepto === "Otro" && (
              <label className="block space-y-1">
                <span className={labelClass}>Descripción del concepto <span className="text-amber-500">*</span></span>
                <textarea value={form.descripcion} onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))} rows={2} placeholder="Especificá el motivo" className={`${inputClass} resize-y min-h-[4rem]`} />
              </label>
            )}

            <label className="block space-y-1">
              <span className={labelClass}>Autorizado por</span>
              <input type="text" value={form.autorizadoPor} onChange={(e) => setForm((p) => ({ ...p, autorizadoPor: e.target.value }))} placeholder="Nombre de quien autoriza" className={inputClass} />
            </label>

            <div className="flex justify-end pt-2">
              <button type="submit" disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-[#22c55e]/90 hover:bg-[#22c55e] text-[#0d0d0f] text-sm font-semibold px-5 py-2.5 disabled:opacity-40 border border-[#22c55e]/30">
                <Check className="w-4 h-4" />
                {submitting ? "Registrando…" : "Registrar Movimiento"}
              </button>
            </div>
          </div>
        </form>
      )}

      {tab === "historial" && (
        <div className="rounded-xl border border-[#1e1e24] bg-[#111114] overflow-hidden">
          <div className="px-5 pt-5 pb-4 border-b border-[#1e1e24] flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-[#e1e1eb] flex items-center gap-2">
              <HistoryIcon className="w-5 h-5 text-[#22c55e]" />
              Historial de Movimientos
            </h2>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#5a5a6e]" />
              <select value={filtroTipo} onChange={(e) => { setFiltroTipo(e.target.value); setPage(0); }}
                className="rounded-lg border border-[#2a2a32] bg-[#0d0d0f] px-3 py-1.5 text-xs text-[#f1f1f3] outline-none focus:border-[#22c55e]/50">
                <option value="">Todos</option>
                <option value="INGRESO">Solo ingresos</option>
                <option value="EGRESO">Solo egresos</option>
              </select>
            </div>
          </div>

          {loadingMovs ? (
            <div className="p-10 text-center text-sm text-[#5a5a6e]">Cargando…</div>
          ) : movimientos.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <Search className="w-8 h-8 text-[#3a3a4a] mx-auto" />
              <p className="text-sm text-[#5a5a6e]">No hay movimientos registrados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1e1e24] text-[#5a5a6e] text-xs uppercase tracking-wider">
                    <th className="text-left px-5 py-3 font-medium">ID</th>
                    <th className="text-left px-5 py-3 font-medium">Fecha / Hora</th>
                    <th className="text-left px-5 py-3 font-medium">Tipo</th>
                    <th className="text-left px-5 py-3 font-medium">Concepto</th>
                    <th className="text-right px-5 py-3 font-medium">Monto</th>
                    <th className="text-left px-5 py-3 font-medium">Autorizado por</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.map((m) => (
                    <tr key={m.id} className="border-b border-[#1e1e24]/50 hover:bg-[#0d0d0f]/50 transition-colors">
                      <td className="px-5 py-3 text-[#9a9aac] font-mono text-xs">{m.id}</td>
                      <td className="px-5 py-3 text-[#e1e1eb] whitespace-nowrap">{formatFecha(m.fechaHora)}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${m.tipoMovimiento === "INGRESO" ? "bg-[#22c55e]/10 text-[#22c55e]" : "bg-rose-500/10 text-rose-400"}`}>
                          {m.tipoMovimiento === "INGRESO" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {m.tipoMovimiento}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-[#b0b0c0]">{m.concepto}</td>
                      <td className={`px-5 py-3 text-right font-medium tabular-nums ${m.tipoMovimiento === "INGRESO" ? "text-[#22c55e]" : "text-rose-400"}`}>
                        {m.tipoMovimiento === "INGRESO" ? "+" : "-"}{format(m.monto)}
                      </td>
                      <td className="px-5 py-3 text-[#b0b0c0]">{m.autorizadoPor || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 px-5 py-4 border-t border-[#1e1e24]">
              <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 text-xs rounded border border-[#2a2a32] text-[#7a7a8c] hover:text-[#e1e1eb] disabled:opacity-30">
                Anterior
              </button>
              <span className="text-xs text-[#5a5a6e]">Pág. {page + 1} de {totalPages}</span>
              <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 text-xs rounded border border-[#2a2a32] text-[#7a7a8c] hover:text-[#e1e1eb] disabled:opacity-30">
                Siguiente
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
