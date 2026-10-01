import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  Plus, X, Save, Search, FileText, AlertTriangle, CheckCircle, ArrowLeft,
  ArrowLeftRight, Ban, ChevronLeft, PackageCheck, XCircle, FilePlus2, Eye, ListChecks, PackageOpen,
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
import { getProductos } from "../../../api/productosApi";
import { formatoFactura, hoyAsuncion, estadoTimbrado, etiquetaTimbrado, esKG } from "../utils";
import CantidadInput from "../../../components/ui/CantidadInput";

function fmtMoneda(n) {
  return new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", minimumFractionDigits: 0 }).format(n ?? 0);
}

function fmtFecha(valor) {
  if (!valor) return "—";
  // LocalDate de Spring viene como "YYYY-MM-DD" sin zona horaria: se parsea como UTC
  // y toLocaleDateString lo desplaza un día atrás en Asunción (UTC-3).
  if (typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [yy, mm, dd] = valor.split("-").map(Number);
    return new Date(yy, mm - 1, dd).toLocaleDateString("es-PY");
  }
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

// Estados de bloqueo al operar una factura, para la columna "Estado" del selector.
const ESTADO_BLOQUEO = {
  DEVOLUCION_PENDIENTE: { label: "Devolución pendiente", badge: "bg-amber-500/10 text-amber-300", dot: "bg-amber-400" },
  INTERCAMBIO_PENDIENTE: { label: "Intercambio pendiente", badge: "bg-amber-500/10 text-amber-300", dot: "bg-amber-400" },
  INTERCAMBIO_PROVEEDOR: { label: "Intercambio en curso", badge: "bg-sky-500/10 text-sky-300", dot: "bg-sky-400" },
  ESTADO_NO_RECIBIDA: { label: "No recibida", badge: "bg-white/10 text-white/50", dot: "bg-white/40" },
};

// Estado propio de la factura de compra.
const ESTADO_FACTURA = {
  RECIBIDA: { badge: "bg-emerald-500/10 text-emerald-400", dot: "bg-emerald-400" },
  VIGENTE: { badge: "bg-emerald-500/10 text-emerald-400", dot: "bg-emerald-400" },
  CANCELADA: { badge: "bg-white/10 text-white/50", dot: "bg-white/40" },
  ANULADA: { badge: "bg-red-500/10 text-red-400", dot: "bg-red-400" },
};

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

// EstadoBadge para la columna "Estado" del selector de facturas: muestra el motivo
// de bloqueo si la factura no se puede operar, o su estado propio si está libre.
function EstadoFacturaBadge({ estado, bloqueada, motivo }) {
  const key = String(estado || "").toUpperCase();
  const cfg = bloqueada ? ESTADO_BLOQUEO[key] : ESTADO_FACTURA[key];
  const s = cfg || { badge: "bg-white/10 text-white/60", dot: "bg-white/40" };
  const texto = cfg?.label || key || "—";
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-1 text-[11px] font-medium ${s.badge}`}
      title={bloqueada && motivo ? motivo : undefined}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.dot}`} />
      {texto}
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
    facturaId: o.idFactura ?? null,
    facturaVinculada: o.numeroFactura ?? null,
    total: detalles.reduce((sum, d) => sum + (Number(d.cantidad) * Number(d.precioUnitario) || Number(d.subtotal) || 0), 0),
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
    facturaVinculada: a.numeroFactura,
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
  const [modalVerDevolucion, setModalVerDevolucion] = useState(null);
  // Totales de anulaciones cuyo idFactura no está en la página de facturas cargada.
  const [totalesAnulacion, setTotalesAnulacion] = useState({});
  const [cargandoTotales, setCargandoTotales] = useState(false);
  // Facturas que el backend no permite operar (dev pendiente / intercambio pendiente /
  // estado no vigente). Se muestran atenuadas con su motivo y no se pueden seleccionar.
  const [facturasBloqueadas, setFacturasBloqueadas] = useState([]);
  // Sets cacheados de operaciones PENDIENTES (se cargan una sola vez por tipo).
  const [pendientes, setPendientes] = useState({ devFacturas: [], intFacturas: [], intProveedores: [] });

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

  // Carga UNA sola vez (y al refrescar) los IDs de operaciones PENDIENTES que bloquean.
  // Debe declararse antes de refrescarTodo (que lo invoca).
  const cargarPendientes = useCallback(async () => {
    const [devoluciones, intercambios] = await Promise.all([
      getDevoluciones({ page: 0, pageSize: 1000 }).catch(() => ({ content: [] })),
      getIntercambios({ page: 0, pageSize: 1000 }).catch(() => ({ content: [] })),
    ]);
    setPendientes({
      devFacturas: (devoluciones.content || [])
        .filter((d) => String(d.estado || "").toUpperCase() === "PENDIENTE" && d.facturaOriginal?.idFactura != null)
        .map((d) => Number(d.facturaOriginal.idFactura)),
      intFacturas: (intercambios.content || [])
        .filter((o) => String(o.estado || "").toUpperCase() === "PENDIENTE" && o.idFactura != null)
        .map((o) => Number(o.idFactura)),
      intProveedores: (intercambios.content || [])
        .filter((o) => String(o.estado || "").toUpperCase() === "PENDIENTE" && o.idProveedor != null)
        .map((o) => Number(o.idProveedor)),
    });
  }, []);

  useEffect(() => {
    cargarPendientes();
  }, [cargarPendientes, tipo]);

  // Recarga operaciones y facturas (para reflejar anulaciones/facturas nuevas sin F5).
  const refrescarTodo = useCallback(() => {
    cargarOperaciones();
    cargarPendientes();
    if (tipo === "ANULACION" || tipo === "DEVOLUCION") cargarFacturas();
  }, [cargarOperaciones, cargarFacturas, cargarPendientes, tipo]);

  // Total de la factura original (para mostrar en anulaciones, ya que el backend no lo incluye).
  const totalFacturaById = useMemo(() => {
    const m = {};
    facturas.forEach((f) => { m[f.idFactura] = f.totalGeneral; });
    return m;
  }, [facturas]);

  // Carga los totales de anulaciones que no están en la página de facturas (1000 más recientes).
  const resolverTotalesAnulacion = useCallback(async (lista) => {
    const faltantes = (lista || []).filter(
      (a) => a.idFactura != null && totalFacturaById[a.idFactura] == null
    );
    if (faltantes.length === 0) return;
    setCargandoTotales(true);
    try {
      const resultados = await Promise.all(
        faltantes.map(async (a) => {
          try {
            const f = await getFacturaCompraById(a.idFactura);
            const detalles = Array.isArray(f?.detalles) ? f.detalles : [];
            const total = detalles.reduce(
              (sum, d) => sum + (Number(d.cantidad) * Number(d.precioUnitario) || 0),
              0
            );
            return [String(a.idFactura), total];
          } catch {
            return null;
          }
        })
      );
      setTotalesAnulacion((prev) => {
        const next = { ...prev };
        resultados.forEach((r) => { if (r) next[r[0]] = r[1]; });
        return next;
      });
    } finally {
      setCargandoTotales(false);
    }
  }, [totalFacturaById]);

  useEffect(() => {
    if (tipo === "ANULACION" && operaciones.length > 0) {
      resolverTotalesAnulacion(operaciones);
    }
  }, [tipo, operaciones, resolverTotalesAnulacion]);

  const handleRegistrar = async (op) => {
    setErrorOperacion(null);
    setAviso(null);
    try {
      if (op.tipo === "INTERCAMBIO") {
        const creada = await crearIntercambio({
          idProveedor: op.proveedorId,
          idFactura: op.idFactura ?? undefined,
          numeroFactura: op.facturaNumero ?? undefined,
          detalles: (op.items || []).map((it) => ({
            idProducto: it.idProducto,
            cantidad: it.cantidad,
            motivoIntercambio: it.motivoIntercambio || op.motivo || "",
          })),
        });
        setAviso(`Intercambio registrado.`);
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
      refrescarTodo();
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
      refrescarTodo();
    } catch (err) {
      console.error("Error al completar devolución:", err);
      setErrorOperacion(apiErrorMessage(err));
    }
  };

  const handleCerrarIntercambio = async (op) => {
    setErrorOperacion(null);
    try {
      // Un solo paso: si aún está PENDIENTE, primero se marca RECIBIDO y luego se cierra.
      if (op.estado === "PENDIENTE") {
        await marcarIntercambioRecibido(op.idOrdenIntercambio);
        setAviso("Intercambio recibido. Cerrando orden y reponiendo stock...");
      }
      await cerrarIntercambio(op.idOrdenIntercambio);
      setAviso("Intercambio cerrado. El stock fue repuesto.");
      refrescarTodo();
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
      refrescarTodo();
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
      refrescarTodo();
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
    setModalVerFactura({ idFactura: op.facturaId, numeroFactura: op.facturaVinculada, items: op.items || [], estadoOperacion: op.estado });
  };

// Facturas que no se pueden operar: se muestran atenuadas con su motivo y no clickeables.
  // Replica/amplía las reglas de negocio de los servicios del backend:
  //  - devolución PENDIENTE sobre la factura (bloquea devolución, intercambio y anulación)
  //  - intercambio PENDIENTE de la factura/proveedor (bloquea devolución y anulación)
  //  - factura no vigente: para devolución solo se acepta RECIBIDA/VIGENTE
  // Cálculo síncrono de las facturas bloqueadas (sin esperar nuevas llamadas HTTP).
  useEffect(() => {
    if (tipo !== "DEVOLUCION" && tipo !== "INTERCAMBIO" && tipo !== "ANULACION") {
      setFacturasBloqueadas([]);
      return;
    }
    const devSet = new Set(pendientes.devFacturas);
    const intFacturasSet = new Set(pendientes.intFacturas);
    const intProvSet = new Set(pendientes.intProveedores);
    const bloqueadas = [];
    facturas.forEach((f) => {
      const idf = Number(f.idFactura);
      const idProv = Number(f.idProveedor);
      const estado = String(f.estado || "").toUpperCase();
      if (devSet.has(idf)) {
        bloqueadas.push({ idFactura: idf, motivo: "Tiene una devolución pendiente", estado: "DEVOLUCION_PENDIENTE" });
      } else if (tipo === "INTERCAMBIO" && intFacturasSet.has(idf)) {
        bloqueadas.push({ idFactura: idf, motivo: "La factura ya tiene un intercambio pendiente", estado: "INTERCAMBIO_PENDIENTE" });
      } else if (tipo === "ANULACION" && (intFacturasSet.has(idf) || intProvSet.has(idProv))) {
        bloqueadas.push({ idFactura: idf, motivo: "El proveedor tiene un intercambio pendiente", estado: "INTERCAMBIO_PROVEEDOR" });
      } else if (tipo === "DEVOLUCION" && (intFacturasSet.has(idf) || intProvSet.has(idProv))) {
        bloqueadas.push({ idFactura: idf, motivo: "El proveedor tiene un intercambio pendiente", estado: "INTERCAMBIO_PROVEEDOR" });
      } else if (tipo === "DEVOLUCION" && estado !== "RECIBIDA" && estado !== "VIGENTE") {
        bloqueadas.push({ idFactura: idf, motivo: "La factura debe estar RECIBIDA", estado: "ESTADO_NO_RECIBIDA" });
      }
    });
    setFacturasBloqueadas(bloqueadas);
  }, [tipo, facturas, pendientes]);

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
                  <th className={`${thBase} w-28`} aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {operaciones.map((op) => {
                  const totalAnulacion =
                    tipo === "ANULACION"
                      ? totalFacturaById[op.idFactura] ?? totalesAnulacion[String(op.idFactura)] ?? null
                      : null;
                  return (
                    <tr key={op.id} className="border-b border-[#1e1e24] transition-colors last:border-0 hover:bg-white/[0.04]">
                      <td className="whitespace-nowrap px-4 py-3.5 text-white/60">{fmtFechaHora(op.fecha)}</td>
                      <td className="px-4 py-3.5"><EstadoBadge estado={op.estado} /></td>
                      {tipo !== "INTERCAMBIO" && (
                        <td className="px-4 py-3.5 font-medium tabular-nums text-white">{op.facturaVinculada || (tipo === "INTERCAMBIO" ? "—" : op.facturaNueva || op.facturaNumero)}</td>
                      )}
                      {tipo === "DEVOLUCION" && (
                        <td className="px-4 py-3.5 tabular-nums text-white/50">{op.facturaNueva ? op.facturaOriginal : "—"}</td>
                      )}
                      <td className="px-4 py-3.5 text-white/70">{op.proveedor}</td>
                      <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-zinc-100">
                        {tipo === "ANULACION" ? (
                          totalAnulacion != null
                            ? fmtMoneda(totalAnulacion)
                            : cargandoTotales
                              ? <span className="text-white/30">…</span>
                              : "—"
                        ) : fmtMoneda(op.total)}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                            {op.tipo === "ANULACION" ? (
                              <button
                                type="button"
                                onClick={() => handleVerFactura(op)}
                                title="Ver factura anulada"
                                aria-label="Ver factura anulada"
                                className={`${iconBtn} text-white/40 hover:bg-sky-500/10 hover:text-sky-400`}
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            ) : op.tipo === "INTERCAMBIO" ? (
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
                                      onClick={() => setModalConfirmacion({ tipo: "cierre", op })}
                                      title="Recibir el reemplazo y cerrar el intercambio en un solo paso (reponer stock)"
                                      aria-label="Recibir y cerrar intercambio"
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
                                    title="Cerrar intercambio (reponer stock)"
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
                                  onClick={() => setModalVerDevolucion(op)}
                                  title="Ver lo que se va a devolver"
                                  aria-label="Ver devolución"
                                  className={`${iconBtn} text-white/40 hover:bg-sky-500/10 hover:text-sky-400`}
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
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
          facturasBloqueadas={facturasBloqueadas}
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
            if (modalConfirmacion.tipo === "cierre") {
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
          estadoOperacion={modalVerFactura.estadoOperacion}
          onCerrar={() => setModalVerFactura(null)}
        />
      )}

      {modalVerDevolucion && (
        <VerDevolucionModal
          op={modalVerDevolucion}
          onCerrar={() => setModalVerDevolucion(null)}
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
  const sinProveedor = !op.proveedorId;
  const puedeGuardar = !sinProveedor && formatoValido && !yaExiste && Boolean(timbradoId) && !timbradoBloqueado;

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
            {!op.proveedorId ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-300">
                Esta devolución no tiene un proveedor asociado, por lo que no se puede registrar la factura nueva.
              </div>
            ) : (
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
            )}
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

function VerFacturaModal({ facturaId, numeroFactura, items = [], estadoOperacion, onCerrar }) {
  const [factura, setFactura] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError(null);
    getFacturaCompraById(facturaId)
      .then((res) => { if (activo) setFactura(res ?? null); })
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
          ) : !factura ? (
            <p className="py-8 text-center text-white/50">La factura no pudo cargarse.</p>
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
                  <p className="text-xs text-white/40">Estado de intercambio</p>
                  <EstadoBadge estado={estadoOperacion || factura.estado} />
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
                      <th className="px-3 py-2.5 text-right font-medium">Importe</th>
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

/* ───────────── Ver lo que se va a devolver (devolución pendiente) ───────────── */

function VerDevolucionModal({ op, onCerrar }) {
  useEscape(onCerrar);

  const items = op.items || [];
  const total = items.reduce((sum, it) => sum + (Number(it.cantidad) * Number(it.precioUnitario) || 0), 0);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Ver devolución"
        className={`${modalShell} max-w-3xl max-h-[90vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#1e1e24] px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[#f1f1f3]">
            <PackageOpen className="h-4 w-4 text-sky-400" /> Devolución a registrar
          </h2>
          <button type="button" onClick={onCerrar} aria-label="Cerrar"
            className="rounded p-1 text-[#5a5a6e] transition-colors hover:bg-white/5 hover:text-[#e1e1eb]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-4 rounded-lg border border-[#1e1e24] bg-white/[0.02] p-4 text-sm lg:grid-cols-4">
            <div>
              <p className="text-xs text-white/40">Factura original</p>
              <p className="tabular-nums text-white">{op.facturaOriginal || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-white/40">Fecha</p>
              <p className="text-white">{fmtFecha(op.fecha)}</p>
            </div>
            <div>
              <p className="text-xs text-white/40">Proveedor</p>
              <p className="text-white">{op.proveedor || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-white/40">Estado</p>
              <EstadoBadge estado={op.estado} />
            </div>
          </div>

          <div className="overflow-hidden border border-[#1e1e24]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1e1e24] bg-white/[0.02] text-left text-white/40">
                  <th className="px-3 py-2.5 font-medium">Producto</th>
                  <th className="px-3 py-2.5 text-center font-medium">Cantidad</th>
                  <th className="px-3 py-2.5 text-right font-medium">P. unitario</th>
                  <th className="px-3 py-2.5 text-right font-medium">Importe</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.idProducto ?? it.producto} className="border-b border-[#1e1e24] last:border-0">
                    <td className="px-3 py-2.5 text-white/80">{it.producto}</td>
                    <td className="px-3 py-2.5 text-center tabular-nums text-white/70">{it.cantidad}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-white/70">{fmtMoneda(it.precioUnitario)}</td>
                    <td className="px-3 py-2.5 text-right font-medium tabular-nums text-white">{fmtMoneda(Number(it.cantidad) * Number(it.precioUnitario) || 0)}</td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-white/30">Esta devolución no tiene productos registrados.</td>
                  </tr>
                )}
                {items.some((it) => it.motivoDevolucion) && (
                  <tr className="border-t border-[#1e1e24] bg-white/[0.01]">
                    <td colSpan={4} className="px-3 py-2.5 text-xs text-white/60">
                      {items.map((it) => it.motivoDevolucion ? (
                        <p key={it.idProducto ?? it.producto}>
                          <span className="text-white/40">{it.producto}:</span> {it.motivoDevolucion}
                        </p>
                      ) : null)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {op.motivo && (
              <div className="border-t border-[#1e1e24] px-4 py-2.5 text-sm">
                <span className="text-xs text-white/40">Motivo global: </span>
                <span className="text-white/70">{op.motivo}</span>
              </div>
            )}
            {op.observaciones && (
              <div className="border-t border-[#1e1e24] px-4 py-2.5 text-sm">
                <span className="text-xs text-white/40">Observaciones: </span>
                <span className="text-white/70">{op.observaciones}</span>
              </div>
            )}
          </div>

          <div className="flex justify-end border-t border-[#1e1e24] pt-3">
            <p className="text-sm text-white">Total a devolver: <span className="text-lg font-bold tabular-nums text-[#22c55e]">{fmtMoneda(total)}</span></p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ───────────── Confirmación de acciones sobre una operación existente ───────────── */

function ConfirmarAccionModal({ tipo, op, onCerrar, onConfirmar }) {
  const esCierre = tipo === "cierre";
  const esCancelarDev = tipo === "cancelacionDev";
  const esDestructiva = !esCierre;

  useEscape(onCerrar);

  const textoAviso = esCierre
                      ? <>Se cerrará el intercambio al recibir el reemplazo y el stock se repondrá automáticamente.</>
                      : esCancelarDev
                        ? <>Se cancelará la devolución de la factura <span className="tabular-nums">{op.facturaOriginal || op.facturaNumero}</span>. El stock será repuesto automáticamente.</>
                        : <>Se cancelará el intercambio y quedará registrado en estado <span className="font-medium text-red-400">CANCELADA</span>.</>;

  const titulo = esCierre
      ? "Cerrar intercambio"
      : esCancelarDev
        ? "Cancelar devolución"
        : "Cancelar intercambio";

  const labelBoton = esCierre ? "Cerrar" : esCancelarDev ? "Cancelar devolución" : "Cancelar intercambio";

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
            {esCierre ? (
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

function NuevaOperacionModal({ tipo, facturas, loadingFacturas, facturasBloqueadas = [], onCerrar, onRegistrar }) {
  const labelTipo = CONFIG[tipo].label;
  const [verDetalle, setVerDetalle] = useState(false);
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

  // Catálogo de productos: map idProducto → unidad, para saber si la cantidad admite decimales (KG).
  const [unidadesById, setUnidadesById] = useState({});

  useEffect(() => {
    let activo = true;
    getProductos({ page: 0, pageSize: 500, sortBy: "nombre", sortDirection: "asc" })
      .then((res) => {
        if (!activo) return;
        const m = {};
        (res.content || []).forEach((p) => { if (p.id != null) m[Number(p.id)] = p.unidadMedida || ""; });
        setUnidadesById(m);
      })
      .catch(() => {});
    return () => { activo = false; };
  }, []);

  // Contador de selección para descartar respuestas fuera de orden (race condition).
  const seleccionSeq = useRef(0);

  const hayFiltros = Boolean(filtroNumero || filtroProveedor || filtroFechaDesde || filtroFechaHasta);

  const limpiarFiltros = () => {
    setFiltroNumero("");
    setFiltroProveedor("");
    setFiltroFechaDesde("");
    setFiltroFechaHasta("");
  };

  // Conjunto de facturas bloqueadas por el backend (devolución PENDIENTE, intercambio
  // PENDIENTE del proveedor o estado no válido). Se muestran con su estado y sin poder
  // seleccionarse, en lugar de ocultarlas.
  const bloqueosPorFactura = useMemo(() => {
    const map = {};
    facturasBloqueadas.forEach((b) => { map[Number(b.idFactura)] = b; });
    return map;
  }, [facturasBloqueadas]);

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

  // Escape cierra solo la capa superior: si el detalle está abierto vuelve al
// selector de facturas, si no cierra el modal completo.
  useEscape(useCallback(() => {
    if (verDetalle) setVerDetalle(false);
    else onCerrar();
  }, [verDetalle, onCerrar]));

  const handleSeleccionarFactura = async (factura) => {
    setFacturaSel(factura);
    setProductosDevueltos({});
    setProductosEntregar({});
    setFacturaDetalle(null);
    setCargandoDetalle(true);
    setMotivo(""); // el motivo debe reiniciarse al cambiar de factura
    setVerDetalle(true);
    const miSeq = ++seleccionSeq.current;
    try {
      const res = await getFacturaCompraById(factura.idFactura);
      if (seleccionSeq.current !== miSeq) return; // respuesta fuera de orden
      setFacturaDetalle(res);
    } catch (err) {
      if (seleccionSeq.current !== miSeq) return;
      console.error("Error al cargar detalle:", err);
      setFacturaDetalle(null);
    } finally {
      if (seleccionSeq.current === miSeq) setCargandoDetalle(false);
    }
  };

  const handleCambiarCantidad = (idProducto, cantidad) => {
    const d = facturaDetalle?.detalles?.find((x) => x.idProducto === idProducto);
    const max = d ? limitesCantidad(d, tipo) : 0;
    const val = Math.max(0, Math.min(Number(cantidad) || 0, max));
    if (tipo === "DEVOLUCION") {
      setProductosDevueltos((prev) => ({ ...prev, [idProducto]: val }));
    } else {
      setProductosEntregar((prev) => ({ ...prev, [idProducto]: val }));
    }
  };

  // Tope impuesto por la factura, antes de considerar el stock.
  // Un producto puede devolverse al 100% (si está defectuoso, va la unidad
  // completa de vuelta). Lo que NO se permite es devolver el 100% de TODOS los
  // productos: eso equivale a anular la factura y corresponde al flujo de
  // Anulación, por eso se valida de forma cruzada en `esDevolucionTotal`.
  const maxPorFactura = (d, tipoOp) => {
    const original = Number(d.cantidad) || 0;
    return Math.max(0, original);
  };

  // Límite máximo de cantidad por producto según el tipo de operación.
  // El stock físico actual es siempre el techo: el backend rechaza con
  // StockInsuficienteParaDevolucion/ParaIntercambio si no alcanza.
  const limitesCantidad = (d, tipoOp) => {
    const topeFactura = maxPorFactura(d, tipoOp);
    const stockActual = d?.stockActual !== undefined && d?.stockActual !== null
      ? Number(d.stockActual)
      : null;
    if (stockActual === null || !Number.isFinite(stockActual)) return topeFactura;
    return Math.max(0, Math.min(topeFactura, stockActual));
  };

  // Atajo de comodidad: marcar todos los productos con su cantidad máxima
  // (en devolución queda 1 paso por debajo del 100%, que es una anulación).
  const marcarTodoElMaximo = () => {
    const todo = {};
    (facturaDetalle?.detalles || []).forEach((d) => {
      const max = limitesCantidad(d, tipo);
      if (max > 0) todo[d.idProducto] = max;
    });
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

  // Devolver el 100% de todos los productos es una anulación, no una devolución.
  // Se valida de forma cruzada: cada línea llega a su cantidad original.
  const esDevolucionTotal = tipo === "DEVOLUCION" && (facturaDetalle?.detalles?.length || 0) > 0
    && facturaDetalle.detalles.every((d) => {
      const cant = Number(productosDevueltos[d.idProducto]) || 0;
      return cant >= (Number(d.cantidad) || 0);
    });

  // ----- Prevalidación de anulación (espejo de las reglas del backend) -----
  // El backend exige: estado RECIBIDA, sin anulación previa, ser la factura más
  // reciente del proveedor y no superar los días permitidos (default 15).
  const esMasRecienteEntreCargadas = (factura) => {
    const otras = facturas
      .filter((f) => f.activo !== false && f.idProveedor === factura.idProveedor && f.idFactura !== factura.idFactura);
    return otras.length === 0 || otras.every((f) => {
      const a = String(f.fechaEmision || "").slice(0, 10);
      const b = String(factura.fechaEmision || "").slice(0, 10);
      return a <= b;
    });
  };

  const validarAnulacion = useCallback((factura) => {
    if (!factura) return [];
    const avisos = [];
    if (String(factura.estado || "").toUpperCase() !== "RECIBIDA") {
      avisos.push("Solo se pueden anular facturas en estado RECIBIDA.");
    }
    if (factura.anulada) {
      avisos.push("Esta factura ya fue anulada.");
    }
    if (!esMasRecienteEntreCargadas(factura)) {
      avisos.push("Debe ser la factura más reciente del proveedor.");
    }
    const diaEmision = String(factura.fechaEmision || "").slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(diaEmision)) {
      const desde = new Date(diaEmision + "T00:00:00");
      const hoy = new Date();
      const dias = Math.floor((hoy.getTime() - desde.getTime()) / 86400000);
      if (dias > 15) {
        avisos.push(`Supera los 15 días permitidos para anular (pasaron ${dias} días).`);
      }
    }
    return avisos;
  }, [facturas]);

  const avisosAnulacion = tipo === "ANULACION" && facturaDetalle ? validarAnulacion(facturaDetalle) : [];
  const bloqueaAnulacion = avisosAnulacion.length > 0;
const puedeRegistrar = tipo === "ANULACION"
    ? !bloqueaAnulacion
    : tieneProductos && !esDevolucionTotal;

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

  const renderPasoFactura = () => {
    // Las facturas disponibles van primero; las bloqueadas (con su motivo) quedan al final.
    const ordenadas = [...facturasFiltradas].sort(
      (a, b) => Number(Boolean(bloqueosPorFactura[Number(a.idFactura)])) - Number(Boolean(bloqueosPorFactura[Number(b.idFactura)]))
    );
    const totalBloqueadas = ordenadas.filter((f) => bloqueosPorFactura[Number(f.idFactura)]).length;
    const totalDisponibles = ordenadas.length - totalBloqueadas;

    return (
      <div className="space-y-4 p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-[1fr_1fr_9.5rem_9.5rem]">
          <div>
            <label htmlFor="filtro-numero" className={labelClass}>N° factura</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
              <input
                id="filtro-numero"
                type="text"
                value={filtroNumero}
                onChange={(e) => setFiltroNumero(e.target.value)}
                placeholder="Buscar número…"
                autoComplete="off"
                className={`${fieldClass} pl-9`}
              />
            </div>
          </div>
          <div>
            <label htmlFor="filtro-proveedor" className={labelClass}>Proveedor</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
              <input
                id="filtro-proveedor"
                type="text"
                value={filtroProveedor}
                onChange={(e) => setFiltroProveedor(e.target.value)}
                placeholder="Buscar proveedor…"
                autoComplete="off"
                className={`${fieldClass} pl-9`}
              />
            </div>
          </div>
          <div>
            <label htmlFor="filtro-desde" className={labelClass}>Desde</label>
            <input
              id="filtro-desde"
              type="date"
              value={filtroFechaDesde}
              onChange={(e) => setFiltroFechaDesde(e.target.value)}
              className={`${fieldClass} [color-scheme:dark]`}
            />
          </div>
          <div>
            <label htmlFor="filtro-hasta" className={labelClass}>Hasta</label>
            <input
              id="filtro-hasta"
              type="date"
              value={filtroFechaHasta}
              onChange={(e) => setFiltroFechaHasta(e.target.value)}
              className={`${fieldClass} [color-scheme:dark]`}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 text-xs">
          <p className="text-[#5a5a6e]">
            {loadingFacturas ? "Cargando facturas…" : ""}
          </p>
          {hayFiltros && (
            <button type="button" onClick={limpiarFiltros} className="flex items-center gap-1 text-[#22c55e] transition-colors hover:text-green-400">
              <X className="h-3.5 w-3.5" /> Limpiar filtros
            </button>
          )}
        </div>

        <div className="overflow-hidden rounded-lg border border-[#1e1e24]">
          <div className="max-h-[45vh] overflow-y-auto [color-scheme:dark] [scrollbar-color:#2a2a32_transparent] [scrollbar-width:thin]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-[#111114]">
                <tr className="border-b border-[#1e1e24] bg-white/[0.02] text-left text-[11px] uppercase tracking-[0.14em] text-white/40">
                  <th className="w-[24%] px-4 py-2.5 font-medium">N° factura</th>
                  <th className="w-[13%] px-4 py-2.5 font-medium">Fecha</th>
                  <th className="w-[22%] px-4 py-2.5 font-medium">Estado</th>
                  <th className="px-4 py-2.5 font-medium">Proveedor</th>
                  <th className="px-4 py-2.5 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {loadingFacturas && (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-[#1e1e24] last:border-0">
                      {Array.from({ length: 5 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
                        </td>
                      ))}
                    </tr>
                  ))
                )}

                {!loadingFacturas && ordenadas.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-white/30">
                      {facturas.length === 0
                        ? "No hay facturas de compra registradas."
                        : "No se encontraron facturas con esos filtros."}
                    </td>
                  </tr>
                )}

                {!loadingFacturas && ordenadas.map((f) => {
                  const seleccionada = facturaSel?.idFactura === f.idFactura;
                  const bloqueo = bloqueosPorFactura[Number(f.idFactura)];
                  const bloqueada = Boolean(bloqueo);
                  const textoClase = bloqueada ? "text-white/35" : "text-white/70";
                  return (
                    <tr
                      key={f.idFactura}
                      role={bloqueada ? undefined : "button"}
                      tabIndex={bloqueada ? -1 : 0}
                      aria-selected={seleccionada}
                      aria-disabled={bloqueada || undefined}
                      onClick={bloqueada ? undefined : () => handleSeleccionarFactura(f)}
                      onKeyDown={bloqueada ? undefined : (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSeleccionarFactura(f); } }}
                      className={`border-b border-[#1e1e24] border-l-2 transition-colors last:border-b-0 focus:outline-none focus-visible:bg-white/[0.06] ${
                        bloqueada
                          ? "cursor-not-allowed border-l-transparent"
                          : seleccionada
                            ? "cursor-pointer border-l-[#22c55e] bg-[#22c55e]/[0.08]"
                            : "cursor-pointer border-l-transparent hover:bg-white/[0.04]"
                      }`}
                    >
                      <td className={`px-4 py-3 align-top font-medium tabular-nums ${bloqueada ? "text-white/45" : "text-white"}`}>
                        <span className="flex items-center gap-1.5">
                          {f.numeroFactura}
                          {seleccionada && <CheckCircle className="h-3.5 w-3.5 text-[#22c55e]" aria-hidden />}
                        </span>
                      </td>
                      <td className={`whitespace-nowrap px-4 py-3 align-top ${textoClase}`}>{fmtFecha(f.fechaEmision)}</td>
                      <td className="px-4 py-3 align-top">
                        <EstadoFacturaBadge
                          estado={bloqueada ? bloqueo.estado : f.estado}
                          bloqueada={bloqueada}
                          motivo={bloqueo?.motivo}
                        />
                      </td>
                      <td className={`px-4 py-3 align-top ${textoClase}`}>{f.nombreProveedor}</td>
                      <td className={`whitespace-nowrap px-4 py-3 text-right align-top tabular-nums ${bloqueada ? "text-white/45" : "text-white"}`}>{fmtMoneda(f.totalGeneral)}</td>
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
        {tipo === "ANULACION" && facturaSel && !cargandoDetalle && avisosAnulacion.length > 0 && (
          <ul className="space-y-1 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-300">
            {avisosAnulacion.map((a) => (
              <li key={a} className="flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {a}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

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
            {avisosAnulacion.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-red-300">
                {avisosAnulacion.map((a) => (
                  <li key={a} className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {a}
                  </li>
                ))}
              </ul>
            )}
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
                  <th className="px-2 py-2.5 text-center font-medium">Stock</th>
                  <th className="w-32 px-2 py-2.5 text-center font-medium">{tipo === "DEVOLUCION" ? "Devolver" : "Intercambiar"}</th>
                  <th className="px-2 py-2.5 text-right font-medium">Importe</th>
                </tr>
              </thead>
              <tbody>
                {facturaDetalle.detalles?.map((d) => {
                  const cant = cantidades[d.idProducto] || 0;
                  const max = limitesCantidad(d, tipo);
                  const activo = cant > 0;
                  const stock = d?.stockActual !== undefined && d?.stockActual !== null
                    ? Number(d.stockActual)
                    : null;
                  const sinStock = stock !== null && stock <= 0;
                  const stockLimita = stock !== null && max < maxPorFactura(d, tipo);
                  return (
                    <tr key={d.idProducto} className={`border-b border-[#1e1e24] last:border-0 transition-colors ${activo ? "bg-[#22c55e]/[0.04]" : "hover:bg-white/[0.03]"}`}>
                      <td className="px-4 py-2.5 text-white">{d.nombreProducto}</td>
                      <td className="px-2 py-2.5 text-center tabular-nums text-white/60">{d.cantidad}</td>
                      <td className={`px-2 py-2.5 text-center tabular-nums ${sinStock ? "text-red-400/80" : stockLimita ? "text-amber-400/80" : "text-white/60"}`}
                        title={stockLimita ? `Stock insuficiente: máximo ${max}` : undefined}>
                        {stock === null ? "—" : stock}
                      </td>
                      <td className="px-2 py-2.5">
                        <div className="mx-auto flex w-28 items-center gap-1">
                          <CantidadInput
                            unidadMedida={esKG({ unidadMedida: unidadesById[Number(d.idProducto)] }) ? "KG" : "UN"}
                            value={cant}
                            onChange={(v) => handleCambiarCantidad(d.idProducto, v)}
                            permitirCero
                            max={max}
                            maxDecimales={3}
                            ariaLabel={`Cantidad a ${tipo === "DEVOLUCION" ? "devolver" : "intercambiar"} de ${d.nombreProducto}`}
                          />
                          <button
                            type="button"
                            onClick={() => handleCambiarCantidad(d.idProducto, max)}
                            disabled={max <= 0}
                            title={max > 0 ? `Usar máximo permitido (${max})` : "No hay stock disponible"}
                            className="shrink-0 rounded-md border border-[#2a2a32] px-1.5 py-1.5 text-[10px] text-white/40 transition-colors hover:border-[#22c55e]/40 hover:text-[#22c55e] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-[#2a2a32] disabled:hover:text-white/40"
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

        <div className="flex flex-wrap items-end gap-4 border-t border-[#1e1e24] pt-3">
          <div className="min-w-[14rem] flex-1">
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
          <p className="whitespace-nowrap pb-2 text-sm text-white">
            Total {tipo === "DEVOLUCION" ? "a devolver" : "a intercambiar"}:{" "}
            <span className="text-lg font-bold tabular-nums text-[#22c55e]">{fmtMoneda(totalOperacion)}</span>
          </p>
        </div>
      </div>
    );
  };

  const tituloDetalle = tipo === "ANULACION"
    ? "Confirmar anulación"
    : tipo === "DEVOLUCION"
      ? "Productos a devolver"
      : "Productos a intercambiar";

  const subtituloDetalle = tipo === "ANULACION"
    ? "Revisá y confirmá la anulación de la factura."
    : tipo === "DEVOLUCION"
      ? "Indicá las cantidades a devolver."
      : "Indicá las cantidades a intercambiar.";

  return (
    <>
      {/* Capa 1: selector de factura */}
      {createPortal(
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
                <p className="mt-0.5 text-xs text-[#7a7a8c]">Seleccioná la factura de compra.</p>
              </div>
              <button type="button" onClick={onCerrar} aria-label="Cerrar"
                className="rounded p-1 text-[#5a5a6e] transition-colors hover:bg-white/5 hover:text-[#e1e1eb]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">{renderPasoFactura()}</div>
          </div>
        </div>,
        document.body
      )}

      {/* Capa 2: detalle de la factura, superpuesto al selector */}
      {verDetalle && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setVerDetalle(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={tituloDetalle}
            className={`${modalShell} max-w-4xl max-h-[90vh]`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#1e1e24] px-5 py-3.5">
              <div>
                <h2 className="text-sm font-semibold text-[#f1f1f3]">{tituloDetalle}</h2>
                <p className="mt-0.5 text-xs text-[#7a7a8c]">{subtituloDetalle}</p>
              </div>
              <button type="button" onClick={() => setVerDetalle(false)} aria-label="Cerrar"
                className="rounded p-1 text-[#5a5a6e] transition-colors hover:bg-white/5 hover:text-[#e1e1eb]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">{renderPasoDetalle()}</div>

            <div className="flex items-center justify-between gap-3 border-t border-[#1e1e24] px-5 py-3.5">
              <div className="flex flex-1 items-start gap-2 text-xs">
                {esDevolucionTotal ? (
                  <p className="flex items-center gap-1.5 text-amber-400" role="alert">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    Estás devuyendo el total de la factura. Para eso usá la sección
                    <span className="font-semibold"> Anular factura</span>.
                  </p>
                ) : (
                  <p className="text-white/40">
                    {tipo === "INTERCAMBIO" && !puedeRegistrar
                      ? "Seleccioná al menos un producto a intercambiar."
                      : tipo === "DEVOLUCION" && !puedeRegistrar
                        ? "Seleccioná al menos un producto a devolver."
                        : ""}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setVerDetalle(false)}
                  className="flex items-center gap-1 rounded-lg border border-[#2a2a32] bg-[#0d0d0f] px-4 py-2.5 text-sm text-[#9a9aac] transition-colors hover:text-[#e1e1eb]"
                >
                  <ChevronLeft className="h-4 w-4" /> Volver
                </button>
                <button
                  type="button"
                  onClick={handleRegistrar}
                  disabled={!puedeRegistrar}
                  className="flex items-center gap-2 rounded-lg bg-[#22c55e] px-6 py-2.5 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Save className="h-4 w-4" /> {tipo === "ANULACION" ? "Anular" : "Registrar"}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
