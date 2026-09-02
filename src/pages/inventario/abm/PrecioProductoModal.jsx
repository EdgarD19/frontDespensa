import { useEffect, useState } from "react";
import { X, Save, History, Search, Clock } from "lucide-react";
import { getHistorialPrecios, updateProductoPrecio, cancelarProgramacionPrecio } from "../../../api/productosApi";
import { apiErrorMessage } from "../../../api/errors";

const inputClass =
  "w-full rounded-lg border border-[#2a2a32] bg-[#0d0d0f] px-3 py-2 text-sm text-[#f1f1f3] placeholder:text-[#4a4a5a] focus:border-[#22c55e]/50 outline-none transition-colors";

function formatMoney(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return `₲${v.toLocaleString("es-PY")}`;
}

export default function PrecioProductoModal({ producto, onClose, onPrecioActualizado }) {
  const [nuevoPrecio, setNuevoPrecio] = useState("");
  const [fechaVigencia, setFechaVigencia] = useState("");
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [filtroFecha, setFiltroFecha] = useState("");

  const [productoActual, setProductoActual] = useState(producto);

  useEffect(() => {
    setProductoActual(producto);
  }, [producto]);

  useEffect(() => {
    if (!producto?.id) return;
    setNuevoPrecio(producto.precio ?? producto.precioVenta ?? "");
    setFechaVigencia("");
    cargarHistorial();
  }, [producto?.id]);

  async function cargarHistorial() {
    if (!producto?.id) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await getHistorialPrecios(producto.id);
      setHistorial(rows);
    } catch (err) {
      setHistorial([]);
      setError(apiErrorMessage(err) || "No se pudo cargar el historial de precios.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelarProgramacion() {
    if (!productoActual?.id) return;
    setGuardando(true);
    setError(null);
    try {
      const updated = await cancelarProgramacionPrecio(productoActual.id);
      setProductoActual(updated);
      setAviso("Programación de precio cancelada.");
      await cargarHistorial();
      onPrecioActualizado?.(updated);
    } catch (err) {
      setError(apiErrorMessage(err) || "No se pudo cancelar la programación.");
    } finally {
      setGuardando(false);
    }
  }

  async function handleGuardar(e) {
    e.preventDefault();
    if (!productoActual?.id) return;
    const precio = parseFloat(String(nuevoPrecio).replace(",", "."));
    if (!Number.isFinite(precio) || precio <= 0) {
      setError("El precio de venta debe ser mayor que 0.");
      return;
    }
    let vigencia = null;
    if (fechaVigencia) {
      vigencia = new Date(fechaVigencia);
      if (Number.isNaN(vigencia.getTime())) {
        setError("La fecha de vigencia no es válida.");
        return;
      }
      if (vigencia.getTime() <= Date.now()) {
        setError("La fecha de vigencia debe ser futura (dejala vacía para aplicar el cambio ahora).");
        return;
      }
      // Formato ISO local sin zona: YYYY-MM-DDTHH:mm:ss
      const pad = (n) => String(n).padStart(2, "0");
      vigencia = `${vigencia.getFullYear()}-${pad(vigencia.getMonth() + 1)}-${pad(vigencia.getDate())}T${pad(vigencia.getHours())}:${pad(vigencia.getMinutes())}:${pad(vigencia.getSeconds())}`;
    }
    setGuardando(true);
    setError(null);
    setAviso(null);
    try {
      const updated = await updateProductoPrecio(productoActual.id, precio, vigencia);
      setProductoActual(updated);
      onPrecioActualizado?.(updated);
      await cargarHistorial();
      setNuevoPrecio(String(precio));
      setFechaVigencia("");
      if (updated?.fechaVigencia) {
        setAviso(`Cambio programado: el precio pasará a ₲${precio.toLocaleString("es-PY")} el ${String(updated.fechaVigencia).replace("T", " ").slice(0, 16)}.`);
      } else {
        setAviso(`Precio actualizado a ₲${precio.toLocaleString("es-PY")}.`);
      }
    } catch (err) {
      setError(apiErrorMessage(err) || "No se pudo actualizar el precio.");
    } finally {
      setGuardando(false);
    }
  }

  const historialFiltrado = filtroFecha
    ? historial.filter((h) => String(h.fecha || "").startsWith(filtroFecha))
    : historial;

  if (!producto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#111114] border border-[#1e1e24] rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#1e1e24] shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <History className="w-4 h-4 text-[#22c55e] shrink-0" />
            <h2 className="text-sm font-semibold text-[#f1f1f3] truncate">
              Precio de venta — {producto.nombre}
            </h2>
          </div>
          <button type="button" onClick={onClose}
            className="p-1 rounded text-[#5a5a6e] hover:text-[#e1e1eb] hover:bg-[#1a1f2e] transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          {aviso && (
            <div className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
              {aviso}
            </div>
          )}
          {productoActual?.fechaVigencia && productoActual?.precioFuturo && (
            <div className="text-xs text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                Precio a futuro pendiente: ₲{Number(productoActual.precioFuturo).toLocaleString("es-PY")} desde{" "}
                {String(productoActual.fechaVigencia).replace("T", " ").slice(0, 16)}
              </span>
              <button type="button" onClick={handleCancelarProgramacion} disabled={guardando}
                className="shrink-0 rounded-md border border-amber-500/40 px-2 py-1 font-semibold text-amber-200 hover:bg-amber-500/20 disabled:opacity-40 transition-colors">
                Cancelar
              </button>
            </div>
          )}

          {/* Actualizar precio */}
          <form onSubmit={handleGuardar} className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#5a5a6e]">Actualizar precio de venta</p>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
              <label className="block space-y-1">
                <span className="text-xs text-[#7a7a8c]">Nuevo precio de venta</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={nuevoPrecio}
                  onChange={(e) => setNuevoPrecio(e.target.value)}
                  placeholder="0"
                  className={`${inputClass} tabular-nums`}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-[#7a7a8c]">Aplicar a futuro (opcional)</span>
                <input
                  type="datetime-local"
                  value={fechaVigencia}
                  onChange={(e) => setFechaVigencia(e.target.value)}
                  className={`${inputClass} [color-scheme:dark]`}
                />
              </label>
              <div className="flex items-end">
                <button type="submit" disabled={guardando}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[#22c55e] px-4 py-2 text-sm font-semibold text-[#0d0d0f] hover:bg-[#16a34a] disabled:opacity-40 transition-colors">
                  <Save className="w-4 h-4" />
                  {guardando ? "Guardando..." : fechaVigencia ? "Programar" : "Guardar"}
                </button>
              </div>
            </div>
          </form>

          <hr className="border-t border-[#1e1e24]" />

          {/* Historial */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#5a5a6e]">
                Historial de precios
              </p>
              <label className="flex items-center gap-2">
                <Search className="w-4 h-4 text-[#3a3a4a]" />
                <input
                  type="date"
                  value={filtroFecha}
                  onChange={(e) => setFiltroFecha(e.target.value)}
                  className="rounded-lg border border-[#2a2a32] bg-[#0d0d0f] px-2 py-1 text-xs text-[#f1f1f3] focus:border-[#22c55e]/50 outline-none transition-colors"
                />
              </label>
            </div>

            <div className="rounded-lg border border-[#1e1e24] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1e1e24] text-white/40 text-left">
                    <th className="px-4 py-2 font-medium text-xs">Fecha</th>
                    <th className="px-4 py-2 font-medium text-xs">Hora</th>
                    <th className="px-4 py-2 font-medium text-xs">Estado</th>
                    <th className="px-4 py-2 font-medium text-xs">Anterior</th>
                    <th className="px-4 py-2 font-medium text-xs text-right">Precio venta</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-[#5a5a6e] text-sm">Cargando historial...</td>
                    </tr>
                  ) : historialFiltrado.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-[#5a5a6e] text-sm">
                        Sin registros de precio{historial.length === 0 ? " aún" : ""} para la fecha seleccionada.
                      </td>
                    </tr>
                  ) : (
                    historialFiltrado.map((h) => {
                      const esProgramado = h.estado === "PROGRAMADO";
                      const esVigente = h.estado === "VIGENTE";
                      const variacion = Number(h.variacionPorcentaje);
                      return (
                        <tr key={h.id} className={`border-b border-[#1e1e24] last:border-0 hover:bg-[#151a24] transition-colors ${esProgramado ? "bg-amber-500/5" : ""}`}>
                          <td className="px-4 py-2 text-[#e1e1eb]">{h.fecha || "—"}</td>
                          <td className="px-4 py-2 text-[#9a9aac]">{h.hora || "—"}</td>
                          <td className="px-4 py-2">
                            {esProgramado ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                                <Clock className="w-3 h-3" /> Programado
                              </span>
                            ) : esVigente ? (
                              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                                Vigente
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-[#5a5a6e]">Histórico</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-[#9a9aac] tabular-nums">
                            {h.precioVentaAnterior != null ? formatMoney(h.precioVentaAnterior) : "—"}
                            {Number.isFinite(variacion) && h.precioVentaAnterior != null && variacion !== 0 && (
                              <span className={`ml-1 text-[10px] ${variacion > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                ({variacion > 0 ? "+" : ""}{variacion}%)
                              </span>
                            )}
                          </td>
                          <td className={`px-4 py-2 text-right font-semibold tabular-nums ${esProgramado ? "text-amber-200" : "text-[#22c55e]"}`}>
                            {formatMoney(h.precioVenta)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-3 border-t border-[#1e1e24] shrink-0">
          <button type="button" onClick={onClose}
            className="rounded-lg border border-[#2a2a32] bg-[#0d0d0f] px-4 py-2 text-sm text-[#9a9aac] hover:text-[#e1e1eb] transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}