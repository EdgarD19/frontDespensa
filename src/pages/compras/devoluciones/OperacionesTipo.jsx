import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  Plus, X, Save, Search, FileText, AlertTriangle, CheckCircle, ArrowLeft,
  ArrowLeftRight, Ban, ChevronLeft, ChevronRight, PackageCheck, XCircle, FilePlus2,
} from "lucide-react";
import { getFacturasCompra, getFacturaCompraById } from "../../../api/facturasCompraApi";
import {
  getIntercambios,
  crearIntercambio,
  marcarIntercambioRecibido,
  cerrarIntercambio,
  cancelarIntercambio,
  getAnulaciones,
  anularFactura,
} from "../../../api/operacionesCompraApi";
import { apiErrorMessage } from "../../../api/errors";
import { getOperaciones, addOperacion, updateOperacion } from "./operacionesStore";
import { formatoFactura, S } from "../utils";

function fmtMoneda(n) {
  return new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", minimumFractionDigits: 0 }).format(n ?? 0);
}

function fmtFecha(valor) {
  if (!valor) return "—";
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? String(valor) : d.toLocaleDateString("es-PY");
}

function fmtFechaHora(valor) {
  if (!valor) return "—";
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? String(valor) : d.toLocaleString("es-PY", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const CONFIG = {
  DEVOLUCION: {
    label: "Devolución",
    plural: "Devoluciones",
    accion: "devolución",
    empty: "Aún no hay devoluciones registradas",
  },
  INTERCAMBIO: {
    label: "Intercambio",
    plural: "Intercambios",
    accion: "intercambio",
    empty: "Aún no hay intercambios registrados",
  },
  ANULACION: {
    label: "Anulación",
    plural: "Anulaciones",
    accion: "anulación",
    empty: "Aún no hay anulaciones registradas",
  },
};

const STEPS = ["Factura", "Detalle"];

function EstadoBadge({ estado }) {
  const map = {
    PENDIENTE: "bg-yellow-500/10 text-yellow-400",
    RECIBIDO: "bg-green-500/10 text-green-400",
    PROCESADA: "bg-green-500/10 text-green-400",
    ANULADA: "bg-red-500/10 text-red-400",
    CERRADO: "bg-sky-500/10 text-sky-400",
    CANCELADO: "bg-zinc-500/10 text-zinc-400",
    CANCELADA: "bg-zinc-500/10 text-zinc-400",
    RECHAZADA: "bg-red-500/10 text-red-400",
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full ${map[estado] || "bg-white/10 text-white/70"}`}>{estado || "—"}</span>;
}

// Convierte una OrdenIntercambioResponse (backend) a la forma interna de la tabla.
function formatearIntercambio(o) {
  const detalles = o.detalles || [];
  return {
    id: `ic-${o.idOrdenIntercambio}`,
    tipo: "INTERCAMBIO",
    estado: o.estado,
    fecha: o.fechaCreacion,
    fechaRecepcion: o.fechaRecepcion,
    fechaCierre: o.fechaCierre,
    facturaNumero: o.numeroOrden,
    proveedor: o.proveedorNombre,
    proveedorId: o.idProveedor,
    motivo: o.motivo,
    observaciones: o.observaciones,
    total: detalles.reduce((sum, d) => sum + (Number(d.subtotal) || Number(d.cantidad) * Number(d.precioUnitario) || 0), 0),
    items: detalles.map((d) => ({
      idProducto: d.idProducto,
      producto: d.productoNombre,
      cantidad: d.cantidad,
      precioUnitario: d.precioUnitario,
      motivoIntercambio: d.motivoIntercambio,
    })),
    idOrdenIntercambio: o.idOrdenIntercambio,
  };
}

// Convierte una AnulacionFacturaResponse (backend) a la forma interna de la tabla.
function formatearAnulacion(a) {
  return {
    id: `an-${a.idAnulacion}`,
    tipo: "ANULACION",
    estado: "ANULADA",
    fecha: a.fechaAnulacion,
    facturaNumero: a.numeroFactura,
    proveedor: a.proveedorNombre,
    proveedorId: a.idProveedor,
    idFactura: a.idFactura,
    motivo: a.motivo,
    total: null,
  };
}

export default function OperacionesTipo({ tipo }) {
  const cfg = CONFIG[tipo];
  const [operaciones, setOperaciones] = useState([]);
  const [cargandoOperaciones, setCargandoOperaciones] = useState(false);
  const [facturas, setFacturas] = useState([]);
  const [loadingFacturas, setLoadingFacturas] = useState(false);
  const [error, setError] = useState(null);
  const [errorOperacion, setErrorOperacion] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalConfirmacion, setModalConfirmacion] = useState(null);
  const [modalFacturaNueva, setModalFacturaNueva] = useState(null);

  const cargarFacturas = useCallback(async () => {
    setLoadingFacturas(true);
    setError(null);
    try {
      const res = await getFacturasCompra({ page: 0, pageSize: 1000 });
      setFacturas(Array.isArray(res.content) ? res.content : []);
    } catch (err) {
      console.error("Error al cargar facturas:", err);
      setError("No se pudieron cargar las facturas.");
    } finally {
      setLoadingFacturas(false);
    }
  }, []);

  useEffect(() => {
    cargarFacturas();
  }, [cargarFacturas]);

  const cargarOperaciones = useCallback(async () => {
    setCargandoOperaciones(true);
    setErrorOperacion(null);
    try {
      if (tipo === "DEVOLUCION") {
        const lista = [...getOperaciones()]
          .filter((o) => o.tipo === tipo)
          .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        setOperaciones(lista);
      } else if (tipo === "INTERCAMBIO") {
        const res = await getIntercambios({ page: 0, pageSize: 1000 });
        setOperaciones(Array.isArray(res.content) ? res.content.map(formatearIntercambio) : []);
      } else {
        const res = await getAnulaciones({ page: 0, pageSize: 1000 });
        setOperaciones(Array.isArray(res.content) ? res.content.map(formatearAnulacion) : []);
      }
    } catch (err) {
      console.error("Error al cargar operaciones:", err);
      setErrorOperacion("No se pudieron cargar las operaciones.");
    } finally {
      setCargandoOperaciones(false);
    }
  }, [tipo]);

  useEffect(() => {
    cargarOperaciones();
  }, [cargarOperaciones]);

  // Total de la factura original (para mostrar en anulaciones, ya que el backend no lo incluye).
  const totalFacturaById = useMemo(() => {
    const m = {};
    facturas.forEach((f) => { m[f.idFactura] = f.totalGeneral; });
    return m;
  }, [facturas]);

  const handleRegistrar = async (op) => {
    setErrorOperacion(null);
    setAviso(null);
    try {
      if (op.tipo === "INTERCAMBIO") {
        const creada = await crearIntercambio({
          idProveedor: op.proveedorId,
          motivo: op.motivo || "",
          observaciones: op.observaciones || "",
          detalles: (op.items || []).map((it) => ({
            idProducto: it.idProducto,
            cantidad: it.cantidad,
            motivoIntercambio: it.motivoIntercambio || "",
          })),
        });
        setAviso(`Intercambio ${creada.numeroOrden || ""} registrado.`);
      } else if (op.tipo === "ANULACION") {
        const anulada = await anularFactura({ idFactura: op.idFactura, motivo: op.motivo || "" });
        setAviso(`Factura ${anulada.numeroFactura || ""} anulada.`);
      } else {
        addOperacion(op);
        setAviso("Devolución registrada. La factura original queda EN PROCESO.");
      }
      setShowModal(false);
      cargarOperaciones();
    } catch (err) {
      console.error("Error al registrar operación:", err);
      setErrorOperacion(apiErrorMessage(err));
    }
  };

  const handleRegistrarFacturaNueva = (op, numeroNueva) => {
    const numero = String(numeroNueva).trim();
    if (!numero) return;
    updateOperacion(op.id, {
      estado: "PROCESADA",
      facturaNumero: numero,
      facturaNueva: numero,
      estadoFactura: "ANULADA",
      fechaNuevaFactura: new Date().toISOString(),
    });
    setAviso("Factura nueva registrada. La factura original quedó ANULADA.");
    setModalFacturaNueva(null);
    cargarOperaciones();
  };

  const handleConfirmarRecepcion = async (op) => {
    setErrorOperacion(null);
    try {
      await marcarIntercambioRecibido(op.idOrdenIntercambio);
      setAviso("Recepción confirmada.");
      cargarOperaciones();
    } catch (err) {
      console.error("Error al confirmar recepción:", err);
      setErrorOperacion(apiErrorMessage(err));
    }
  };

  const handleCerrarIntercambio = async (op) => {
    setErrorOperacion(null);
    try {
      await cerrarIntercambio(op.idOrdenIntercambio);
      setAviso("Intercambio cerrado. El stock fue repuesto.");
      cargarOperaciones();
    } catch (err) {
      console.error("Error al cerrar intercambio:", err);
      setErrorOperacion(apiErrorMessage(err));
    }
  };

  const handleCancelarIntercambio = async (op) => {
    setErrorOperacion(null);
    try {
      await cancelarIntercambio(op.idOrdenIntercambio);
      setAviso("Intercambio cancelado.");
      cargarOperaciones();
    } catch (err) {
      console.error("Error al cancelar intercambio:", err);
      setErrorOperacion(apiErrorMessage(err));
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/compras/devoluciones-intercambios" className="p-2 rounded-lg hover:bg-white/10 text-white/50 transition-colors" aria-label="Volver">
          <ArrowLeft size={18} />
        </Link>
        <div className="space-y-1 flex-1">
          <h1 className="text-2xl font-semibold text-[#f1f1f3] tracking-tight">{cfg.plural}</h1>
        </div>
        <button
          onClick={() => { setErrorOperacion(null); setAviso(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#22c55e] text-black text-sm font-medium rounded-lg hover:bg-green-400 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Registrar {cfg.label.toLowerCase()}
        </button>
      </div>

      {error && (
        <div className="px-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg py-3 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" /> {error}
        </div>
      )}
      {errorOperacion && (
        <div className="px-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg py-3 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" /> {errorOperacion}
        </div>
      )}
      {aviso && (
        <div className="px-4 bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg py-3 flex items-center gap-2">
          <CheckCircle className="w-5 h-5" /> {aviso}
        </div>
      )}

      <div className="bg-[var(--bg-card)] border border-white/5 rounded-xl overflow-hidden">
        {cargandoOperaciones && operaciones.length === 0 ? (
          <div className="p-10 text-center">
            <div className="animate-pulse bg-white/10 rounded h-4 w-1/3 mx-auto mb-2" />
            <div className="animate-pulse bg-white/10 rounded h-4 w-1/4 mx-auto" />
          </div>
        ) : operaciones.length === 0 && !errorOperacion ? (
          <div className="p-10 text-center space-y-3">
            <FileText className="w-12 h-12 mx-auto text-white/20" />
            <p className="text-white/40 text-sm">{cfg.empty}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/40 text-left">
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">{tipo === "INTERCAMBIO" ? "N° Orden" : "N° Factura"}</th>
                  {tipo === "DEVOLUCION" && <th className="px-4 py-3 font-medium">Factura anulada</th>}
                  <th className="px-4 py-3 font-medium">Proveedor</th>
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                  {tipo !== "ANULACION" && <th className="px-4 py-3 font-medium w-16">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {operaciones.map((op) => {
                  const totalAnulacion = tipo === "ANULACION" ? totalFacturaById[op.idFactura] ?? null : null;
                  return (
                    <tr key={op.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 text-white/70 whitespace-nowrap">{fmtFechaHora(op.fecha)}</td>
                      <td className="px-4 py-3"><EstadoBadge estado={op.estado} /></td>
                      <td className="px-4 py-3 text-white font-mono">{op.facturaNueva || op.facturaNumero}</td>
                      {tipo === "DEVOLUCION" && (
                        <td className="px-4 py-3 text-white/50 font-mono">{op.facturaNueva ? op.facturaOriginal : "—"}</td>
                      )}
                      <td className="px-4 py-3 text-white/70">{op.proveedor}</td>
                      <td className="px-4 py-3 text-right text-white font-mono">
                        {tipo === "ANULACION" ? (totalAnulacion != null ? fmtMoneda(totalAnulacion) : "—") : fmtMoneda(op.total)}
                      </td>
                      {tipo !== "ANULACION" && (
                        <td className="px-4 py-3 text-center">
                          {op.tipo === "INTERCAMBIO" && op.estado === "PENDIENTE" ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setModalConfirmacion({ tipo: "recepcion", op })}
                                title="Confirmar recepción del reemplazo"
                                aria-label="Confirmar recepción"
                                className="p-1.5 text-white/40 hover:text-[#22c55e] transition-colors"
                              >
                                <PackageCheck className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setModalConfirmacion({ tipo: "cancelacion", op })}
                                title="Cancelar intercambio"
                                aria-label="Cancelar intercambio"
                                className="p-1.5 text-white/40 hover:text-red-400 transition-colors"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </div>
                          ) : op.tipo === "INTERCAMBIO" && op.estado === "RECIBIDO" ? (
                            <button
                              onClick={() => setModalConfirmacion({ tipo: "cierre", op })}
                              title="Cerrar intercambio (el proveedor trajo el reemplazo)"
                              aria-label="Cerrar intercambio"
                              className="p-1.5 text-white/40 hover:text-[#22c55e] transition-colors"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          ) : op.tipo === "DEVOLUCION" && op.estado === "PENDIENTE" ? (
                            <button
                              onClick={() => setModalFacturaNueva(op)}
                              title="Registrar factura nueva (reemplazo)"
                              aria-label="Registrar factura nueva"
                              className="p-1.5 text-white/40 hover:text-[#22c55e] transition-colors"
                            >
                              <FilePlus2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="text-white/20 text-xs">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <NuevaOperacionModal
          tipo={tipo}
          facturas={facturas}
          loadingFacturas={loadingFacturas}
          onCerrar={() => setShowModal(false)}
          onRegistrar={handleRegistrar}
        />
      )}

      {modalFacturaNueva && (
        <RegistrarFacturaNuevaModal
          op={modalFacturaNueva}
          facturas={facturas}
          onCerrar={() => setModalFacturaNueva(null)}
          onConfirmar={handleRegistrarFacturaNueva}
        />
      )}

      {modalConfirmacion && (
        <ConfirmarAccionModal
          tipo={modalConfirmacion.tipo}
          op={modalConfirmacion.op}
          onCerrar={() => setModalConfirmacion(null)}
          onConfirmar={(sig) => {
            if (modalConfirmacion.tipo === "recepcion") {
              handleConfirmarRecepcion(sig);
            } else if (modalConfirmacion.tipo === "cierre") {
              handleCerrarIntercambio(sig);
            } else {
              handleCancelarIntercambio(sig);
            }
            setModalConfirmacion(null);
          }}
        />
      )}
    </div>
  );
}

function RegistrarFacturaNuevaModal({ op, facturas, onCerrar, onConfirmar }) {
  const [numeroNueva, setNumeroNueva] = useState("");
  const [tocado, setTocado] = useState(false);

  const formatoValido = /^\d{3}-\d{3}-\d{7}$/.test(numeroNueva);
  const yaExiste = useMemo(() => (
    facturas.some((f) => String(f.numeroFactura) === String(numeroNueva.trim()))
  ), [facturas, numeroNueva]);
  const errorMsg = tocado && numeroNueva
    ? (!formatoValido
        ? "El número de factura debe tener el formato 000-000-0000000"
        : yaExiste
          ? `El número de factura ${numeroNueva.trim()} ya está registrado.`
          : null)
    : null;
  const puedeGuardar = formatoValido && !yaExiste;

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onCerrar(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCerrar]);

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Registrar factura nueva"
        className="bg-[#1a1a20] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <FilePlus2 className="w-5 h-5 text-[#22c55e]" />
              Registrar Factura Nueva
            </h2>
          </div>
          <button onClick={onCerrar} className="p-1 text-white/40 hover:text-white transition-colors" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          <div className="bg-white/3 border border-white/5 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 text-red-400"><FileText className="w-4 h-4" /> Factura original</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs text-white/40">N° Factura</p>
                <p className="text-white font-mono">{op.facturaOriginal || op.facturaNumero}</p>
              </div>
              <div>
                <p className="text-xs text-white/40">Proveedor</p>
                <p className="text-white">{op.proveedor}</p>
              </div>
              <div>
                <p className="text-xs text-white/40">Total</p>
                <p className="text-white font-mono">{fmtMoneda(op.total)}</p>
              </div>
            </div>
            {op.items?.length > 0 && (
              <div className="max-h-40 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-white/10 text-white/40 text-left"><th className="px-3 py-2 font-medium">Producto</th><th className="px-3 py-2 font-medium text-center">Cantidad</th></tr></thead>
                  <tbody>
                    {op.items.map((it, i) => (
                      <tr key={i} className="border-b border-white/5">
                        <td className="px-3 py-2 text-white/80">{it.producto}</td>
                        <td className="px-3 py-2 text-center text-white/70 font-mono">{it.cantidad}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="numero-factura-nueva" className={S.eyebrow}>N° factura nueva *</label>
            <input
              id="numero-factura-nueva"
              type="text"
              value={numeroNueva}
              onChange={(e) => { setNumeroNueva(formatoFactura(e.target.value)); setTocado(false); }}
              onBlur={() => setTocado(true)}
              placeholder="XXX-XXX-XXXXXXX"
              maxLength={15}
              autoFocus
              className={`${S.fieldMono} mt-1 ${errorMsg ? "border-red-500/50" : ""}`}
            />
            {errorMsg && <p className="mt-1 text-xs text-red-400">{errorMsg}</p>}
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/5">
          <button
            type="button"
            onClick={onCerrar}
            className="px-4 py-2.5 bg-white/5 border border-white/10 text-white/70 rounded-lg hover:bg-white/10 transition-colors text-sm"
          >
            Volver
          </button>
          <button
            type="button"
            onClick={() => onConfirmar(op, numeroNueva)}
            disabled={!puedeGuardar}
            className="px-4 py-2.5 bg-[#22c55e] hover:bg-green-400 text-black font-medium rounded-lg transition-colors text-sm disabled:opacity-40 disabled:pointer-events-none flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> Registrar factura nueva
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function ConfirmarAccionModal({ tipo, op, onCerrar, onConfirmar }) {
  const esRecepcion = tipo === "recepcion";
  const esCierre = tipo === "cierre";

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onCerrar(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCerrar]);

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onCerrar}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={esRecepcion ? "Confirmar recepción" : esCierre ? "Cerrar intercambio" : "Cancelar intercambio"}
        className="bg-[#1a1a20] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            {esRecepcion ? (
              <PackageCheck className="w-4 h-4 text-[#22c55e]" />
            ) : esCierre ? (
              <CheckCircle className="w-4 h-4 text-[#22c55e]" />
            ) : (
              <XCircle className="w-4 h-4 text-red-400" />
            )}
            {esRecepcion ? "Confirmar recepción" : esCierre ? "Cerrar intercambio" : "Cancelar intercambio"}
          </h2>
          <button onClick={onCerrar} className="p-1 text-white/40 hover:text-white transition-colors" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="text-sm text-white/70 leading-relaxed">
            {esRecepcion ? (
              <>Se confirmará la recepción del reemplazo de la orden <span className="font-mono">{op.facturaNumero}</span>.</>
            ) : esCierre ? (
              <>Se cerrará el intercambio <span className="font-mono">{op.facturaNumero}</span>. El stock de los productos será repuesto automáticamente.</>
            ) : (
              <>Se cancelará el intercambio <span className="font-mono">{op.facturaNumero}</span>. La operación quedará en estado <span className="text-red-400">CANCELADO</span>.</>
            )}
          </p>
        </div>

        <div className="flex justify-end gap-3 px-5 py-4 border-t border-white/5">
          <button
            type="button"
            onClick={onCerrar}
            className="px-4 py-2.5 bg-white/5 border border-white/10 text-white/70 rounded-lg hover:bg-white/10 transition-colors text-sm"
          >
            Volver
          </button>
          <button
            type="button"
            onClick={() => onConfirmar(op)}
            className={`px-4 py-2.5 text-black font-medium rounded-lg transition-colors text-sm ${esRecepcion ? "bg-[#22c55e] hover:bg-green-400" : esCierre ? "bg-[#22c55e] hover:bg-green-400" : "bg-red-500 hover:bg-red-400"}`}
          >
            {esRecepcion ? "Confirmar" : esCierre ? "Cerrar" : "Cancelar intercambio"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function NuevaOperacionModal({ tipo, facturas, loadingFacturas, onCerrar, onRegistrar }) {
  const labelTipo = CONFIG[tipo].label;
  const [paso, setPaso] = useState(1);
  const [facturaSel, setFacturaSel] = useState(null);
  const [facturaDetalle, setFacturaDetalle] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [productosDevueltos, setProductosDevueltos] = useState({});
  const [productosEntregar, setProductosEntregar] = useState({});
  const [motivo, setMotivo] = useState("");

  const [filtroNumero, setFiltroNumero] = useState("");
  const [filtroProveedor, setFiltroProveedor] = useState("");
  const [filtroFechaDesde, setFiltroFechaDesde] = useState("");
  const [filtroFechaHasta, setFiltroFechaHasta] = useState("");

  const hayFiltros = Boolean(filtroNumero || filtroProveedor || filtroFechaDesde || filtroFechaHasta);

  const limpiarFiltros = () => {
    setFiltroNumero("");
    setFiltroProveedor("");
    setFiltroFechaDesde("");
    setFiltroFechaHasta("");
  };

  const facturasFiltradas = useMemo(() => {
    const numero = filtroNumero.trim().toLowerCase();
    const proveedor = filtroProveedor.trim().toLowerCase();
    return facturas
      .filter((f) => f.activo !== false
        && ![ "CANCELADA", "ANULADO" ].includes(String(f.estado || "").toUpperCase()))
      .filter((f) => !numero || String(f.numeroFactura || "").toLowerCase().includes(numero))
      .filter((f) => !proveedor || String(f.nombreProveedor || "").toLowerCase().includes(proveedor))
      .filter((f) => {
        const fecha = String(f.fechaEmision || "").slice(0, 10);
        if (filtroFechaDesde && fecha < filtroFechaDesde) return false;
        if (filtroFechaHasta && fecha > filtroFechaHasta) return false;
        return true;
      });
  }, [facturas, filtroNumero, filtroProveedor, filtroFechaDesde, filtroFechaHasta]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onCerrar(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCerrar]);

  const handleSeleccionarFactura = async (factura) => {
    setFacturaSel(factura);
    setProductosDevueltos({});
    setProductosEntregar({});
    setFacturaDetalle(null);
    setCargandoDetalle(true);
    try {
      const res = await getFacturaCompraById(factura.idFactura);
      setFacturaDetalle(res);
    } catch (err) {
      console.error("Error al cargar detalle:", err);
      setFacturaDetalle(null);
    } finally {
      setCargandoDetalle(false);
    }
  };

  const handleCambiarCantidad = (idProducto, cantidad) => {
    const max = Number(facturaDetalle?.detalles?.find(d => d.idProducto === idProducto)?.cantidad) || 0;
    const val = Math.max(0, Math.min(Number(cantidad) || 0, max));
    if (tipo === "DEVOLUCION") {
      setProductosDevueltos(prev => ({ ...prev, [idProducto]: val }));
    } else {
      setProductosEntregar(prev => ({ ...prev, [idProducto]: val }));
    }
  };

  const totalOperacion = facturaDetalle?.detalles?.reduce((sum, d) => {
    const cant = (tipo === "DEVOLUCION" ? productosDevueltos : productosEntregar)[d.idProducto] || 0;
    return sum + (cant * (d.precioUnitario || 0));
  }, 0) || 0;

  const tieneProductos = Object.values(tipo === "DEVOLUCION" ? productosDevueltos : productosEntregar).some(v => Number(v) > 0);
  const puedeRegistrar = tipo === "ANULACION" ? true : tieneProductos;
  const canAvanzar = paso === 1 ? Boolean(facturaDetalle) : true;

  const handleRegistrar = () => {
    if (!puedeRegistrar) return;
    const base = {
      fecha: new Date().toISOString(),
      facturaNumero: facturaDetalle.numeroFactura,
      proveedor: facturaDetalle.nombreProveedor,
      proveedorId: facturaDetalle.idProveedor ?? null,
      idFactura: facturaDetalle.idFactura ?? null,
      motivo,
      documentoTipo: "",
      documentoNumero: "",
      observaciones: "",
    };

    if (tipo === "DEVOLUCION") {
      const items = facturaDetalle.detalles
        .filter(d => (productosDevueltos[d.idProducto] || 0) > 0)
        .map(d => ({
          idProducto: d.idProducto,
          producto: d.nombreProducto,
          cantidad: Number(productosDevueltos[d.idProducto]),
          precioUnitario: d.precioUnitario,
          tipo: "devolver",
        }));
      onRegistrar({
        ...base,
        tipo: "DEVOLUCION",
        estado: "PENDIENTE",
        facturaOriginal: facturaDetalle.numeroFactura,
        facturaNueva: null,
        estadoFactura: "EN_PROCESO",
        total: totalOperacion,
        items,
      });
    } else if (tipo === "INTERCAMBIO") {
      const itemsEntregar = facturaDetalle.detalles
        .filter(d => (productosEntregar[d.idProducto] || 0) > 0)
        .map(d => ({
          idProducto: d.idProducto,
          producto: d.nombreProducto,
          cantidad: Number(productosEntregar[d.idProducto]),
          precioUnitario: d.precioUnitario,
          motivoIntercambio: "",
          tipo: "entregar",
        }));
      onRegistrar({
        ...base,
        tipo: "INTERCAMBIO",
        estado: "PENDIENTE",
        fechaRecepcion: null,
        total: totalOperacion,
        items: itemsEntregar,
      });
    } else {
      onRegistrar({
        ...base,
        tipo: "ANULACION",
        estado: "ANULADA",
        total: facturaDetalle.totalGeneral || 0,
        items: [],
      });
    }
  };

  const pasoInfo = [
    "Selecciona la factura de compra.",
    tipo === "ANULACION"
      ? "Confirma la anulación de la factura."
      : tipo === "DEVOLUCION"
        ? "Indica las cantidades a devolver."
        : "Indica las cantidades a intercambiar.",
  ];

  const renderPaso2 = () => (
    <div className="p-6 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label htmlFor="filtro-numero" className="block text-xs font-medium text-white/50 mb-1">N° Factura</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 w-4 h-4" />
            <input id="filtro-numero" type="text" value={filtroNumero} onChange={(e) => setFiltroNumero(e.target.value)} placeholder="N° de factura" className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#22c55e]/50" />
          </div>
        </div>
        <div>
          <label htmlFor="filtro-proveedor" className="block text-xs font-medium text-white/50 mb-1">Proveedor</label>
          <input id="filtro-proveedor" type="text" value={filtroProveedor} onChange={(e) => setFiltroProveedor(e.target.value)} placeholder="Nombre del proveedor" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#22c55e]/50" />
        </div>
        <div>
          <label htmlFor="filtro-desde" className="block text-xs font-medium text-white/50 mb-1">Fecha desde</label>
          <input id="filtro-desde" type="date" value={filtroFechaDesde} onChange={(e) => setFiltroFechaDesde(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#22c55e]/50 [color-scheme:dark]" />
        </div>
        <div>
          <label htmlFor="filtro-hasta" className="block text-xs font-medium text-white/50 mb-1">Fecha hasta</label>
          <input id="filtro-hasta" type="date" value={filtroFechaHasta} onChange={(e) => setFiltroFechaHasta(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#22c55e]/50 [color-scheme:dark]" />
        </div>
      </div>
      {hayFiltros && (
        <div className="flex justify-end">
          <button type="button" onClick={limpiarFiltros} className="text-xs text-[#22c55e] hover:underline flex items-center gap-1"><X className="w-3.5 h-3.5" /> Limpiar filtros</button>
        </div>
      )}

      {loadingFacturas ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="animate-pulse bg-white/5 border border-white/5 rounded-lg p-4"><div className="h-4 bg-white/10 rounded w-1/4" /></div>)}</div>
      ) : facturasFiltradas.length === 0 ? (
        <p className="text-center text-white/30 py-8">No se encontraron facturas</p>
      ) : (
        <div className="max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/10 text-white/40 text-left"><th className="px-4 py-3 font-medium">N° Factura</th><th className="px-4 py-3 font-medium">Fecha</th><th className="px-4 py-3 font-medium">Proveedor</th><th className="px-4 py-3 font-medium text-right">Total</th></tr></thead>
            <tbody>
              {facturasFiltradas.map((f) => (
                <tr
                  key={f.idFactura}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSeleccionarFactura(f)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSeleccionarFactura(f); } }}
                  className={`border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors focus:outline-none focus:bg-white/5 ${facturaSel?.idFactura === f.idFactura ? "bg-green-500/5" : ""}`}
                >
                  <td className="px-4 py-3 text-white font-mono">{f.numeroFactura}</td>
                  <td className="px-4 py-3 text-white/70">{fmtFecha(f.fechaEmision)}</td>
                  <td className="px-4 py-3 text-white/70">{f.nombreProveedor}</td>
                  <td className="px-4 py-3 text-right text-white font-mono">{fmtMoneda(f.totalGeneral)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {facturaSel && cargandoDetalle && <p className="text-xs text-white/40">Cargando detalle de la factura...</p>}
    </div>
  );

  const renderPaso3 = () => {
    if (cargandoDetalle || !facturaDetalle) {
      return (
        <div className="p-6 space-y-3">
          <div className="animate-pulse bg-white/5 border border-white/5 rounded-lg h-20" />
          <div className="animate-pulse bg-white/5 border border-white/5 rounded-lg h-40" />
        </div>
      );
    }

    if (tipo === "ANULACION") {
      return (
        <div className="p-6 space-y-4">
          <div className="bg-white/3 border border-white/5 rounded-lg p-4 space-y-2">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 text-red-400"><Ban className="w-4 h-4" /> Anulación de Factura</h3>
            <p className="text-sm text-white/70">
              Se anulará la factura <span className="font-mono">{facturaDetalle.numeroFactura}</span> de <span className="font-medium">{facturaDetalle.nombreProveedor}</span> por <span className="font-mono text-red-400">{fmtMoneda(facturaDetalle.totalGeneral)}</span> (emitida el {fmtFecha(facturaDetalle.fechaEmision)}).
            </p>
          </div>
          <div>
            <label htmlFor="motivo-anulacion" className="block text-xs font-medium text-white/50 mb-1">Motivo (opcional)</label>
            <textarea
              id="motivo-anulacion"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Ej: Factura incorrecta, duplicada, productos no recibidos"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#22c55e]/50 resize-none"
            />
          </div>
        </div>
      );
    }

    return (
      <div className="p-6 space-y-4">
        {tipo === "DEVOLUCION" && (
          <div className="bg-white/3 border border-white/5 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold text-white">Productos a Devolver</h3>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-white/10 text-white/40 text-left"><th className="px-4 py-3 font-medium">Producto</th><th className="px-2 py-3 font-medium text-center">Comprado</th><th className="px-2 py-3 font-medium text-center">Devolver</th><th className="px-2 py-3 font-medium text-right">Subtotal</th></tr></thead>
                <tbody>
                  {facturaDetalle.detalles?.map((d) => {
                    const devuelto = productosDevueltos[d.idProducto] || 0;
                    const max = Number(d.cantidad) || 0;
                    return (
                      <tr key={d.idProducto} className="border-b border-white/5 hover:bg-white/5">
                        <td className="px-4 py-3 text-white">{d.nombreProducto}</td>
                        <td className="px-2 py-3 text-center text-white/70 font-mono">{d.cantidad}</td>
                        <td className="px-2 py-3 text-center">
                          <input type="number" min="0" max={max} step="any" value={devuelto} onChange={(e) => handleCambiarCantidad(d.idProducto, e.target.value)} aria-label={`Cantidad a devolver de ${d.nombreProducto}`} className="w-24 bg-white/5 border border-white/10 rounded px-2 py-1 text-right text-sm font-mono text-white outline-none focus:border-[#22c55e]/50" />
                        </td>
                        <td className="px-2 py-3 text-right text-white font-mono">{fmtMoneda(devuelto * (d.precioUnitario || 0))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tipo === "INTERCAMBIO" && (
          <div className="bg-white/3 border border-white/5 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 text-green-400"><ArrowLeftRight className="w-4 h-4" /> Productos a Intercambiar</h3>
            <div className="max-h-52 overflow-y-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-white/10 text-white/40 text-left"><th className="px-4 py-3 font-medium">Producto</th><th className="px-2 py-3 font-medium text-center">Comprado</th><th className="px-2 py-3 font-medium text-center">A Intercambiar</th><th className="px-2 py-3 font-medium text-right">Subtotal</th></tr></thead>
                <tbody>
                  {facturaDetalle.detalles?.map((d) => {
                    const entregar = productosEntregar[d.idProducto] || 0;
                    const max = Number(d.cantidad) || 0;
                    return (
                      <tr key={d.idProducto} className="border-b border-white/5 hover:bg-white/5">
                        <td className="px-4 py-3 text-white">{d.nombreProducto}</td>
                        <td className="px-2 py-3 text-center text-white/70 font-mono">{d.cantidad}</td>
                        <td className="px-2 py-3 text-center">
                          <input type="number" min="0" max={max} step="any" value={entregar} onChange={(e) => handleCambiarCantidad(d.idProducto, e.target.value)} aria-label={`Cantidad a intercambiar de ${d.nombreProducto}`} className="w-24 bg-white/5 border border-white/10 rounded px-2 py-1 text-right text-sm font-mono text-white outline-none focus:border-[#22c55e]/50" />
                        </td>
                        <td className="px-2 py-3 text-right text-white font-mono">{fmtMoneda(entregar * (d.precioUnitario || 0))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div>
          <label htmlFor="motivo-operacion" className="block text-xs font-medium text-white/50 mb-1">Motivo (opcional)</label>
          <input
            id="motivo-operacion"
            type="text"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            maxLength={100}
            placeholder="Ej: Producto defectuoso, error en pedido"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#22c55e]/50"
          />
        </div>

        <div className="text-right pt-2 border-t border-white/5">
          {tipo !== "ANULACION" && (
            <p className="text-sm font-mono text-white">Total {tipo === "DEVOLUCION" ? "a devolver" : "a intercambiar"}: <span className="text-[#22c55e]">{fmtMoneda(totalOperacion)}</span></p>
          )}
        </div>
      </div>
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Nueva ${labelTipo} con proveedor`}
        className="bg-[#1a1a20] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div>
            <h2 className="text-lg font-semibold text-white">Nueva {labelTipo}</h2>
            <p className="text-xs text-[#7a7a8c] mt-0.5">{pasoInfo[paso - 1]}</p>
          </div>
          <button onClick={onCerrar} className="p-1 text-white/40 hover:text-white transition-colors" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center px-6 pt-4">
          {STEPS.map((s, i) => (
            <Fragment key={s}>
              <div className={`flex items-center gap-2 ${i + 1 < paso ? "text-white/50" : i + 1 === paso ? "text-[#22c55e]" : "text-white/25"}`}>
                <span className={`w-6 h-6 rounded-full text-xs flex items-center justify-center border shrink-0 ${i + 1 < paso ? "bg-green-500/20 border-green-500/50" : i + 1 === paso ? "bg-[#22c55e] border-[#22c55e] text-black" : "border-white/20"}`}>{i + 1}</span>
                <span className="text-xs font-medium">{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className="mx-3 h-px flex-1 bg-white/10" />}
            </Fragment>
          ))}
        </div>

        <div className="overflow-y-auto flex-1">
          {paso === 1 && renderPaso2()}
          {paso === 2 && renderPaso3()}
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-white/5">
          <div className="text-xs text-white/40">
            {paso === 2 && tipo === "INTERCAMBIO" && !puedeRegistrar
              ? "Selecciona al menos un producto a intercambiar."
              : ""}
          </div>
          <div className="flex gap-3">
            {paso > 1 && (
              <button
                type="button"
                onClick={() => setPaso(p => p - 1)}
                className="px-4 py-2.5 bg-white/5 border border-white/10 text-white/70 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Anterior
              </button>
            )}
            {paso < 2 ? (
              <button
                type="button"
                onClick={() => setPaso(p => p + 1)}
                disabled={!canAvanzar}
                className="px-6 py-2.5 bg-[#22c55e] hover:bg-green-400 text-black font-medium rounded-lg transition-colors disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1"
              >
                Siguiente <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRegistrar}
                disabled={!puedeRegistrar}
                className="px-6 py-2.5 bg-[#22c55e] hover:bg-green-400 text-black font-medium rounded-lg transition-colors disabled:opacity-40 disabled:pointer-events-none flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> {tipo === "ANULACION" ? "Anular" : "Registrar"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}