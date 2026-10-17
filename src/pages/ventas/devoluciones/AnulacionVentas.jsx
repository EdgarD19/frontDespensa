import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  Plus, X, AlertTriangle, CheckCircle, ArrowLeft,
  Ban, Eye, Search, ShieldAlert,
} from "lucide-react";
import {
  anularFacturaVenta, getAnulacionesVenta, apiErrorMessage,
} from "../../../api/ventasDevolucionesApi";
import { getFacturasVenta, buscarFacturasVenta, getFacturaVentaById } from "../../../api/facturasVentaApi";
import Pagination from "../../../components/ui/Pagination";

/* ───────────── Utilidades y estilos ───────────── */

function fmtMoneda(n) {
  return new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", minimumFractionDigits: 0 }).format(n ?? 0);
}

function fmtCantidad(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString("es-PY", { maximumFractionDigits: 3 });
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

const labelClass = "block text-xs text-white/50 mb-1";

const fieldClass =
  "w-full rounded-none border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white " +
  "placeholder:text-white/30 outline-none transition focus:border-[#22c55e]/60 focus:ring-2 focus:ring-[#22c55e]/15 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const iconBtn = "flex h-8 w-8 items-center justify-center rounded-none transition-colors";

const PAGE_SIZE = 10;

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

export default function AnulacionVentas() {
  const [anulaciones, setAnulaciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [detalleSel, setDetalleSel] = useState(null);
  const [texto, setTexto] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [page, setPage] = useState(0);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAnulacionesVenta({ pageSize: 1000, sortDir: "DESC" });
      setAnulaciones(Array.isArray(res.content) ? res.content : []);
    } catch (err) {
      console.error("Error al cargar anulaciones:", err);
      setError(apiErrorMessage(err) || "No se pudieron cargar las anulaciones.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const anulacionesFiltradas = useMemo(() => {
    const q = texto.trim().toLowerCase();
    const desdeTs = desde ? new Date(`${desde}T00:00:00`).getTime() : null;
    const hastaTs = hasta ? new Date(`${hasta}T23:59:59.999`).getTime() : null;
    return anulaciones.filter((an) => {
      if (q) {
        const coincide =
          String(an.clienteNombre || "").toLowerCase().includes(q) ||
          String(an.numeroFactura || "").toLowerCase().includes(q);
        if (!coincide) return false;
      }
      const ts = new Date(an.fechaAnulacion).getTime();
      if (Number.isNaN(ts)) return false;
      if (desdeTs != null && ts < desdeTs) return false;
      if (hastaTs != null && ts > hastaTs) return false;
      return true;
    });
  }, [anulaciones, texto, desde, hasta]);

  useEffect(() => { setPage(0); }, [texto, desde, hasta]);

  const totalPaginas = Math.max(1, Math.ceil(anulacionesFiltradas.length / PAGE_SIZE));
  const paginaActual = Math.min(page, Math.max(0, totalPaginas - 1));
  const anulacionesPagina = anulacionesFiltradas.slice(
    paginaActual * PAGE_SIZE,
    paginaActual * PAGE_SIZE + PAGE_SIZE
  );

  const handleAnulada = (resp, factura) => {
    setShowModal(false);
    setAviso(
      `Factura ${resp?.numeroFactura || factura?.numeroFactura || "—"} anulada · ${fmtMoneda(resp?.totalGeneral ?? factura?.totalGeneral)}`
    );
    cargar();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link to="/ventas" className="rounded-none p-2 text-white/50 transition-colors hover:bg-white/10" aria-label="Volver">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 space-y-0.5">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Anulación</h1>
        </div>
        <button
          type="button"
          onClick={() => { setAviso(null); setShowModal(true); }}
          className="flex items-center gap-2 whitespace-nowrap rounded-none bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-black transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]/50"
        >
          <Plus className="h-4 w-4" />
          Nueva anulación
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

      {/* Filtros */}
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
        <div className="relative min-w-[200px] flex-1">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Buscar por cliente o N° factura"
            aria-label="Buscar por cliente o número de factura"
            className="w-full rounded-none border border-white/10 bg-white/5 py-2 pl-9 pr-10 text-sm text-white placeholder:text-white/30 transition-colors focus:border-[var(--accent)] focus:outline-none"
          />
          {texto && (
            <button
              type="button"
              onClick={() => setTexto("")}
              title="Limpiar búsqueda"
              aria-label="Limpiar búsqueda"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X size={15} />
            </button>
          )}
        </div>
        <div className="w-full sm:w-44">
          <label className="text-[0.625rem] font-medium uppercase tracking-[0.12em] text-white/40" htmlFor="anulacion-desde">
            Desde
          </label>
          <input
            id="anulacion-desde"
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="mt-1 w-full rounded-none border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[var(--accent)]"
          />
        </div>
        <div className="w-full sm:w-44">
          <label className="text-[0.625rem] font-medium uppercase tracking-[0.12em] text-white/40" htmlFor="anulacion-hasta">
            Hasta
          </label>
          <input
            id="anulacion-hasta"
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="mt-1 w-full rounded-none border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[var(--accent)]"
          />
        </div>
        {(texto || desde || hasta) && (
          <button
            type="button"
            onClick={() => { setTexto(""); setDesde(""); setHasta(""); }}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-none border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/70 transition-colors hover:text-white"
          >
            <X size={14} /> Limpiar
          </button>
        )}
      </div>

      <div className="overflow-hidden border border-white/10 bg-[#0c0c0e] shadow-lg shadow-black/20">
        {loading ? (
          <div className="grid grid-cols-6 gap-4 px-4 py-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-4 bg-white/10 rounded animate-pulse" />
            ))}
          </div>
        ) : anulacionesFiltradas.length === 0 ? (
          <div className="space-y-2 px-4 py-14 text-center">
            <Ban className="mx-auto h-10 w-10 text-white/15" />
            {anulaciones.length === 0 ? (
              <>
                <p className="text-sm text-white/50">Aún no hay anulaciones registradas</p>
                <p className="text-xs text-white/40">Empezá con “Nueva anulación”.</p>
              </>
            ) : (
              <>
                <p className="text-sm text-white/50">No se encontraron anulaciones con esos filtros</p>
                <p className="text-xs text-white/40">Probá con otro cliente, N° factura o rango de fechas.</p>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto [color-scheme:dark]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-emerald-500/10 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">N° Factura</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Motivo</th>
                  <th className="px-4 py-3 font-medium w-12" aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {anulacionesPagina.map((an) => (
                  <tr key={an.idAnulacion} className="border-b border-white/10 last:border-0 transition hover:bg-white/[0.04]">
                    <td className="whitespace-nowrap px-4 py-3 text-white/60">{fmtFechaHora(an.fechaAnulacion)}</td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-white">{an.numeroFactura || "—"}</td>
                    <td className="px-4 py-3 text-white/70">{an.clienteNombre || "Sin Nombre"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-white">{fmtMoneda(an.totalGeneral)}</td>
                    <td className="px-4 py-3 text-white/60">{an.motivo || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setDetalleSel(an)}
                          title="Ver detalle de la anulación"
                          aria-label="Ver detalle de la anulación"
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

      {!loading && anulacionesFiltradas.length > 0 && (
        <Pagination
          page={paginaActual}
          totalPages={totalPaginas}
          onPageChange={setPage}
          pageSize={PAGE_SIZE}
          totalItems={anulacionesFiltradas.length}
        />
      )}

      {showModal && (
        <NuevaAnulacionModal
          onCerrar={() => setShowModal(false)}
          onAnulada={handleAnulada}
        />
      )}

      {detalleSel && (
        <DetalleAnulacionModal
          anulacion={detalleSel}
          onCerrar={() => setDetalleSel(null)}
        />
      )}
    </div>
  );
}

/* ───────────── Wizard: buscar factura → motivo → anular ───────────── */

function NuevaAnulacionModal({ onCerrar, onAnulada }) {
  const [consulta, setConsulta] = useState("");
  const [facturas, setFacturas] = useState([]);
  const [cargandoFacturas, setCargandoFacturas] = useState(false);
  const [errorFacturas, setErrorFacturas] = useState(null);
  const [facturaSel, setFacturaSel] = useState(null);
  const [motivo, setMotivo] = useState("");
  const [registrando, setRegistrando] = useState(false);
  const [errorOperacion, setErrorOperacion] = useState(null);

  const pasoDetalle = Boolean(facturaSel);

  useEscape(useCallback(() => {
    if (pasoDetalle) {
      setFacturaSel(null);
      setMotivo("");
    } else {
      onCerrar();
    }
  }, [pasoDetalle, onCerrar]));

  // Busca facturas del back: búsqueda libre si hay texto, si no las más recientes.
  useEffect(() => {
    let activo = true;
    const q = consulta.trim();
    setCargandoFacturas(true);
    setErrorFacturas(null);
    (async () => {
      try {
        const res = q.length >= 3
          ? await buscarFacturasVenta(q, { pageSize: 50, sortDir: "DESC" })
          : await getFacturasVenta({ page: 0, pageSize: 50, sortDir: "DESC" });
        if (!activo) return;
        const todas = Array.isArray(res.content) ? res.content : [];
        setFacturas(todas.filter((f) => !esAnulada(f)));
      } catch (err) {
        if (!activo) return;
        setErrorFacturas(apiErrorMessage(err) || "No se pudieron cargar las facturas.");
      } finally {
        if (activo) setCargandoFacturas(false);
      }
    })();
    return () => { activo = false; };
  }, [consulta]);

  const resumen = useMemo(() => {
    const detalles = Array.isArray(facturaSel?.detalles) ? facturaSel.detalles : [];
    if (!detalles.length) return null;
    const porTasa = detalles.reduce((acc, d) => {
      const t = Number(d.tasaIva);
      (acc[t] = acc[t] || []).push(d);
      return acc;
    }, {});
    return [...Object.entries(porTasa)].map(([tasa, lista]) => ({
      tasa: Number(tasa),
      nombres: lista.map((d) => d.nombreProducto || `Producto #${d.idProducto}`),
      cantidad: lista.reduce((s, d) => s + (Number(d.cantidad) || 0), 0),
      total: lista.reduce((s, d) => s + Math.round((Number(d.cantidad) || 0) * (Number(d.precioUnitario) || 0)), 0),
    }));
  }, [facturaSel]);

  const puedeRegistrar = facturaSel && !registrando;

  const handleRegistrar = async () => {
    if (!puedeRegistrar) return;
    setErrorOperacion(null);
    setRegistrando(true);
    try {
      const resp = await anularFacturaVenta({
        idFacturaVenta: facturaSel.idFacturaVenta,
        motivo: String(motivo || "").trim() || undefined,
      });
      onAnulada(resp, facturaSel);
    } catch (err) {
      console.error("Error al registrar anulación:", err);
      setErrorOperacion(err?.message || apiErrorMessage(err));
      setRegistrando(false);
    }
  };

  /* ── Capa 1: buscar / escanear la factura ── */
  const renderBusqueda = () => (
    <div className="space-y-4 p-5">
      <div>
        <label htmlFor="buscar-factura-anulacion" className={labelClass}>
          Buscar factura a anular
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            id="buscar-factura-anulacion"
            type="text"
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            placeholder="N° de factura, timbrado o cliente…"
            autoComplete="off"
            autoFocus
            className={`${fieldClass} pl-9`}
          />
        </div>
        <p className="mt-1 text-xs text-white/40">
          Escribí al menos 3 caracteres para buscar; vacío muestra las facturas más recientes. Solo se anula la factura completa.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 text-xs">
        <p className="text-white/40">
          {cargandoFacturas ? "Buscando…" : `${facturas.length} factura(s) anulables`}
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
                <th className="whitespace-nowrap px-4 py-3 font-medium">N° Factura</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {!cargandoFacturas && facturas.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-white/30">
                    No hay facturas anulables con esa búsqueda.
                  </td>
                </tr>
              )}
              {facturas.map((f) => (
                <tr
                  key={f.idFacturaVenta}
                  role="button"
                  tabIndex={0}
                  onClick={() => setFacturaSel(f)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFacturaSel(f); } }}
                  className="cursor-pointer border-b border-white/10 transition-colors last:border-b-0 focus:outline-none focus-visible:bg-white/[0.06] hover:bg-white/[0.04]"
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

  /* ── Capa 2: resumen de la factura + motivo + confirmación ── */
  const renderDetalle = () => (
    <div className="space-y-4 p-5">
      <div className="space-y-3 rounded-none border border-red-500/20 bg-red-500/[0.03] p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
          <Ban className="h-4 w-4 text-red-400" />
          Anulación total de la factura
        </h3>
        {resumen && (
          <div className="overflow-hidden border border-white/10 bg-[#0c0c0e]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
                  <th className="px-4 py-2 font-medium">Producto</th>
                  <th className="px-4 py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {resumen.map((r) => (
                  <tr key={r.tasa} className="border-b border-white/10 last:border-0">
                    <td className="px-4 py-2.5 text-white/80">{r.nombres.join(", ")}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-white/80">{fmtMoneda(r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div>
          <label htmlFor="motivo-anulacion" className={labelClass}>
            Motivo (opcional)
          </label>
          <textarea
            id="motivo-anulacion"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Ej.: error de carga, cliente devolvió la mercadería…"
            className={`${fieldClass} resize-none`}
          />
        </div>
      </div>

      {errorOperacion && (
        <div className="flex items-center gap-2 rounded-none border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertTriangle className="h-5 w-5 shrink-0" /> {errorOperacion}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Capa 1: búsqueda de factura */}
      {createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onCerrar}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Nueva anulación"
            className={`${modalShell} max-w-2xl max-h-[90vh]`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
              <div>
                <h2 className="text-sm font-semibold text-white">Nueva anulación</h2>
                <p className="mt-0.5 text-xs text-white/50">Buscá la factura de venta a anular.</p>
              </div>
              <button type="button" onClick={onCerrar} aria-label="Cerrar"
                className="rounded p-1 text-white/40 transition-colors hover:bg-white/5 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">{renderBusqueda()}</div>
          </div>
        </div>,
        document.body
      )}

      {/* Capa 2: confirmación de la anulación */}
      {pasoDetalle && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setFacturaSel(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Confirmar anulación"
            className={`${modalShell} max-w-2xl max-h-[90vh]`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <ShieldAlert className="h-4 w-4 text-red-400" />
                  Confirmar anulación
                </h2>
                <p className="mt-0.5 text-xs text-white/50">
                  Factura <span className="whitespace-nowrap tabular-nums">{facturaSel?.numeroFactura || "—"}</span> · {facturaSel?.nombreCliente || "Sin Nombre"}
                </p>
              </div>
              <button
                  type="button"
                  onClick={() => { setFacturaSel(null); setMotivo(""); setErrorOperacion(null); }}
                  aria-label="Cerrar"
                  className="rounded p-1 text-white/40 transition-colors hover:bg-white/5 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

            <div className="flex-1 overflow-y-auto">{renderDetalle()}</div>

            <div className="flex items-center justify-between gap-3 border-t border-white/10 px-5 py-3.5">
              <div className="flex flex-1 items-start gap-2 text-xs">
                <p className="text-white/40">
                  La anulación revierte el stock de <span className="font-semibold tabular-nums text-[var(--accent)]">{fmtMoneda(facturaSel?.totalGeneral)}</span> en productos.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setFacturaSel(null); setMotivo(""); setErrorOperacion(null); }}
                  className="flex items-center gap-1 rounded-none border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70 transition-colors hover:text-white"
                >
                  Volver
                </button>
                <button
                  type="button"
                  onClick={handleRegistrar}
                  disabled={!puedeRegistrar}
                  className="flex items-center gap-2 rounded-none bg-red-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Ban className="h-4 w-4" />
                  {registrando ? "Anulando…" : "Confirmar anulación"}
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

/* ───────────── Detalle de una anulación ───────────── */

function DetalleAnulacionModal({ anulacion, onCerrar }) {
  useEscape(onCerrar);

  const [factura, setFactura] = useState(null);
  const [cargandoFactura, setCargandoFactura] = useState(Boolean(anulacion?.idFacturaVenta));
  const [errorFactura, setErrorFactura] = useState(null);

  useEffect(() => {
    const id = anulacion?.idFacturaVenta;
    if (!id) { setCargandoFactura(false); return; }
    let activo = true;
    setCargandoFactura(true);
    setErrorFactura(null);
    (async () => {
      try {
        const res = await getFacturaVentaById(id);
        if (activo) setFactura(res);
      } catch (err) {
        if (activo) setErrorFactura(apiErrorMessage(err) || "No se pudo cargar la factura.");
      } finally {
        if (activo) setCargandoFactura(false);
      }
    })();
    return () => { activo = false; };
  }, [anulacion?.idFacturaVenta]);

  const detalles = Array.isArray(factura?.detalles) ? factura.detalles : [];
  const numeroFactura = factura?.numeroFactura || anulacion.numeroFactura;
  const cliente = factura?.nombreCliente || anulacion.clienteNombre;
  const timbrado = factura?.numeroTimbrado || anulacion.numeroTimbrado;
  const totalFactura = factura?.totalGeneral ?? anulacion.totalGeneral;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Detalle de la anulación"
        className={`${modalShell} max-w-2xl max-h-[90vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado tipo factura */}
        <div className="flex items-start justify-between border-b border-white/10 px-5 py-3.5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex items-center gap-1.5 whitespace-nowrap rounded-none border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-red-300">
              <Ban className="h-3.5 w-3.5" /> Anulada
            </span>
            <div>
              <h2 className="text-sm font-semibold text-white">
                Factura <span className="whitespace-nowrap tabular-nums">{numeroFactura || "—"}</span>
              </h2>
              <p className="mt-0.5 text-xs text-white/50">Anulación #{anulacion.idAnulacion}</p>
            </div>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar"
            className="rounded p-1 text-white/40 transition-colors hover:bg-white/5 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {/* Datos de la factura */}
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-white/40">Cliente</p>
              <p className="text-white/80">{cliente || "Sin Nombre"}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-white/40">N° Timbrado</p>
              <p className="whitespace-nowrap tabular-nums text-white/80">{timbrado || "—"}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-white/40">Fecha de emisión</p>
              <p className="text-white/80">{cargandoFactura ? "…" : fmtFechaHora(factura?.fechaEmision || factura?.fechaCreacion)}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-white/40">Fecha de anulación</p>
              <p className="text-white/80">{fmtFechaHora(anulacion.fechaAnulacion)}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-white/40">Total factura</p>
              <p className="whitespace-nowrap tabular-nums font-semibold text-red-300">{fmtMoneda(totalFactura)}</p>
            </div>
          </div>

          {/* Productos de la factura */}
          <div>
            <p className="mb-1.5 text-[11px] uppercase tracking-[0.12em] text-white/40">Productos de la factura</p>
            <div className="overflow-hidden border border-white/10 bg-[#0c0c0e]">
              <div className="max-h-[38vh] overflow-y-auto [color-scheme:dark] [scrollbar-color:#2a2a32_transparent] [scrollbar-width:thin]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-[#0c0c0e]">
                    <tr className="border-b border-white/10 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">
                      <th className="px-3 py-2.5 font-medium">Producto</th>
                      <th className="whitespace-nowrap px-3 py-2.5 text-right font-medium">Cant.</th>
                      <th className="whitespace-nowrap px-3 py-2.5 text-right font-medium">Precio unit.</th>
                      <th className="whitespace-nowrap px-3 py-2.5 text-right font-medium">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cargandoFactura && (
                      <tr>
                        <td colSpan={4} className="px-3 py-6 text-center text-white/40">Cargando productos…</td>
                      </tr>
                    )}
                    {!cargandoFactura && errorFactura && (
                      <tr>
                        <td colSpan={4} className="px-3 py-6 text-center text-red-300">{errorFactura}</td>
                      </tr>
                    )}
                    {!cargandoFactura && !errorFactura && detalles.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-3 py-6 text-center text-white/30">La factura no tiene productos.</td>
                      </tr>
                    )}
                    {!cargandoFactura && !errorFactura && detalles.map((d, i) => (
                      <tr key={d.idDetalle ?? i} className="border-b border-white/10 last:border-b-0">
                        <td className="px-3 py-2.5 text-white/80">{d.nombreProducto || `Producto #${d.idProducto}`}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-white/70">{fmtCantidad(d.cantidad)}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-white/70">{fmtMoneda(d.precioUnitario)}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-white">
                          {fmtMoneda(d.subtotal ?? (Number(d.cantidad) || 0) * (Number(d.precioUnitario) || 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Motivo */}
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-white/40">Motivo</p>
            <p className="mt-1 text-sm text-white/80">{anulacion.motivo || "—"}</p>
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