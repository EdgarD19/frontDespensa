import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  Plus, X, Save, Search, FileText, AlertTriangle, CheckCircle, ArrowLeft,
  ArrowLeftRight, Ban, ChevronLeft, ChevronRight, PackageCheck, XCircle, FilePlus2, Eye, ListChecks,
} from "lucide-react";
import { getFacturasCompra, getFacturaCompraById, getTimbradosProveedor } from "../../../api/facturasCompraApi";
import {
  getIntercambios,
  crearIntercambio,
  marcarIntercambioRecibido,
  cerrarIntercambio,
  cancelarIntercambio,
  getAnulaciones,
  anularFactura,
  getDevoluciones,
  crearDevolucion,
  completarDevolucion,
  cancelarDevolucion,
} from "../../../api/operacionesCompraApi";
import { apiErrorMessage } from "../../../api/errors";
import { formatoFactura, hoyAsuncion, estadoTimbrado, etiquetaTimbrado } from "../utils";

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

/* ───────────── Estilos compartidos ───────────── */

const labelClass = "block text-xs text-[#7a7a8c] mb-1";

const fieldClass =
  "w-full rounded-lg border border-[#2a2a32] bg-[#0d0d0f] px-3 py-2 text-sm text-[#f1f1f3] " +
  "placeholder:text-[#4a4a5a] outline-none transition focus:border-[#22c55e]/60 focus:ring-2 focus:ring-[#22c55e]/15 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const fieldMonoClass = `${fieldClass} tabular-nums tracking-wide`;

const thBase = "px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.14em] text-[#22c55e]/70";

const iconBtn = "flex h-8 w-8 items-center justify-center rounded-lg transition-colors";

const modalShell = "w-full rounded-xl border border-[#1e1e24] bg-[#111114] shadow-2xl flex flex-col";

// ====================================================================
// Vínculo factura ↔ intercambio (el back no guarda la factura original).
// Se guarda localmente al registrar el intercambio.
// ====================================================================
const VINCULO_KEY = "intercambioFacturaLink";

function leerVinculos() {
  try {
    return JSON.parse(localStorage.getItem(VINCULO_KEY)) || {};
  } catch {
    return {};
  }
}

function guardarVinculo(idOrden, vinculo) {
  const m = leerVinculos();
  m[idOrden] = vinculo;
  localStorage.setItem(VINCULO_KEY, JSON.stringify(m));
}

const CONFIG = {
  DEVOLUCION: {
    label: "Devolución",
    plural: "Devoluciones",
    accion: "devolución",
    empty: "Aún no hay devoluciones registradas",
    subtitulo: "Devolvé productos de una factura y generá su reemplazo",
  },
  INTERCAMBIO: {
    label: "Intercambio",
    plural: "Intercambios",
    accion: "intercambio",
    empty: "Aún no hay intercambios registrados",
    subtitulo: "Registrá productos a cambiar con el proveedor",
  },
  ANULACION: {
    label: "Anulación",
    plural: "Anulaciones",
    accion: "anulación",
    empty: "Aún no hay anulaciones registradas",
    subtitulo: "Anulá una factura de compra registrada por error",
  },
};

const STEPS = ["Factura", "Detalle"];

// Clases completas para que Tailwind las detecte.
const ESTADO_STYLES = {
  PENDIENTE: { badge: "bg-amber-500/10 text-amber-300", dot: "bg-amber-400" },
  RECIBIDO: { badge: "bg-emerald-500/10 text-emerald-400", dot: "bg-emerald-400" },
  PROCESADA: { badge: "bg-emerald-500/10 text-emerald-400", dot: "bg-emerald-400" },
  COMPLETADA: { badge: "bg-emerald-500/10 text-emerald-400", dot: "bg-emerald-400" },
  ANULADA: { badge: "bg-red-500/10 text-red-400", dot: "bg-red-400" },
  CERRADO: { badge: "bg-sky-500/10 text-sky-300", dot: "bg-sky-400" },
  CANCELADO: { badge: "bg-white/10 text-white/50", dot: "bg-white/40" },
  CANCELADA: { badge: "bg-white/10 text-white/50", dot: "bg-white/40" },
  RECHAZADA: { badge: "bg-red-500/10 text-red-400", dot: "bg-red-400" },
};

function EstadoBadge({ estado }) {
  const s = ESTADO_STYLES[estado] || { badge: "bg-white/10 text-white/60", dot: "bg-white/40" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${s.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {estado || "—"}
    </span>
  );
}

function useEscape(onCerrar) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onCerrar(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCerrar]);
}

// Convierte una OrdenIntercambioResponse (backend) a la forma interna de la tabla.
function formatearIntercambio(o) {
  const detalles = o.detalles || [];
  const vinculo = leerVinculos()[o.idOrdenIntercambio] || null;
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
    facturaId: vinculo?.idFactura ?? null,
    facturaVinculada: vinculo?.numeroFactura ?? null,
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

// Convierte una DevolucionResponse (backend) a la forma interna de la tabla.
function formatearDevolucion(d) {
  const detalles = d.detalles || [];
  return {
    id: `dv-${d.idDevolucion}`,
    tipo: "DEVOLUCION",
    estado: d.estado,
    fecha: d.fechaCreacion,
    fechaCompletacion: d.fechaCompletacion,
    facturaNumero: d.facturaOriginal?.numeroFactura,
    facturaOriginal: d.facturaOriginal?.numeroFactura,
    facturaNueva: d.facturaNueva?.numeroFactura ?? null,
    idFactura: d.facturaOriginal?.idFactura,
    proveedor: d.proveedor?.nombre,
    proveedorId: d.proveedor?.idProveedor,
    motivo: d.motivo,
    observaciones: d.observaciones,
    total: detalles.reduce((sum, x) => sum + (Number(x.cantidadDevuelta) * Number(x.precioUnitario) || 0), 0),
    items: detalles.map((x) => ({
      idProducto: x.producto?.idProducto,
      producto: x.producto?.nombre,
      cantidad: x.cantidadDevuelta,
      precioUnitario: x.precioUnitario,
      motivoDevolucion: x.motivoDevolucion,
    })),
    idDevolucion: d.idDevolucion,
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

/* ───────────── Página ───────────── */

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
  const [modalVerFactura, setModalVerFactura] = useState(null);

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
        const res = await getDevoluciones({ page: 0, pageSize: 1000 });
        setOperaciones(Array.isArray(res.content) ? res.content.map(formatearDevolucion) : []);
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
          detalles: (op.items || []).map((it) => ({
            idProducto: it.idProducto,
            cantidad: it.cantidad,
            motivoIntercambio: it.motivoIntercambio || "",
          })),
        });
        setAviso(`Intercambio registrado.`);
        if (creada.idOrdenIntercambio != null && op.idFactura != null) {
          guardarVinculo(creada.idOrdenIntercambio, {
            idFactura: op.idFactura,
            numeroFactura: op.facturaNumero,
          });
        }
      } else if (op.tipo === "ANULACION") {
        const anulada = await anularFactura({ idFactura: op.idFactura, motivo: op.motivo || "" });
        setAviso(`Factura ${anulada.numeroFactura || ""} anulada.`);
      } else if (op.tipo === "DEVOLUCION") {
        await crearDevolucion({
          idFacturaOriginal: op.idFactura,
          motivo: op.motivo || "",
          observaciones: op.observaciones || "",
          detalles: (op.items || []).map((it) => ({
            idProducto: it.idProducto,
            cantidadDevuelta: it.cantidad,
            motivoDevolucion: it.motivoDevolucion || "",
          })),
        });
        setAviso(`Devolución registrada. El stock fue descontado.`);
      }
      setShowModal(false);
      cargarOperaciones();
    } catch (err) {
      console.error("Error al registrar operación:", err);
      setErrorOperacion(apiErrorMessage(err));
    }
  };

  const handleRegistrarFacturaNueva = async (op, datos) => {
    setErrorOperacion(null);
    setAviso(null);
    try {
      const numero = String(datos.numero || "").trim();
      if (!numero || !datos.idTimbrado) return;
      await completarDevolucion(op.idDevolucion, {
        idDevolucion: op.idDevolucion,
        idTimbrado: Number(datos.idTimbrado),
        numeroFacturaNueva: numero,
        fechaEmisionNueva: datos.fecha || hoyAsuncion(),
        observacionesFacturaNueva: "",
      });
      setAviso(`Devolución completada. La factura original quedó ANULADA.`);
      setModalFacturaNueva(null);
      cargarOperaciones();
    } catch (err) {
      console.error("Error al completar devolución:", err);
      setErrorOperacion(apiErrorMessage(err));
    }
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

  const handleCancelarDevolucion = async (op) => {
    setErrorOperacion(null);
    try {
      await cancelarDevolucion(op.idDevolucion);
      setAviso("Devolución cancelada. El stock fue repuesto.");
      cargarOperaciones();
    } catch (err) {
      console.error("Error al cancelar devolución:", err);
      setErrorOperacion(apiErrorMessage(err));
    }
  };

  const handleVerFactura = (op) => {
    setErrorOperacion(null);
    setAviso(null);
    if (op.facturaId == null) {
      setAviso("Este intercambio no tiene una factura vinculada.");
      return;
    }
    setModalVerFactura({ idFactura: op.facturaId, numeroFactura: op.facturaVinculada, items: op.items || [] });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link to="/compras/devoluciones-intercambios" className="rounded-lg p-2 text-white/50 transition-colors hover:bg-white/10" aria-label="Volver">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 space-y-0.5">
          <h1 className="text-2xl font-semibold tracking-tight text-[#f1f1f3]">{cfg.plural}</h1>
          <p className="text-sm text-[#5a5a6e]">{cfg.subtitulo}</p>
        </div>
        <button
          type="button"
          onClick={() => { setErrorOperacion(null); setAviso(null); setShowModal(true); }}
          className="flex items-center gap-2 whitespace-nowrap rounded-lg bg-[#22c55e] px-4 py-2.5 text-sm font-semibold text-black transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]/50"
        >
          <Plus className="h-4 w-4" />
          Registrar {cfg.label.toLowerCase()}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertTriangle className="h-5 w-5 shrink-0" /> {error}
        </div>
      )}
      {errorOperacion && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertTriangle className="h-5 w-5 shrink-0" /> {errorOperacion}
        </div>
      )}
      {aviso && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          <CheckCircle className="h-5 w-5 shrink-0" /> {aviso}
        </div>
      )}

      <div className="overflow-hidden border border-[#1e1e24] bg-[#111114] shadow-lg shadow-black/20">
        {cargandoOperaciones && operaciones.length === 0 ? (
          <div className="divide-y divide-[#1e1e24]">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-4">
                {Array.from({ length: 5 }).map((__, j) => (
                  <div key={j} className="h-4 flex-1 animate-pulse rounded bg-white/10" />
                ))}
              </div>
            ))}
          </div>
        ) : operaciones.length === 0 && !errorOperacion ? (
          <div className="space-y-2 px-4 py-14 text-center">
            <FileText className="mx-auto h-10 w-10 text-white/15" />
            <p className="text-sm text-white/50">{cfg.empty}</p>
            <p className="text-xs text-[#5a5a6e]">
              Empezá con “Registrar {cfg.label.toLowerCase()}”.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1e1e24] bg-white/[0.02]">
                  <th className={thBase}>Fecha</th>
                  <th className={thBase}>Estado</th>
                  {tipo !== "INTERCAMBIO" && <th className={thBase}>N° factura</th>}
                  {tipo === "DEVOLUCION" && <th className={thBase}>Factura anulada</th>}
                  <th className={thBase}>Proveedor</th>
                  <th className={`${thBase} text-right`}>Total</th>
                  {tipo !== "ANULACION" && <th className={`${thBase} w-28`} aria-label="Acciones" />}
                </tr>
              </thead>
              <tbody>
                {operaciones.map((op) => {
                  const totalAnulacion = tipo === "ANULACION" ? totalFacturaById[op.idFactura] ?? null : null;
                  return (
                    <tr key={op.id} className="border-b border-[#1e1e24] transition-colors last:border-0 hover:bg-white/[0.04]">
                      <td className="whitespace-nowrap px-4 py-3.5 text-white/60">{fmtFechaHora(op.fecha)}</td>
                      <td className="px-4 py-3.5"><EstadoBadge estado={op.estado} /></td>
                      {tipo !== "INTERCAMBIO" && (
                        <td className="px-4 py-3.5 font-medium tabular-nums text-white">{op.facturaNueva || op.facturaNumero}</td>
                      )}
                      {tipo === "DEVOLUCION" && (
                        <td className="px-4 py-3.5 tabular-nums text-white/50">{op.facturaNueva ? op.facturaOriginal : "—"}</td>
                      )}
                      <td className="px-4 py-3.5 text-white/70">{op.proveedor}</td>
                      <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-zinc-100">
                        {tipo === "ANULACION" ? (totalAnulacion != null ? fmtMoneda(totalAnulacion) : "—") : fmtMoneda(op.total)}
                      </td>
                      {tipo !== "ANULACION" && (
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            {op.tipo === "INTERCAMBIO" ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleVerFactura(op)}
                                  title={op.facturaId != null ? "Ver factura del intercambio" : "Este intercambio no tiene factura vinculada"}
                                  aria-label="Ver factura"
                                  className={`${iconBtn} ${op.facturaId != null ? "text-white/40 hover:bg-sky-500/10 hover:text-sky-400" : "text-white/15"}`}
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                {op.estado === "PENDIENTE" ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => setModalConfirmacion({ tipo: "recepcion", op })}
                                      title="Confirmar recepción del reemplazo"
                                      aria-label="Confirmar recepción"
                                      className={`${iconBtn} text-white/40 hover:bg-emerald-500/10 hover:text-emerald-400`}
                                    >
                                      <PackageCheck className="h-4 w-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setModalConfirmacion({ tipo: "cancelacion", op })}
                                      title="Cancelar intercambio"
                                      aria-label="Cancelar intercambio"
                                      className={`${iconBtn} text-white/40 hover:bg-red-500/10 hover:text-red-400`}
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </button>
                                  </>
                                ) : op.estado === "RECIBIDO" ? (
                                  <button
                                    type="button"
                                    onClick={() => setModalConfirmacion({ tipo: "cierre", op })}
                                    title="Cerrar intercambio (el proveedor trajo el reemplazo)"
                                    aria-label="Cerrar intercambio"
                                    className={`${iconBtn} text-white/40 hover:bg-emerald-500/10 hover:text-emerald-400`}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </button>
                                ) : null}
                              </>
                            ) : op.tipo === "DEVOLUCION" && op.estado === "PENDIENTE" ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setModalFacturaNueva(op)}
                                  title="Registrar factura nueva (reemplazo)"
                                  aria-label="Registrar factura nueva"
                                  className={`${iconBtn} text-white/40 hover:bg-emerald-500/10 hover:text-emerald-400`}
                                >
                                  <FilePlus2 className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setModalConfirmacion({ tipo: "cancelacionDev", op })}
                                  title="Cancelar devolución"
                                  aria-label="Cancelar devolución"
                                  className={`${iconBtn} text-white/40 hover:bg-red-500/10 hover:text-red-400`}
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              </>
                            ) : (
                              <span className="pr-1 text-xs text-[#5a5a6e]">—</span>
                            )}
                          </div>
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
            } else if (modalConfirmacion.tipo === "cancelacionDev") {
              handleCancelarDevolucion(sig);
            } else {
              handleCancelarIntercambio(sig);
            }
            setModalConfirmacion(null);
          }}
        />
      )}

      {modalVerFactura && (
        <VerFacturaModal
          facturaId={modalVerFactura.idFactura}
          numeroFactura={modalVerFactura.numeroFactura}
          items={modalVerFactura.items}
          onCerrar={() => setModalVerFactura(null)}
        />
      )}
    </div>
  );
}

/* ───────────── Registrar factura nueva (reemplazo de devolución) ───────────── */

function RegistrarFacturaNuevaModal({ op, facturas, onCerrar, onConfirmar }) {
  const [numeroNueva, setNumeroNueva] = useState("");
  const [tocado, setTocado] = useState(false);
  const [timbrados, setTimbrados] = useState([]);
  const [cargandoTimbrados, setCargandoTimbrados] = useState(Boolean(op.proveedorId));
  const [timbradoId, setTimbradoId] = useState("");
  const [fechaNueva] = useState(hoyAsuncion());

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
  const timbradoSel = timbrados.find((t) => String(t.idTimbrado) === String(timbradoId)) || null;
  const estadoTimbradoSel = timbradoSel ? estadoTimbrado(timbradoSel, fechaNueva) : null;
  const timbradoBloqueado = estadoTimbradoSel && estadoTimbradoSel.tipo !== "vigente";
  const puedeGuardar = formatoValido && !yaExiste && Boolean(timbradoId) && !timbradoBloqueado;

  useEffect(() => {
    if (!op.proveedorId) return;
    getTimbradosProveedor(op.proveedorId)
      .then((res) => setTimbrados(res?.content || []))
      .catch(() => setTimbrados([]))
      .finally(() => setCargandoTimbrados(false));
  }, [op.proveedorId]);

  // Si hay un único timbrado vigente, se selecciona automáticamente.
  useEffect(() => {
    if (timbrados.length === 0) return;
    const vigentes = timbrados.filter((t) => estadoTimbrado(t, fechaNueva).tipo === "vigente");
    if (vigentes.length === 1) setTimbradoId(String(vigentes[0].idTimbrado));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timbrados]);

  useEscape(onCerrar);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Registrar factura nueva"
        className={`${modalShell} max-w-2xl max-h-[90vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#1e1e24] px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[#f1f1f3]">
            <FilePlus2 className="h-4 w-4 text-[#22c55e]" />
            Registrar factura nueva
          </h2>
          <button type="button" onClick={onCerrar} aria-label="Cerrar"
            className="rounded p-1 text-[#5a5a6e] transition-colors hover:bg-white/5 hover:text-[#e1e1eb]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div className="space-y-3 rounded-lg border border-red-500/20 bg-red-500/5 p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-red-400">
              <FileText className="h-4 w-4" /> Factura original — quedará anulada
            </h3>
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs text-white/40">N° factura</p>
                <p className="tabular-nums text-white">{op.facturaOriginal || op.facturaNumero}</p>
              </div>
              <div>
                <p className="text-xs text-white/40">Proveedor</p>
                <p className="text-white">{op.proveedor}</p>
              </div>
              <div>
                <p className="text-xs text-white/40">Total</p>
                <p className="tabular-nums text-white">{fmtMoneda(op.total)}</p>
              </div>
            </div>
            {op.items?.length > 0 && (
              <div className="max-h-40 overflow-y-auto border border-white/5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-white/40">
                      <th className="px-3 py-2 font-medium">Producto</th>
                      <th className="px-3 py-2 text-center font-medium">Cantidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {op.items.map((it, i) => (
                      <tr key={i} className="border-b border-white/5 last:border-0">
                        <td className="px-3 py-2 text-white/80">{it.producto}</td>
                        <td className="px-3 py-2 text-center tabular-nums text-white/70">{it.cantidad}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="numero-factura-nueva" className={labelClass}>
              N° factura nueva <span className="text-rose-400">*</span>
            </label>
            <input
              id="numero-factura-nueva"
              type="text"
              value={numeroNueva}
              onChange={(e) => { setNumeroNueva(formatoFactura(e.target.value)); setTocado(false); }}
              onBlur={() => setTocado(true)}
              autoComplete="off"
              inputMode="numeric"
              placeholder="000-000-0000000"
              maxLength={15}
              autoFocus
              className={`${fieldMonoClass} ${errorMsg ? "border-red-500/50" : ""}`}
            />
            {errorMsg && <p className="mt-1 text-xs text-red-400">{errorMsg}</p>}
          </div>

          <div>
            <label htmlFor="dev-timbrado" className={labelClass}>
              Timbrado <span className="text-rose-400">*</span>
            </label>
            <select
              id="dev-timbrado"
              value={timbradoId}
              onChange={(e) => setTimbradoId(e.target.value)}
              disabled={cargandoTimbrados}
              className={`${fieldClass} cursor-pointer [color-scheme:dark] ${timbradoBloqueado ? "border-red-500/50" : ""}`}
            >
              {cargandoTimbrados ? (
                <option value="">Cargando timbrados...</option>
              ) : timbrados.length === 0 ? (
                <option value="">Sin timbrados registrados</option>
              ) : (
                <>
                  <option value="">Seleccionar timbrado</option>
                  {timbrados.map((t) => {
                    const st = estadoTimbrado(t, fechaNueva);
                    return (
                      <option key={t.idTimbrado} value={t.idTimbrado}>
                        {t.numeroTimbrado} — {etiquetaTimbrado(st.tipo)}
                      </option>
                    );
                  })}
                </>
              )}
            </select>
            {timbradoSel && estadoTimbradoSel && estadoTimbradoSel.tipo !== "vigente" && (
              <p className="mt-1 text-xs text-red-400">{estadoTimbradoSel.msg}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[#1e1e24] px-5 py-3.5">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg border border-[#2a2a32] bg-[#0d0d0f] px-4 py-2.5 text-sm text-[#9a9aac] transition-colors hover:text-[#e1e1eb]"
          >
            Volver
          </button>
          <button
            type="button"
            onClick={() => onConfirmar(op, { numero: numeroNueva, idTimbrado: timbradoId, fecha: fechaNueva })}
            disabled={!puedeGuardar}
            className="flex items-center gap-2 rounded-lg bg-[#22c55e] px-4 py-2.5 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Save className="h-4 w-4" /> Registrar factura nueva
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ───────────── Ver factura vinculada a un intercambio ───────────── */

function VerFacturaModal({ facturaId, numeroFactura, items = [], onCerrar }) {
  const [factura, setFactura] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let activo = true;
    getFacturaCompraById(facturaId)
      .then((res) => { if (activo) setFactura(res); })
      .catch(() => { if (activo) setError("No se pudo cargar la factura."); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [facturaId]);

  useEscape(onCerrar);

  const detalles = factura?.detalles || [];
  const total = detalles.reduce((sum, d) => sum + (Number(d.cantidad) * Number(d.precioUnitario) || 0), 0);
  const cantIntercambio = useMemo(() => {
    const m = {};
    items.forEach((it) => { if (it.idProducto != null) m[String(it.idProducto)] = it.cantidad; });
    return m;
  }, [items]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Ver factura"
        className={`${modalShell} max-w-3xl max-h-[90vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#1e1e24] px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[#f1f1f3]">
            <FileText className="h-4 w-4 text-sky-400" /> Factura {numeroFactura || factura?.numeroFactura || ""}
          </h2>
          <button type="button" onClick={onCerrar} aria-label="Cerrar"
            className="rounded p-1 text-[#5a5a6e] transition-colors hover:bg-white/5 hover:text-[#e1e1eb]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {cargando ? (
            <div className="space-y-3 py-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-4 w-full animate-pulse rounded bg-white/10" />
              ))}
            </div>
          ) : error ? (
            <p className="py-8 text-center text-red-400">{error}</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 rounded-lg border border-[#1e1e24] bg-white/[0.02] p-4 text-sm lg:grid-cols-4">
                <div>
                  <p className="text-xs text-white/40">N° factura</p>
                  <p className="tabular-nums text-white">{factura.numeroFactura}</p>
                </div>
                <div>
                  <p className="text-xs text-white/40">Fecha emisión</p>
                  <p className="text-white">{fmtFecha(factura.fechaEmision)}</p>
                </div>
                <div>
                  <p className="text-xs text-white/40">Proveedor</p>
                  <p className="text-white">{factura.nombreProveedor}</p>
                </div>
                <div>
                  <p className="text-xs text-white/40">Estado</p>
                  <EstadoBadge estado={factura.estado} />
                </div>
              </div>

              <div className="overflow-hidden border border-[#1e1e24]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#1e1e24] bg-white/[0.02] text-left text-white/40">
                      <th className="px-3 py-2.5 font-medium">Producto</th>
                      <th className="px-3 py-2.5 text-center font-medium">Cantidad</th>
                      <th className="px-3 py-2.5 text-center font-medium">Intercambio</th>
                      <th className="px-3 py-2.5 text-right font-medium">P. unitario</th>
                      <th className="px-3 py-2.5 text-right font-medium">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalles.map((d) => {
                      const cambiado = cantIntercambio[String(d.idProducto)] ?? null;
                      return (
                        <tr key={d.idProducto ?? d.idDetalle} className="border-b border-[#1e1e24] last:border-0">
                          <td className="px-3 py-2.5 text-white/80">{d.nombreProducto}</td>
                          <td className="px-3 py-2.5 text-center tabular-nums text-white/70">{d.cantidad}</td>
                          <td className={`px-3 py-2.5 text-center tabular-nums ${cambiado != null ? "font-medium text-amber-300" : "text-white/20"}`}>
                            {cambiado != null ? cambiado : "—"}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-white/70">{fmtMoneda(d.precioUnitario)}</td>
                          <td className="px-3 py-2.5 text-right font-medium tabular-nums text-white">{fmtMoneda(Number(d.cantidad) * Number(d.precioUnitario))}</td>
                        </tr>
                      );
                    })}
                    {detalles.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-white/30">La factura no tiene productos</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end border-t border-[#1e1e24] pt-3">
                <p className="text-sm text-white">Total: <span className="text-lg font-bold tabular-nums text-[#22c55e]">{fmtMoneda(total)}</span></p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ───────────── Confirmación de acciones sobre una operación existente ───────────── */

function ConfirmarAccionModal({ tipo, op, onCerrar, onConfirmar }) {
  const esRecepcion = tipo === "recepcion";
  const esCierre = tipo === "cierre";
  const esCancelarDev = tipo === "cancelacionDev";
  const esDestructiva = !esRecepcion && !esCierre;

  useEscape(onCerrar);

  const textoAviso = esRecepcion
    ? <>Se confirmará la recepción del reemplazo de la orden <span className="tabular-nums">{op.facturaNumero}</span>.</>
    : esCierre
      ? <>Se cerrará el intercambio <span className="tabular-nums">{op.facturaNumero}</span>. El stock de los productos será repuesto automáticamente.</>
      : esCancelarDev
        ? <>Se cancelará la devolución de la factura <span className="tabular-nums">{op.facturaOriginal || op.facturaNumero}</span>. El stock será repuesto automáticamente.</>
        : <>Se cancelará el intercambio <span className="tabular-nums">{op.facturaNumero}</span>. La operación quedará en estado <span className="font-medium text-red-400">CANCELADO</span>.</>;

  const titulo = esRecepcion
    ? "Confirmar recepción"
    : esCierre
      ? "Cerrar intercambio"
      : esCancelarDev
        ? "Cancelar devolución"
        : "Cancelar intercambio";

  const labelBoton = esRecepcion ? "Confirmar" : esCierre ? "Cerrar" : esCancelarDev ? "Cancelar devolución" : "Cancelar intercambio";

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onCerrar}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={titulo}
        className={`${modalShell} max-w-md`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#1e1e24] px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[#f1f1f3]">
            {esRecepcion ? (
              <PackageCheck className="h-4 w-4 text-[#22c55e]" />
            ) : esCierre ? (
              <CheckCircle className="h-4 w-4 text-[#22c55e]" />
            ) : (
              <XCircle className="h-4 w-4 text-red-400" />
            )}
            {titulo}
          </h2>
          <button type="button" onClick={onCerrar} aria-label="Cerrar"
            className="rounded p-1 text-[#5a5a6e] transition-colors hover:bg-white/5 hover:text-[#e1e1eb]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="text-sm leading-relaxed text-white/70">{textoAviso}</p>
        </div>

        <div className="flex justify-end gap-2 border-t border-[#1e1e24] px-5 py-3.5">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg border border-[#2a2a32] bg-[#0d0d0f] px-4 py-2.5 text-sm text-[#9a9aac] transition-colors hover:text-[#e1e1eb]"
          >
            Volver
          </button>
          <button
            type="button"
            onClick={() => onConfirmar(op)}
            className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
              esDestructiva ? "bg-red-500 text-white hover:bg-red-400" : "bg-[#22c55e] text-black hover:opacity-90"
            }`}
          >
            {labelBoton}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ───────────── Wizard: nueva devolución / intercambio / anulación ───────────── */

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
        && !["CANCELADA", "ANULADO"].includes(String(f.estado || "").toUpperCase()))
      .filter((f) => !numero || String(f.numeroFactura || "").toLowerCase().includes(numero))
      .filter((f) => !proveedor || String(f.nombreProveedor || "").toLowerCase().includes(proveedor))
      .filter((f) => {
        const fecha = String(f.fechaEmision || "").slice(0, 10);
        if (filtroFechaDesde && fecha < filtroFechaDesde) return false;
        if (filtroFechaHasta && fecha > filtroFechaHasta) return false;
        return true;
      });
  }, [facturas, filtroNumero, filtroProveedor, filtroFechaDesde, filtroFechaHasta]);

  useEscape(onCerrar);

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
    const max = Number(facturaDetalle?.detalles?.find((d) => d.idProducto === idProducto)?.cantidad) || 0;
    const val = Math.max(0, Math.min(Number(cantidad) || 0, max));
    if (tipo === "DEVOLUCION") {
      setProductosDevueltos((prev) => ({ ...prev, [idProducto]: val }));
    } else {
      setProductosEntregar((prev) => ({ ...prev, [idProducto]: val }));
    }
  };

  // Atajo de comodidad: marcar todos los productos con su cantidad completa.
  const marcarTodoElMaximo = () => {
    const todo = {};
    (facturaDetalle?.detalles || []).forEach((d) => { todo[d.idProducto] = Number(d.cantidad) || 0; });
    if (tipo === "DEVOLUCION") setProductosDevueltos(todo);
    else setProductosEntregar(todo);
  };

  const limpiarCantidades = () => {
    if (tipo === "DEVOLUCION") setProductosDevueltos({});
    else setProductosEntregar({});
  };

  const totalOperacion = facturaDetalle?.detalles?.reduce((sum, d) => {
    const cant = (tipo === "DEVOLUCION" ? productosDevueltos : productosEntregar)[d.idProducto] || 0;
    return sum + (cant * (d.precioUnitario || 0));
  }, 0) || 0;

  const tieneProductos = Object.values(tipo === "DEVOLUCION" ? productosDevueltos : productosEntregar).some((v) => Number(v) > 0);
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
        .filter((d) => (productosDevueltos[d.idProducto] || 0) > 0)
        .map((d) => ({
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
        .filter((d) => (productosEntregar[d.idProducto] || 0) > 0)
        .map((d) => ({
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
    "Seleccioná la factura de compra.",
    tipo === "ANULACION"
      ? "Confirmá la anulación de la factura."
      : tipo === "DEVOLUCION"
        ? "Indicá las cantidades a devolver."
        : "Indicá las cantidades a intercambiar.",
  ];

  const renderPasoFactura = () => (
    <div className="space-y-4 p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="filtro-numero" className={labelClass}>N° factura</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              id="filtro-numero" type="text" value={filtroNumero}
              onChange={(e) => setFiltroNumero(e.target.value)}
              placeholder="N° de factura"
              autoComplete="off"
              className={`${fieldClass} pl-9`}
            />
          </div>
        </div>
        <div>
          <label htmlFor="filtro-proveedor" className={labelClass}>Proveedor</label>
          <input
            id="filtro-proveedor" type="text" value={filtroProveedor}
            onChange={(e) => setFiltroProveedor(e.target.value)}
            placeholder="Nombre del proveedor"
            autoComplete="off"
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="filtro-desde" className={labelClass}>Fecha desde</label>
          <input
            id="filtro-desde" type="date" value={filtroFechaDesde}
            onChange={(e) => setFiltroFechaDesde(e.target.value)}
            className={`${fieldClass} [color-scheme:dark]`}
          />
        </div>
        <div>
          <label htmlFor="filtro-hasta" className={labelClass}>Fecha hasta</label>
          <input
            id="filtro-hasta" type="date" value={filtroFechaHasta}
            onChange={(e) => setFiltroFechaHasta(e.target.value)}
            className={`${fieldClass} [color-scheme:dark]`}
          />
        </div>
      </div>
      {hayFiltros && (
        <div className="flex justify-end">
          <button type="button" onClick={limpiarFiltros} className="flex items-center gap-1 text-xs text-[#22c55e] transition-colors hover:text-green-400">
            <X className="h-3.5 w-3.5" /> Limpiar filtros
          </button>
        </div>
      )}

      <div className="overflow-hidden border border-[#1e1e24]">
        <div className="max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#111114]">
              <tr className="border-b border-[#1e1e24] bg-white/[0.02] text-left text-white/40">
                <th className="px-4 py-2.5 font-medium">N° factura</th>
                <th className="px-4 py-2.5 font-medium">Fecha</th>
                <th className="px-4 py-2.5 font-medium">Proveedor</th>
                <th className="px-4 py-2.5 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {loadingFacturas && (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#1e1e24] last:border-0">
                    {Array.from({ length: 4 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
                      </td>
                    ))}
                  </tr>
                ))
              )}

              {!loadingFacturas && facturasFiltradas.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-white/30">
                    No se encontraron facturas con esos filtros.
                  </td>
                </tr>
              )}

              {!loadingFacturas && facturasFiltradas.map((f) => {
                const seleccionada = facturaSel?.idFactura === f.idFactura;
                return (
                  <tr
                    key={f.idFactura}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSeleccionarFactura(f)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSeleccionarFactura(f); } }}
                    className={`cursor-pointer border-b border-[#1e1e24] transition-colors last:border-0 focus:outline-none ${
                      seleccionada
                        ? "border-l-2 border-l-[#22c55e] bg-[#22c55e]/[0.08]"
                        : "hover:bg-white/[0.04]"
                    }`}
                  >
                    <td className="px-4 py-3 font-medium tabular-nums text-white">{f.numeroFactura}</td>
                    <td className="px-4 py-3 text-white/70">{fmtFecha(f.fechaEmision)}</td>
                    <td className="px-4 py-3 text-white/70">{f.nombreProveedor}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-white">{fmtMoneda(f.totalGeneral)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {facturaSel && cargandoDetalle && (
        <p className="text-xs text-[#5a5a6e]">Cargando detalle de la factura…</p>
      )}
    </div>
  );

  const renderPasoDetalle = () => {
    if (cargandoDetalle || !facturaDetalle) {
      return (
        <div className="space-y-3 p-5">
          <div className="h-20 animate-pulse rounded-lg border border-[#1e1e24] bg-white/5" />
          <div className="h-40 animate-pulse rounded-lg border border-[#1e1e24] bg-white/5" />
        </div>
      );
    }

    if (tipo === "ANULACION") {
      return (
        <div className="space-y-4 p-5">
          <div className="space-y-2 rounded-lg border border-red-500/20 bg-red-500/5 p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-red-400">
              <Ban className="h-4 w-4" /> Anulación de factura
            </h3>
            <p className="text-sm text-white/70">
              Se anulará la factura <span className="tabular-nums">{facturaDetalle.numeroFactura}</span> de{" "}
              <span className="font-medium">{facturaDetalle.nombreProveedor}</span> por{" "}
              <span className="font-semibold tabular-nums text-red-400">{fmtMoneda(facturaDetalle.totalGeneral)}</span>{" "}
              (emitida el {fmtFecha(facturaDetalle.fechaEmision)}).
            </p>
          </div>
          <div>
            <label htmlFor="motivo-anulacion" className={labelClass}>Motivo (opcional)</label>
            <textarea
              id="motivo-anulacion"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Ej: Factura incorrecta, duplicada, productos no recibidos"
              className={`${fieldClass} resize-none`}
            />
          </div>
        </div>
      );
    }

    const cantidades = tipo === "DEVOLUCION" ? productosDevueltos : productosEntregar;
    const seleccionados = Object.values(cantidades).filter((v) => Number(v) > 0).length;

    return (
      <div className="space-y-4 p-5">
        <div className="space-y-3 rounded-lg border border-[#1e1e24] bg-white/[0.02] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className={`flex items-center gap-2 text-sm font-semibold ${tipo === "DEVOLUCION" ? "text-red-400" : "text-emerald-400"}`}>
              {tipo === "DEVOLUCION" ? <FileText className="h-4 w-4" /> : <ArrowLeftRight className="h-4 w-4" />}
              {tipo === "DEVOLUCION" ? "Productos a devolver" : "Productos a intercambiar"}
            </h3>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-[#5a5a6e]">{seleccionados} seleccionado{seleccionados === 1 ? "" : "s"}</span>
              <button type="button" onClick={marcarTodoElMaximo} className="flex items-center gap-1 font-medium text-[#22c55e] transition-colors hover:text-green-400">
                <ListChecks className="h-3.5 w-3.5" /> Todo
              </button>
              {seleccionados > 0 && (
                <button type="button" onClick={limpiarCantidades} className="text-white/50 transition-colors hover:text-white">
                  Limpiar
                </button>
              )}
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto border border-[#1e1e24]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[#111114]">
                <tr className="border-b border-[#1e1e24] bg-white/[0.02] text-left text-white/40">
                  <th className="px-4 py-2.5 font-medium">Producto</th>
                  <th className="px-2 py-2.5 text-center font-medium">Comprado</th>
                  <th className="w-32 px-2 py-2.5 text-center font-medium">{tipo === "DEVOLUCION" ? "Devolver" : "Intercambiar"}</th>
                  <th className="px-2 py-2.5 text-right font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {facturaDetalle.detalles?.map((d) => {
                  const cant = cantidades[d.idProducto] || 0;
                  const max = Number(d.cantidad) || 0;
                  const activo = cant > 0;
                  return (
                    <tr key={d.idProducto} className={`border-b border-[#1e1e24] last:border-0 transition-colors ${activo ? "bg-[#22c55e]/[0.04]" : "hover:bg-white/[0.03]"}`}>
                      <td className="px-4 py-2.5 text-white">{d.nombreProducto}</td>
                      <td className="px-2 py-2.5 text-center tabular-nums text-white/60">{d.cantidad}</td>
                      <td className="px-2 py-2.5">
                        <div className="mx-auto flex w-28 items-center gap-1">
                          <input
                            type="number" min="0" max={max} step="any" value={cant}
                            onChange={(e) => handleCambiarCantidad(d.idProducto, e.target.value)}
                            onFocus={(e) => e.target.select()}
                            aria-label={`Cantidad a ${tipo === "DEVOLUCION" ? "devolver" : "intercambiar"} de ${d.nombreProducto}`}
                            className={`w-full rounded-md border bg-[#0d0d0f] px-2 py-1.5 text-right text-sm tabular-nums text-white outline-none transition focus:border-[#22c55e]/60 focus:ring-2 focus:ring-[#22c55e]/15 ${
                              activo ? "border-[#22c55e]/40" : "border-[#2a2a32]"
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => handleCambiarCantidad(d.idProducto, max)}
                            title={`Usar cantidad completa (${max})`}
                            className="shrink-0 rounded-md border border-[#2a2a32] px-1.5 py-1.5 text-[10px] text-white/40 transition-colors hover:border-[#22c55e]/40 hover:text-[#22c55e]"
                          >
                            Máx
                          </button>
                        </div>
                      </td>
                      <td className="px-2 py-2.5 text-right font-medium tabular-nums text-white">{fmtMoneda(cant * (d.precioUnitario || 0))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <label htmlFor="motivo-operacion" className={labelClass}>Motivo (opcional)</label>
          <input
            id="motivo-operacion"
            type="text"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            maxLength={100}
            autoComplete="off"
            placeholder="Ej: Producto defectuoso, error en pedido"
            className={fieldClass}
          />
        </div>

        <div className="flex items-center justify-end border-t border-[#1e1e24] pt-3">
          <p className="text-sm text-white">
            Total {tipo === "DEVOLUCION" ? "a devolver" : "a intercambiar"}:{" "}
            <span className="text-lg font-bold tabular-nums text-[#22c55e]">{fmtMoneda(totalOperacion)}</span>
          </p>
        </div>
      </div>
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Nueva ${labelTipo} con proveedor`}
        className={`${modalShell} max-w-4xl max-h-[90vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#1e1e24] px-5 py-3.5">
          <div>
            <h2 className="text-sm font-semibold text-[#f1f1f3]">Nueva {labelTipo.toLowerCase()}</h2>
            <p className="mt-0.5 text-xs text-[#7a7a8c]">{pasoInfo[paso - 1]}</p>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar"
            className="rounded p-1 text-[#5a5a6e] transition-colors hover:bg-white/5 hover:text-[#e1e1eb]">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Stepper */}
        <div className="flex items-center px-5 pt-4">
          {STEPS.map((s, i) => (
            <Fragment key={s}>
              <div className={`flex items-center gap-2 ${i + 1 < paso ? "text-white/50" : i + 1 === paso ? "text-[#22c55e]" : "text-white/25"}`}>
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${
                  i + 1 < paso ? "border-emerald-500/50 bg-emerald-500/20" : i + 1 === paso ? "border-[#22c55e] bg-[#22c55e] text-black" : "border-white/20"
                }`}>
                  {i + 1 < paso ? <CheckCircle className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className="text-xs font-medium">{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className="mx-3 h-px flex-1 bg-white/10" />}
            </Fragment>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {paso === 1 && renderPasoFactura()}
          {paso === 2 && renderPasoDetalle()}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[#1e1e24] px-5 py-3.5">
          <div className="text-xs text-white/40">
            {paso === 2 && tipo === "INTERCAMBIO" && !puedeRegistrar
              ? "Seleccioná al menos un producto a intercambiar."
              : paso === 2 && tipo === "DEVOLUCION" && !puedeRegistrar
                ? "Seleccioná al menos un producto a devolver."
                : ""}
          </div>
          <div className="flex gap-2">
            {paso > 1 && (
              <button
                type="button"
                onClick={() => setPaso((p) => p - 1)}
                className="flex items-center gap-1 rounded-lg border border-[#2a2a32] bg-[#0d0d0f] px-4 py-2.5 text-sm text-[#9a9aac] transition-colors hover:text-[#e1e1eb]"
              >
                <ChevronLeft className="h-4 w-4" /> Anterior
              </button>
            )}
            {paso < 2 ? (
              <button
                type="button"
                onClick={() => setPaso((p) => p + 1)}
                disabled={!canAvanzar}
                className="flex items-center gap-1 rounded-lg bg-[#22c55e] px-6 py-2.5 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRegistrar}
                disabled={!puedeRegistrar}
                className="flex items-center gap-2 rounded-lg bg-[#22c55e] px-6 py-2.5 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Save className="h-4 w-4" /> {tipo === "ANULACION" ? "Anular" : "Registrar"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
