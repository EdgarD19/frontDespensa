import { useState, useEffect, useMemo, useCallback } from "react";
import { Search, ClipboardList, Package, LayoutDashboard } from "lucide-react";
import { getProductos } from "../../../api/productosApi";
import { apiErrorMessage } from "../../../api/errors";
import {
  getHistorialAjustes,
  crearAjuste,
  autorizarAjuste,
  normalizeAjuste,
} from "../../../api/ajustesApi";
import {
  canGestionarAjustesInventario,
  canAutorizarAjustesInventario,
} from "../../../auth/inventoryAccess";
import { getEstadoStock } from "../utils";
import FormularioAjuste from "./FormularioAjuste";
import HistorialAjuste from "./HistorialAjuste";

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function stockEntero(producto) {
  const n = Number(producto?.stockActual ?? 0);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function StockBadge({ producto, stock }) {
  const est = getEstadoStock(producto);
  if (est === "sin") {
    return <span className="text-xs sm:text-sm font-semibold text-rose-400 whitespace-nowrap">Sin Stock</span>;
  }
  if (est === "bajo") {
    return (
      <span className="text-xs sm:text-sm font-semibold text-amber-400 tabular-nums whitespace-nowrap">
        {stock} (Bajo)
      </span>
    );
  }
  if (est === "desconocido") {
    return <span className="text-xs sm:text-sm text-[#5a5a6e] tabular-nums whitespace-nowrap">{stock}</span>;
  }
  return (
    <span className="text-xs sm:text-sm font-semibold text-[#22c55e] tabular-nums whitespace-nowrap">{stock}</span>
  );
}

function ConfirmarSolicitudModal({ open, onCancel, onConfirm, loading }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-ajuste-title"
        className="w-full max-w-md rounded-2xl border border-[#1e1e24] bg-[#111114] shadow-2xl p-6 space-y-4"
      >
        <h2 id="confirm-ajuste-title" className="text-base font-semibold text-[#f1f1f3]">
          Confirmar solicitud de ajuste
        </h2>
        <p className="text-sm text-[#9a9aac] leading-relaxed">
          El ajuste quedará en estado <strong className="text-amber-400">pendiente de autorización</strong>.
          El stock del producto se actualizará recién cuando un usuario con permisos lo{" "}
          <strong className="text-[#e1e1eb]">autorice</strong>. ¿Deseas continuar?
        </p>
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="rounded-lg border border-[#2a2a32] bg-[#0d0d0f] px-4 py-2 text-sm text-[#e1e1eb] hover:border-[#3a3a48] disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="rounded-lg bg-amber-500/90 hover:bg-amber-500 text-[#0d0d0f] text-sm font-semibold px-4 py-2 disabled:opacity-40"
          >
            {loading ? "Guardando…" : "Sí, solicitar ajuste"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AjusteInventario() {
  const puedeRegistrar = canGestionarAjustesInventario();
  const puedeAutorizar = canAutorizarAjustesInventario();

  const [productos, setProductos] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [search, setSearch] = useState("");

  const [formData, setFormData] = useState({
    tipoAjuste: "",
    fechaAjuste: todayISO(),
    nuevoStock: "",
    justificacion: "",
    detalleOtro: "",
    autorizadoPor: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [autorizandoId, setAutorizandoId] = useState(null);

  const diferencia =
    productoSeleccionado != null
      ? Number(formData.nuevoStock === "" ? NaN : formData.nuevoStock) -
        stockEntero(productoSeleccionado)
      : 0;

  const loadHistorial = useCallback(async () => {
    const res = await getHistorialAjustes({ pageSize: 50 });
    setHistorial(res.content || []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        setLoading(true);
        const res = await getProductos({ pageSize: 500 });
        if (!cancelled) setProductos(res.content || []);
      } catch (err) {
        if (!cancelled) {
          setError(apiErrorMessage(err) || "Error al cargar productos");
          setProductos([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    loadHistorial();
  }, [loadHistorial]);

  const productosFiltrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return productos;
    return productos.filter(
      (p) =>
        p.nombre?.toLowerCase().includes(q) ||
        (p.codigoBarras && String(p.codigoBarras).includes(search.trim()))
    );
  }, [productos, search]);

  const handleSelectProducto = (producto) => {
    setProductoSeleccionado(producto);
    setFormData((prev) => ({
      ...prev,
      nuevoStock: String(stockEntero(producto)),
    }));
    setError(null);
  };

  const handleClear = () => {
    setFormData({
      tipoAjuste: "",
      fechaAjuste: todayISO(),
      nuevoStock: "",
      justificacion: "",
      detalleOtro: "",
      autorizadoPor: "",
    });
    setProductoSeleccionado(null);
    setError(null);
  };

  function validarAntesDeConfirmar() {
    if (!puedeRegistrar) {
      setError("No tenés permisos para solicitar ajustes de inventario.");
      return false;
    }
    if (!productoSeleccionado) {
      setError("Seleccioná un producto.");
      return false;
    }
    if (!formData.tipoAjuste) {
      setError("Seleccioná un tipo de ajuste.");
      return false;
    }
    if (!formData.fechaAjuste) {
      setError("Indicá la fecha de ajuste.");
      return false;
    }
    if (formData.tipoAjuste === "OTRO" && !formData.detalleOtro.trim()) {
      setError('Completá el detalle para el tipo "Otro".');
      return false;
    }
    const n = Number(formData.nuevoStock);
    if (formData.nuevoStock === "" || !Number.isInteger(n) || n < 0) {
      setError("El nuevo stock debe ser un número entero mayor o igual a 0.");
      return false;
    }
    if (!formData.justificacion.trim()) {
      setError("La justificación es obligatoria.");
      return false;
    }
    if (!formData.autorizadoPor.trim()) {
      setError('Completá el campo "Autorizado por".');
      return false;
    }
    return true;
  }

  const handleSolicitarClick = () => {
    setError(null);
    if (!validarAntesDeConfirmar()) return;
    setConfirmOpen(true);
  };

  const ejecutarCreacion = async () => {
    if (!productoSeleccionado) return;
    try {
      setSubmitting(true);
      setError(null);
      const n = Number(formData.nuevoStock);
      const stockAnt = stockEntero(productoSeleccionado);

      const payload = {
        idProducto: productoSeleccionado.id,
        nombreProducto: productoSeleccionado.nombre,
        tipoAjuste: formData.tipoAjuste,
        fechaAjuste: formData.fechaAjuste,
        stockAnterior: stockAnt,
        nuevoStock: n,
        justificacion: formData.justificacion.trim(),
        detalleOtro:
          formData.tipoAjuste === "OTRO" ? formData.detalleOtro.trim() : undefined,
        autorizadoPor: formData.autorizadoPor.trim(),
      };

      const ajuste = await crearAjuste(payload);
      const row = ajuste ?? normalizeAjuste(payload);

      if (row?.estado === "AUTORIZADO") {
        setProductos((prev) =>
          prev.map((p) =>
            p.id === productoSeleccionado.id ? { ...p, stockActual: n } : p
          )
        );
      }

      await loadHistorial();
      handleClear();
      setConfirmOpen(false);
    } catch (err) {
      setError(apiErrorMessage(err) || "Error al registrar el ajuste");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutorizar = async (row) => {
    if (!puedeAutorizar || row?.id == null) return;
    const ok = window.confirm(
      "Al autorizar, el stock del producto se actualizará de inmediato. ¿Confirmar autorización?"
    );
    if (!ok) return;
    try {
      setAutorizandoId(row.id);
      setError(null);
      const actualizado = await autorizarAjuste(row.id);
      const nuevo = actualizado?.nuevoStock ?? row.nuevoStock;
      const idProd = actualizado?.idProducto ?? row.idProducto;

      if (idProd != null && nuevo != null) {
        setProductos((prev) =>
          prev.map((p) =>
            p.id === idProd ? { ...p, stockActual: Number(nuevo) } : p
          )
        );
      }

      await loadHistorial();
    } catch (err) {
      setError(
        apiErrorMessage(err) ||
          "No se pudo autorizar. Verificá que el endpoint PATCH /api/inventario/ajustes/{id}/autorizar exista en el backend."
      );
    } finally {
      setAutorizandoId(null);
    }
  };

  if (!puedeRegistrar && !puedeAutorizar) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center space-y-3">
        <ClipboardList className="w-10 h-10 text-[#5a5a6e] mx-auto" aria-hidden />
        <h1 className="text-lg font-semibold text-[#e1e1eb]">Ajuste de inventario</h1>
        <p className="text-sm text-[#7a7a8c]">
          No tenés permisos para acceder a los ajustes de inventario. Solo usuarios con rol{" "}
          <span className="text-[#9a9aac]">ADMIN</span> o{" "}
          <span className="text-[#9a9aac]">ENCARGADO_INVENTARIO</span> pueden utilizar este módulo
          (configurá <code className="text-xs text-amber-400/90">VITE_USER_ROLES</code> cuando
          exista autenticación).
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <div className="rounded-2xl border border-[#1e1e24] bg-[#111114] overflow-hidden">
        <header className="bg-[#0d0d0f] border-b border-[#1e1e24] px-4 sm:px-6 py-4 flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20"
            aria-hidden
          >
            <LayoutDashboard className="w-5 h-5 text-[#22c55e]" />
          </div>
          <h1 className="text-lg sm:text-xl font-semibold text-[#f1f1f3] tracking-tight truncate min-w-0">
            Ajuste de Inventario
          </h1>
        </header>

        <div className="p-4 sm:p-6 space-y-6">
          {error ? (
            <div
              role="alert"
              className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
            >
              {error}
            </div>
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div className="rounded-xl border border-[#1e1e24] bg-[#111114] overflow-hidden">
              <div className="px-5 pt-5 pb-3 border-b border-[#1e1e24]">
                <h2 className="text-base font-semibold text-[#e1e1eb] flex items-center gap-2">
                  <Package className="w-5 h-5 text-[#22c55e] shrink-0" aria-hidden />
                  Selección de Productos
                </h2>
              </div>
              <div className="p-5 pt-4 space-y-4">
                <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 text-xs sm:text-sm text-amber-200/90 leading-snug">
                  Los ajustes de inventario requieren justificación y son registrados en el historial.
                </div>

                <label className="block space-y-1">
                  <span className="sr-only">Buscar producto</span>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a5a6e]" />
                    <input
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      disabled={loading}
                      placeholder="Buscar por nombre o código de barras…"
                      className="w-full rounded-lg border border-[#2a2a32] bg-[#0d0d0f] pl-10 pr-3 py-2.5 text-sm text-[#f1f1f3] placeholder:text-[#4a4a5a] focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/20 outline-none disabled:opacity-50"
                    />
                  </div>
                </label>

                <div className="rounded-lg border border-[#1e1e24] overflow-hidden max-h-[min(24rem,50vh)] overflow-y-auto bg-[#0d0d0f]">
                  {loading ? (
                    <p className="p-4 text-sm text-[#5a5a6e]">Cargando productos…</p>
                  ) : productosFiltrados.length === 0 ? (
                    <p className="p-4 text-sm text-[#5a5a6e]">No hay coincidencias.</p>
                  ) : (
                    <ul className="divide-y divide-[#1e1e24]">
                      {productosFiltrados.map((p) => {
                        const sel = productoSeleccionado?.id === p.id;
                        const st = stockEntero(p);
                        const sub = [p.codigoBarras ? String(p.codigoBarras) : null, p.categoria]
                          .filter(Boolean)
                          .join(" • ");
                        return (
                          <li key={p.id}>
                            <button
                              type="button"
                              onClick={() => handleSelectProducto(p)}
                              className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${
                                sel
                                  ? "bg-[#22c55e]/10 border-l-[3px] border-l-[#22c55e]"
                                  : "border-l-[3px] border-l-transparent hover:bg-[#15151a]"
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                <span className="font-semibold text-[#f1f1f3] block truncate">
                                  {p.nombre}
                                </span>
                                {sub ? (
                                  <span className="text-xs text-[#5a5a6e] block truncate mt-0.5">
                                    {sub}
                                  </span>
                                ) : null}
                              </div>
                              <StockBadge producto={p} stock={st} />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {puedeRegistrar ? (
                productoSeleccionado ? (
                  <FormularioAjuste
                    producto={productoSeleccionado}
                    formData={formData}
                    setFormData={setFormData}
                    diferencia={Number.isFinite(diferencia) ? diferencia : 0}
                    disabled={loading}
                    submitting={submitting}
                    onSolicitar={handleSolicitarClick}
                    onLimpiar={handleClear}
                  />
                ) : (
                  <div className="rounded-xl border border-dashed border-[#2a2a32] bg-[#111114] min-h-[20rem] flex flex-col items-center justify-center text-center px-6 py-10">
                    <Package className="w-10 h-10 text-[#3a3a4a] mb-3" aria-hidden />
                    <p className="text-sm text-[#9a9aac] font-medium">Seleccioná un producto</p>
                    <p className="text-xs text-[#5a5a6e] mt-1 max-w-xs">
                      Elegí un ítem de la lista de la izquierda para ver el formulario de ajuste de
                      stock.
                    </p>
                  </div>
                )
              ) : (
                <div className="rounded-xl border border-[#1e1e24] bg-[#111114] p-6 text-sm text-[#7a7a8c]">
                  No podés crear solicitudes de ajuste con tu rol actual. Podés revisar el historial
                  y autorizar si corresponde.
                </div>
              )}
            </div>
          </div>

          <HistorialAjuste
            items={historial}
            autorizandoId={autorizandoId}
            onAutorizar={handleAutorizar}
            canAutorizar={puedeAutorizar}
          />
        </div>
      </div>

      <ConfirmarSolicitudModal
        open={confirmOpen}
        loading={submitting}
        onCancel={() => (submitting ? null : setConfirmOpen(false))}
        onConfirm={ejecutarCreacion}
      />
    </div>
  );
}
