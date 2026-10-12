import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  Plus, X, ArrowLeft, ArrowLeftRight, Eye, CheckCircle,
  AlertTriangle, Search,
} from "lucide-react";
import {
  crearIntercambioVenta, getIntercambiosVenta, apiErrorMessage,
} from "../../../api/ventasDevolucionesApi";
import { getFacturasVenta } from "../../../api/facturasVentaApi";
import { getProductos } from "../../../api/productosApi";
import CantidadInput from "../../../components/ui/CantidadInput";
import { esProductoPesable } from "../registro-venta/utils";

/* ───────────── Utilidades y estilos ───────────── */

const MOTIVOS = [
  { valor: "DEFECTUOSO", etiqueta: "Producto defectuoso" },
  { valor: "MERMA", etiqueta: "Merma o deterioro" },
  { valor: "OTROS", etiqueta: "Otro motivo" },
];

const etiquetaMotivo = (m) => (MOTIVOS.find((x) => x.valor === m)?.etiqueta || m || "—");
const claveMotivo = (m) => String(m || "").toUpperCase().trim();

function motivoBadge(m) {
  const k = claveMotivo(m);
  const cls =
    k === "DEFECTUOSO" ? "bg-rose-500/15 text-rose-400"
    : k === "MERMA" ? "bg-amber-500/15 text-amber-400"
    : k === "OTROS" ? "bg-sky-500/15 text-sky-400"
    : "bg-white/10 text-white/70";
  return (
    <span className={`inline-flex whitespace-nowrap rounded-none px-2 py-0.5 text-xs font-medium ${cls}`}>
      {etiquetaMotivo(m)}
    </span>
  );
}

function fmtMoneda(n) {
  return new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", minimumFractionDigits: 0 }).format(n ?? 0);
}

function fmtFechaHora(valor) {
  if (!valor) return "—";
  const s = String(valor);
  // Una fecha sin hora (yyyy-MM-dd) debe interpretarse como LOCAL: `new Date("2026-10-11")`
  // la toma como UTC y en zonas al oeste (p. ej. America/Asuncion) resta un día.
  const soloFecha = /^\d{4}-\d{2}-\d{2}$/.test(s);
  const d = soloFecha ? new Date(`${s}T00:00:00`) : new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  if (soloFecha) {
    return d.toLocaleDateString("es-PY", { day: "2-digit", month: "2-digit", year: "numeric" });
  }
  return d.toLocaleString("es-PY", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtCant(n, um) {
  const c = Number(n) || 0;
  return `${c} ${um === "KG" ? "kg" : "u."}`;
}

const labelClass = "block text-xs text-white/50 mb-1";

const fieldClass =
  "w-full rounded-none border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white " +
  "placeholder:text-white/30 outline-none transition focus:border-[#22c55e]/60 focus:ring-2 focus:ring-[#22c55e]/15 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const iconBtn = "flex h-8 w-8 items-center justify-center rounded-none transition-colors";

const modalShell = "w-full rounded-none border border-white/10 bg-[#0c0c0e] shadow-2xl flex flex-col";

const esAnulada = (f) => {
  const raw = String(f?.estado || "").toUpperCase();
  return raw === "ANULADO" || raw === "ANULADA" || raw === "CANCELADA" || f?.activo === false;
};

function useEscape(onCerrar) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onCerrar(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCerrar]);
}

/* ───────────── Página ───────────── */

export default function IntercambioVentas() {
  const [intercambios, setIntercambios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [detalleSel, setDetalleSel] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getIntercambiosVenta({ pageSize: 1000, sortDir: "DESC" });
      setIntercambios(Array.isArray(res.content) ? res.content : []);
    } catch (err) {
      console.error("Error al cargar intercambios:", err);
      setError(apiErrorMessage(err) || "No se pudieron cargar los intercambios.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const handleCreado = (resp) => {
    setShowModal(false);
    setAviso(`Intercambio registrado (${resp?.cantidadItems ?? 0} ítem(s)).`);
    cargar();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link to="/ventas/devoluciones" className="rounded-none p-2 text-white/50 transition-colors hover:bg-white/10" aria-label="Volver">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 space-y-0.5">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Intercambio</h1>
        </div>
        <button
          type="button"
          onClick={() => { setAviso(null); setShowModal(true); }}
          className="flex items-center gap-2 whitespace-nowrap rounded-none bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-black transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]/50"
        >
          <Plus className="h-4 w-4" />
          Nuevo intercambio
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-none border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertTriangle className="h-5 w-5 shrink-0" /> {error}
        </div>
      )}
      {aviso && (
        <div className="flex items-center gap-2 rounded-none border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          <CheckCircle className="h-5 w-5 shrink-0" /> {aviso}
        </div>
      )}

      <div className="overflow-hidden border border-white/10 bg-[#0c0c0e] shadow-lg shadow-black/20">
        {loading ? (
          <div className="grid grid-cols-5 gap-4 px-4 py-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-4 bg-white/10 rounded animate-pulse" />
            ))}
          </div>
        ) : intercambios.length === 0 ? (
          <div className="space-y-2 px-4 py-14 text-center">
            <ArrowLeftRight className="mx-auto h-10 w-10 text-white/15" />
            <p className="text-sm text-white/50">Aún no hay intercambios registrados</p>
            <p className="text-xs text-white/40">Empezá con “Nuevo intercambio”.</p>
          </div>
        ) : (
          <div className="overflow-x-auto [color-scheme:dark]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-emerald-500/10 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Motivo</th>
                  <th className="px-4 py-3 text-right font-medium">Ítems</th>
                  <th className="px-4 py-3 font-medium w-12" aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {intercambios.map((it) => (
                  <tr key={it.idIntercambioVenta} className="border-b border-white/10 last:border-0 transition hover:bg-white/[0.04]">
                    <td className="whitespace-nowrap px-4 py-3 text-white/60">{fmtFechaHora(it.fechaCreacion)}</td>
                    <td className="px-4 py-3 text-white/70">
                      {it.nombreCliente || (it.idCliente ? "—" : "Sin Nombre")}
                    </td>
                    <td className="px-4 py-3">{motivoBadge(it.motivo)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-white/80">
                      {it.cantidadItems ?? (Array.isArray(it.detalles) ? it.detalles.length : 0)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setDetalleSel(it)}
                          title="Ver detalle del intercambio"
                          aria-label="Ver detalle del intercambio"
                          className={`${iconBtn} text-white/40 hover:bg-sky-500/10 hover:text-sky-400`}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <NuevoIntercambioModal
          onCerrar={() => setShowModal(false)}
          onCreado={handleCreado}
        />
      )}

      {detalleSel && (
        <DetalleIntercambioModal
          intercambio={detalleSel}
          onCerrar={() => setDetalleSel(null)}
        />
      )}
    </div>
  );
}

/* ───────────── Wizard: elegir factura → cantidades a intercambiar ───────────── */

function NuevoIntercambioModal({ onCerrar, onCreado }) {
  const [consulta, setConsulta] = useState("");
  const [facturas, setFacturas] = useState([]);
  const [cargandoFacturas, setCargandoFacturas] = useState(false);
  const [errorFacturas, setErrorFacturas] = useState(null);
  const [productoCatalog, setProductoCatalog] = useState([]);
  const [facturaSel, setFacturaSel] = useState(null);
  const [filas, setFilas] = useState([]);
  const [motivo, setMotivo] = useState("DEFECTUOSO");
  const [observaciones, setObservaciones] = useState("");
  const [registrando, setRegistrando] = useState(false);
  const [errorOperacion, setErrorOperacion] = useState(null);
  const [errorFormulario, setErrorFormulario] = useState(null);

  const pasoDetalle = Boolean(facturaSel);

  useEscape(useCallback(() => {
    if (pasoDetalle) {
      setFacturaSel(null);
      setErrorFormulario(null);
    } else {
      onCerrar();
    }
  }, [pasoDetalle, onCerrar]));

  // Catálogo de productos solo para conocer la unidad de medida (kg ⇄ unidad).
  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const res = await getProductos({ page: 0, pageSize: 500, sortDir: "ASC" });
        if (activo) setProductoCatalog(Array.isArray(res.content) ? res.content : []);
      } catch { /* si no carga, las cantidades se tratan como unidad */ }
    })();
    return () => { activo = false; };
  }, []);

  // Lista de facturas de venta (todas las vigentes; búsqueda en cliente).
  useEffect(() => {
    let activo = true;
    setCargandoFacturas(true);
    setErrorFacturas(null);
    (async () => {
      try {
        const res = await getFacturasVenta({ page: 0, pageSize: 1000, sortDir: "DESC" });
        if (!activo) return;
        const todas = Array.isArray(res.content) ? res.content : [];
        const q = consulta.trim().toLowerCase();
        const filtradas = todas.filter((f) => !esAnulada(f) && (!q
          || `${f.numeroFactura || ""} ${f.nombreCliente || ""}`.toLowerCase().includes(q)));
        setFacturas(filtradas);
      } catch (err) {
        if (!activo) return;
        setErrorFacturas(apiErrorMessage(err) || "No se pudieron cargar las facturas.");
      } finally {
        if (activo) setCargandoFacturas(false);
      }
    })();
    return () => { activo = false; };
  }, [consulta]);

  const productoMap = useMemo(
    () => new Map(productoCatalog.map((p) => [Number(p.id), p])),
    [productoCatalog]
  );

  const elegirFactura = (f) => {
    const detalles = Array.isArray(f.detalles) ? f.detalles : [];
    setFilas(detalles.map((d, i) => {
      const prod = productoMap.get(Number(d.idProducto));
      const unidad = esProductoPesable(prod) ? "KG" : "UN";
      return {
        key: `${d.idDetalle ?? d.idProducto ?? i}-${i}`,
        idProducto: d.idProducto,
        nombre: d.nombreProducto || `Producto #${d.idProducto}`,
        cantidadTicket: Number(d.cantidad) || 0,
        cantidadCambio: "",
        unidad,
      };
    }));
    setObservaciones("");
    setFacturaSel(f);
    setErrorFormulario(null);
  };

  const setFilaCantidad = (key, valor) => {
    setFilas((prev) => prev.map((fl) => (fl.key === key ? { ...fl, cantidadCambio: valor } : fl)));
  };

  const puedeRegistrar = motivo && !registrando;

  const handleRegistrar = async () => {
    if (!puedeRegistrar) return;

    const completas = filas
      .map((fl) => ({ fila: fl, n: Number(fl.cantidadCambio) }))
      .filter((c) => Number.isFinite(c.n) && c.n > 0);

    if (completas.length === 0) {
      setErrorFormulario("Indicá la cantidad a intercambiar de al menos un producto.");
      return;
    }
    const exceden = completas.find((c) => c.n > c.fila.cantidadTicket);
    if (exceden) {
      setErrorFormulario(`La cantidad de “${exceden.fila.nombre}” no puede superar la del ticket (${exceden.fila.cantidadTicket}).`);
      return;
    }

    setErrorFormulario(null);
    setErrorOperacion(null);
    setRegistrando(true);
    try {
      const resp = await crearIntercambioVenta({
        idCliente: facturaSel?.idCliente ? Number(facturaSel.idCliente) : undefined,
        motivo: claveMotivo(motivo),
        observaciones: String(observaciones || "").trim() || undefined,
        detalles: completas.map((c) => ({
          idProductoDefectuoso: c.fila.idProducto,
          idProductoReemplazo: c.fila.idProducto,
          cantidad: c.n,
        })),
      });
      onCreado(resp);
    } catch (err) {
      console.error("Error al registrar intercambio:", err);
      setErrorOperacion(err?.message || apiErrorMessage(err));
      setRegistrando(false);
    }
  };

  /* ── Capa 1: elegir el ticket ── */
  const renderElegirTicket = () => (
    <div className="space-y-4 p-5">
      <div>
        <label htmlFor="buscar-ticket-intercambio" className={labelClass}>
          Buscar ticket
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            id="buscar-ticket-intercambio"
            type="text"
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            placeholder="N° de factura o cliente…"
            autoComplete="off"
            autoFocus
            className={`${fieldClass} pl-9`}
          />
        </div>
        <p className="mt-1 text-xs text-white/40">
          Mostrá todas las facturas de venta. Elegí el ticket con la mercadería a intercambiar.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 text-xs">
        <p className="text-white/40">
          {cargandoFacturas ? "Cargando…" : `${facturas.length} ticket(s)`}
        </p>
      </div>

      {errorFacturas && (
        <div className="flex items-center gap-2 rounded-none border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertTriangle className="h-5 w-5 shrink-0" /> {errorFacturas}
        </div>
      )}

      <div className="overflow-hidden border border-white/10 bg-[#0c0c0e]">
        <div className="max-h-[45vh] overflow-y-auto [color-scheme:dark] [scrollbar-color:#2a2a32_transparent] [scrollbar-width:thin]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-[#0c0c0e]">
              <tr className="border-b border-white/10 bg-emerald-500/10 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
                <th className="whitespace-nowrap px-4 py-3 font-medium">Ticket</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="whitespace-nowrap px-4 py-3 text-right font-medium">Total factura</th>
              </tr>
            </thead>
            <tbody>
              {!cargandoFacturas && facturas.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-white/30">
                    No hay tickets con esa búsqueda.
                  </td>
                </tr>
              )}
              {facturas.map((f) => (
                <tr
                  key={f.idFacturaVenta}
                  role="button"
                  tabIndex={0}
                  onClick={() => elegirFactura(f)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); elegirFactura(f); } }}
                  className="cursor-pointer border-b border-white/10 border-l-2 border-l-transparent transition-colors last:border-b-0 focus:outline-none focus-visible:bg-white/[0.06] hover:border-l-[#22c55e] hover:bg-white/[0.04]"
                >
                  <td className="whitespace-nowrap px-4 py-3 font-medium tabular-nums text-white">{f.numeroFactura || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-white/60">{fmtFechaHora(f.fechaEmision || f.fechaCreacion)}</td>
                  <td className="px-4 py-3 text-white/70">{f.nombreCliente || "Sin Nombre"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-white">{fmtMoneda(f.totalGeneral)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  /* ── Capa 2: resumen del ticket + cantidades a intercambiar ── */
  const renderDetalle = () => (
    <div className="space-y-4 p-5">
      <div className="overflow-hidden border border-white/10 bg-[#0c0c0e]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-emerald-500/10 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
              <th className="px-4 py-2.5 font-medium">Producto</th>
              <th className="px-4 py-2.5 text-right font-medium">Cantidad del ticket</th>
              <th className="px-4 py-2.5 text-right font-medium">Cant. a intercambiar</th>
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-white/30">El ticket no tiene productos.</td></tr>
            )}
            {filas.map((fl) => (
              <tr key={fl.key} className="border-b border-white/10 last:border-0">
                <td className="px-4 py-2.5 font-medium text-white">{fl.nombre}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-white/70">
                  {fmtCant(fl.cantidadTicket, fl.unidad)}
                </td>
                <td className="px-4 py-2.5">
                  <div className="ml-auto w-32">
                    <CantidadInput
                      ariaLabel={`Cantidad a intercambiar de ${fl.nombre}`}
                      unidadMedida={fl.unidad}
                      value={fl.cantidadCambio}
                      onChange={(v) => setFilaCantidad(fl.key, v)}
                      max={fl.cantidadTicket}
                      placeholder="0"
                      className="w-full"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
        <div>
          <label htmlFor="motivo-intercambio" className={labelClass}>
            Motivo
          </label>
          <select
            id="motivo-intercambio"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className={fieldClass}
          >
            {MOTIVOS.map((m) => (
              <option key={m.valor} value={m.valor}>{m.etiqueta}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="observaciones-intercambio" className={labelClass}>
            Observaciones (opcional)
          </label>
          <input
            id="observaciones-intercambio"
            type="text"
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            maxLength={500}
            autoComplete="off"
            placeholder="Detalle del motivo…"
            className={fieldClass}
          />
        </div>
      </div>

      {errorFormulario && (
        <div className="flex items-center gap-2 rounded-none border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertTriangle className="h-5 w-5 shrink-0" /> {errorFormulario}
        </div>
      )}
      {errorOperacion && (
        <div className="flex items-center gap-2 rounded-none border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertTriangle className="h-5 w-5 shrink-0" /> {errorOperacion}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Capa 1: elegir ticket */}
      {createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onCerrar}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Nuevo intercambio"
            className={`${modalShell} max-w-3xl max-h-[90vh]`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <ArrowLeftRight className="h-4 w-4 text-[var(--accent)]" />
                  Nuevo intercambio
                </h2>
                <p className="mt-0.5 text-xs text-white/50">Elegí el ticket (factura) a intercambiar.</p>
              </div>
              <button type="button" onClick={onCerrar} aria-label="Cerrar"
                className="rounded p-1 text-white/40 transition-colors hover:bg-white/5 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">{renderElegirTicket()}</div>
          </div>
        </div>,
        document.body
      )}

      {/* Capa 2: cantidades a intercambiar */}
      {pasoDetalle && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setFacturaSel(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Intercambiar productos del ticket"
            className={`${modalShell} max-w-4xl max-h-[90vh]`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <ArrowLeftRight className="h-4 w-4 text-[var(--accent)]" />
                  Intercambiar — factura {facturaSel?.numeroFactura || "—"}
                </h2>
                <p className="mt-0.5 text-xs text-white/50">
                  {facturaSel?.nombreCliente || "Sin Nombre"} · {fmtFechaHora(facturaSel?.fechaEmision || facturaSel?.fechaCreacion)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setFacturaSel(null); setErrorFormulario(null); }}
                aria-label="Volver a elegir ticket"
                className="rounded p-1 text-white/40 transition-colors hover:bg-white/5 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto [color-scheme:dark] [scrollbar-color:#2a2a32_transparent] [scrollbar-width:thin]">
              {renderDetalle()}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-white/10 px-5 py-3.5">
              <div className="flex-1" />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setFacturaSel(null); setErrorFormulario(null); }}
                  className="flex items-center gap-1 rounded-none border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70 transition-colors hover:text-white"
                >
                  Volver
                </button>
                <button
                  type="button"
                  onClick={handleRegistrar}
                  disabled={!puedeRegistrar}
                  className="flex items-center gap-2 rounded-none bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <CheckCircle className="h-4 w-4" />
                  {registrando ? "Registrando…" : "Confirmar intercambio"}
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

/* ───────────── Detalle de un intercambio ───────────── */

function DetalleIntercambioModal({ intercambio, onCerrar }) {
  useEscape(onCerrar);

  const detalles = Array.isArray(intercambio.detalles) ? intercambio.detalles : [];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Detalle del intercambio"
        className={`${modalShell} max-w-3xl max-h-[90vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
              <ArrowLeftRight className="h-4 w-4 text-[var(--accent)]" />
              Intercambio
            </h2>
            <p className="mt-0.5 text-xs text-white/50">
              {fmtFechaHora(intercambio.fechaCreacion)} · {intercambio.nombreCliente || "Sin Nombre"}
            </p>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar"
            className="rounded p-1 text-white/40 transition-colors hover:bg-white/5 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5 [color-scheme:dark] [scrollbar-color:#2a2a32_transparent] [scrollbar-width:thin]">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <p className="text-[11px] uppercase tracking-[0.12em] text-white/40">Motivo</p>
            {motivoBadge(intercambio.motivo)}
            {intercambio.observaciones && (
              <p className="w-full text-xs text-white/50">{intercambio.observaciones}</p>
            )}
          </div>

          <div className="overflow-hidden border border-white/10 bg-[#0c0c0e]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
                  <th className="px-4 py-2.5 font-medium">Devuelto (defectuoso)</th>
                  <th className="px-4 py-2.5 font-medium">Entregado (reemplazo)</th>
                  <th className="px-4 py-2.5 text-right font-medium">Cant.</th>
                  <th className="px-4 py-2.5 text-right font-medium">Precio unit.</th>
                </tr>
              </thead>
              <tbody>
                {detalles.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-white/30">Sin detalles.</td></tr>
                )}
                {detalles.map((d) => (
                  <tr key={d.idDetalle ?? `${d.idProductoReemplazo}-${d.nombreProductoReemplazo}`} className="border-b border-white/10 last:border-0">
                    <td className="px-4 py-3 text-white/70">
                      <span className={d.nombreProductoDefectuoso ? "" : "italic text-white/30"}>
                        {d.nombreProductoDefectuoso || "Sin producto defectuoso"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-white">{d.nombreProductoReemplazo || `Producto #${d.idProductoReemplazo}`}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-white/80">{Number(d.cantidad)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-white/80">{fmtMoneda(d.precioUnitario)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end border-t border-white/10 px-5 py-3.5">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-none border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70 transition-colors hover:text-white"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}