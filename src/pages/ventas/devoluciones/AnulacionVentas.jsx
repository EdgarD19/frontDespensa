import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus, X, AlertTriangle, CheckCircle, ArrowLeft,
  Ban, Eye, ChevronLeft, SlidersHorizontal,
} from "lucide-react";
import {
  buscarTicketsLocal, getAnulacionesVenta, crearAnulacionVenta,
  marcarVentaAnulada, guardarPrecargaVenta,
} from "../../../api/ventasLocalApi";
import { apiErrorMessage } from "../../../api/errors";
import { getProductos } from "../../../api/productosApi";
import CantidadInput from "../../../components/ui/CantidadInput";
import { esProductoPesable } from "../registro-venta/utils";

/* ───────────── Utilidades y estilos (mismo lenguaje que Intercambio) ───────────── */

function fmtFechaHora(valor) {
  if (!valor) return "—";
  const d = new Date(valor);
  return Number.isNaN(d.getTime())
    ? String(valor)
    : d.toLocaleString("es-PY", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
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

// Botones de la columna Acciones del buscador de tickets.
const btnFila =
  "flex items-center gap-1.5 rounded-none border px-2.5 py-1.5 text-xs font-medium transition-colors";
const btnAnularTotal = `${btnFila} border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20`;
const btnAnularTotalConfirm = `${btnFila} border-red-400/60 bg-red-500/25 font-semibold text-red-100 hover:bg-red-500/35`;
const btnDevolucionParcial = `${btnFila} border-white/10 bg-white/[0.03] text-white/70 hover:border-[#22c55e]/40 hover:bg-[#22c55e]/10 hover:text-white`;

// Destino del stock devuelto en la anulación (mismas opciones que Intercambio).
const DESTINOS_ANULACION = [
  { value: "MERMA", label: "Merma / defectuoso" },
  { value: "VENDIBLE", label: "Al inventario" },
];
const labelDestinoAnulacion = (v) => DESTINOS_ANULACION.find((d) => d.value === v)?.label || v || "—";

const MOTIVO_ANULACION_LABEL = "Anulación por modificación de venta / refacturación";

function useEscape(onCerrar) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onCerrar(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCerrar]);
}

/* ───────────── Página ───────────── */

export default function AnulacionVentas() {
  const navigate = useNavigate();
  const [anulaciones, setAnulaciones] = useState([]);
  const [error, setError] = useState(null);
  const [errorOperacion, setErrorOperacion] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [detalleSel, setDetalleSel] = useState(null);

  const cargar = useCallback(() => {
    setError(null);
    try {
      setAnulaciones(getAnulacionesVenta());
    } catch (err) {
      console.error("Error al cargar anulaciones:", err);
      setError("No se pudieron cargar las anulaciones.");
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const handleRegistrar = async (datos) => {
    setErrorOperacion(null);
    setAviso(null);
    try {
      crearAnulacionVenta(datos);
      // El comprobante original pasa a anulado.
      marcarVentaAnulada(datos.ticketId, MOTIVO_ANULACION_LABEL);
      const conservadas = Array.isArray(datos.lineasConservadas) ? datos.lineasConservadas : [];
      if (conservadas.length === 0) {
        // Anulación total: no hay nada que refacturar.
        setShowModal(false);
        setAviso(`Anulación registrada. El ticket ${datos.ticketNumero} quedó anulado.`);
        cargar();
        return;
      }
      // Pase automático a la Caja con lo que el cliente conserva.
      guardarPrecargaVenta({
        ticketId: datos.ticketId,
        ticketNumero: datos.ticketNumero,
        cliente: datos.cliente,
        lineas: conservadas,
      });
      setShowModal(false);
      cargar();
      navigate("/ventas/registro");
    } catch (err) {
      console.error("Error al registrar anulación:", err);
      setErrorOperacion(err?.message || apiErrorMessage(err));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link to="/ventas/devoluciones" className="rounded-none p-2 text-white/50 transition-colors hover:bg-white/10" aria-label="Volver">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 space-y-0.5">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Anulación</h1>
        </div>
        <button
          type="button"
          onClick={() => { setErrorOperacion(null); setAviso(null); setShowModal(true); }}
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
      {errorOperacion && (
        <div className="flex items-center gap-2 rounded-none border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertTriangle className="h-5 w-5 shrink-0" /> {errorOperacion}
        </div>
      )}
      {aviso && (
        <div className="flex items-center gap-2 rounded-none border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          <CheckCircle className="h-5 w-5 shrink-0" /> {aviso}
        </div>
      )}

      <div className="overflow-hidden border border-white/10 bg-[#0c0c0e] shadow-lg shadow-black/20">
        {anulaciones.length === 0 ? (
          <div className="space-y-2 px-4 py-14 text-center">
            <Ban className="mx-auto h-10 w-10 text-white/15" />
            <p className="text-sm text-white/50">Aún no hay anulaciones registradas</p>
            <p className="text-xs text-white/40">Empezá con “Nueva anulación”.</p>
          </div>
        ) : (
          <div className="overflow-x-auto [color-scheme:dark]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-emerald-500/10 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Ticket original</th>
                  <th className="px-4 py-3 font-medium">Motivo</th>
                  <th className="px-4 py-3 font-medium">Devuelto</th>
                  <th className="px-4 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {anulaciones.map((an) => (
                  <tr key={an.id} className="border-b border-white/10 last:border-0 transition hover:bg-white/[0.04]">
                    <td className="whitespace-nowrap px-4 py-3 text-white/60">{fmtFechaHora(an.fecha)}</td>
                    <td className="px-4 py-3 text-white/70">{an.cliente}</td>
                    <td className="px-4 py-3 tabular-nums text-white">{an.ticketNumero || "—"}</td>
                    <td className="px-4 py-3 text-white/60">{an.motivoLabel || "—"}</td>
                    <td className="px-4 py-3 text-white/60">
                      {an.lineasDevueltas.length === 1
                        ? "1 ítem devuelto"
                        : `${an.lineasDevueltas.length} ítems devueltos`}
                    </td>
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

      {showModal && (
        <NuevaAnulacionModal
          onCerrar={() => setShowModal(false)}
          onRegistrar={handleRegistrar}
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

/* ───────────── Wizard: buscar ticket → modificar / devolver → anular y refacturar ───────────── */

function NuevaAnulacionModal({ onCerrar, onRegistrar }) {
  const [consulta, setConsulta] = useState("");
  const [ticketSel, setTicketSel] = useState(null);
  // Config por fila: clave `${productoId}|${indice}` → { cant, destino }.
  const [configs, setConfigs] = useState({});
  // Catálogo (idProducto → unidad de medida) para distinguir kg de unidad.
  const [uniById, setUniById] = useState({});
  // Fila cuya anulación total está a la espera de confirmación.
  const [confirmandoTotalId, setConfirmandoTotalId] = useState(null);

  const umDe = (l) => {
    // La línea del ticket ya trae su unidad; el catálogo es solo respaldo.
    const lu = String(l?.productoPesable || l?.unidadMedida || "").toUpperCase();
    if (lu === "SI" || lu === "KG" || lu === "KILOGRAMO" || lu === "KILOGRAMOS") return "KG";
    if (lu === "NO" || lu === "UN" || lu === "UNIDAD" || lu === "UNIDADES") return "UN";
    return esProductoPesable({ unidadMedida: uniById[l?.productoId] }) ? "KG" : "UN";
  };

  useEffect(() => {
    let activo = true;
    getProductos({ pageSize: 500 })
      .then((res) => {
        if (!activo) return;
        const map = {};
        res.content.forEach((p) => { map[p.id] = p.unidadMedida || ""; });
        setUniById(map);
      })
      .catch(() => {});
    return () => { activo = false; };
  }, []);

  const tickets = useMemo(() => buscarTicketsLocal(consulta), [consulta]);
  const hayTickets = tickets.length > 0;
  const pasoDetalle = Boolean(ticketSel);

  useEscape(useCallback(() => {
    if (pasoDetalle) {
      setTicketSel(null);
      setConfigs({});
    } else {
      onCerrar();
    }
  }, [pasoDetalle, onCerrar]));

  const clv = (l, i) => `${l.productoId}|${i}`;
  const cfgDe = (l, i) => {
    const original = Number(l.cantidad) || 0;
    return configs[clv(l, i)] || { cant: original, destino: "VENDIBLE" };
  };
  const setRow = (l, i, patch) =>
    setConfigs((prev) => ({ ...prev, [clv(l, i)]: { ...cfgDe(l, i), ...patch } }));

  const seleccionarTicket = (t) => {
    setTicketSel(t);
    const cfg = {};
    (t.lineas || []).forEach((l, i) => {
      cfg[clv(l, i)] = { cant: Number(l.cantidad) || 0, destino: "VENDIBLE" };
    });
    setConfigs(cfg);
  };

  // Anulación total: devuelve todos los ítems del ticket de una vez.
  const anularTotal = (t) => {
    const lineasDevueltas = (t.lineas || []).map((l) => ({
      productoId: l.productoId,
      producto: l.nombre,
      cantidad: Number(l.cantidad) || 0,
      unidadMedida: umDe(l),
      destino: "VENDIBLE",
      destinoLabel: labelDestinoAnulacion("VENDIBLE"),
    }));
    onRegistrar({
      fecha: new Date().toISOString(),
      ticketId: t.id,
      ticketNumero: t.numero,
      cliente: t.cliente,
      totalOriginal: Number(t.total) || 0,
      lineasDevueltas,
      lineasConservadas: [],
    });
  };

  // Escáner de código de barras: Enter selecciona el primer resultado.
  const onBusquedaKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (hayTickets) seleccionarTicket(tickets[0]);
    }
  };

  const cambiarCant = (l, i, raw, esKG) => {
    const original = Number(l.cantidad) || 0;
    const n = esKG
      ? Math.min(Math.max(parseFloat(String(raw).replace(",", ".")) || 0, 0), original)
      : Math.min(Math.max(parseInt(raw, 10) || 0, 0), Math.trunc(original));
    setRow(l, i, { cant: n });
  };

  // Derivados por fila + resumen.
  const rows = (ticketSel?.lineas || []).map((l, i) => {
    const cfg = cfgDe(l, i);
    const original = Number(l.cantidad) || 0;
    const cantConserva = Math.min(Math.max(Number(cfg.cant) || 0, 0), original);
    const devuelve = Math.max(0, original - cantConserva);
    return { l, i, cfg, original, cantConserva, devuelve, um: umDe(l) };
  });

  const lineasDevueltas = rows
    .filter((r) => r.devuelve > 0)
    .map((r) => ({
      productoId: r.l.productoId,
      producto: r.l.nombre,
      cantidad: r.devuelve,
      unidadMedida: r.um,
      destino: r.cfg.destino || "VENDIBLE",
      destinoLabel: labelDestinoAnulacion(r.cfg.destino || "VENDIBLE"),
    }));

  const lineasConservadas = rows
    .filter((r) => r.cantConserva > 0)
    .map((r) => ({
      productoId: r.l.productoId,
      nombre: r.l.nombre,
      cantidad: r.cantConserva,
      unidadMedida: r.um,
      precioUnitario: r.l.precioUnitario,
    }));

  const totalDevuelto = lineasDevueltas.reduce((a, x) => a + (Number(x.cantidad) || 0), 0);
  const puedeRegistrar = lineasDevueltas.length > 0;

  const handleRegistrar = () => {
    if (!puedeRegistrar) return;
    onRegistrar({
      fecha: new Date().toISOString(),
      ticketId: ticketSel.id,
      ticketNumero: ticketSel.numero,
      cliente: ticketSel.cliente,
      totalOriginal: Number(ticketSel.total) || 0,
      lineasDevueltas,
      lineasConservadas,
    });
  };

  /* ── Capa 1: buscar / escanear el ticket ── */
  const renderBusqueda = () => (
    <div className="space-y-4 p-5">
      <div>
        <label htmlFor="buscar-ticket-anulacion" className={labelClass}>
          Escanear o buscar el ticket a anular
        </label>
        <div className="relative">
          <Ban className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            id="buscar-ticket-anulacion"
            type="text"
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            onKeyDown={onBusquedaKeyDown}
            placeholder="N° del ticket, cliente o fecha…"
            autoComplete="off"
            autoFocus
            className={`${fieldClass} pl-9`}
          />
        </div>
        <p className="mt-1 text-xs text-white/40">
          Escaneá el código del comprobante o escribí una parte del número. Con Enter se abre la devolución parcial del primero.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 text-xs">
        <p className="text-white/40">{consulta ? `${tickets.length} resultado(s)` : "Ventas más recientes"}</p>
        {consulta && (
          <button type="button" onClick={() => setConsulta("")} className="flex items-center gap-1 text-[var(--accent)] transition-colors hover:text-green-400">
            <X className="h-3.5 w-3.5" /> Limpiar
          </button>
        )}
      </div>

      <div className="overflow-hidden border border-white/10 bg-[#0c0c0e]">
        <div className="max-h-[45vh] overflow-y-auto [color-scheme:dark] [scrollbar-color:#2a2a32_transparent] [scrollbar-width:thin]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-[#0c0c0e]">
              <tr className="border-b border-white/10 bg-emerald-500/10 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
                <th className="w-[24%] px-4 py-3 font-medium">N° ticket</th>
                <th className="w-[20%] px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="w-72 px-4 py-3 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {!hayTickets && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-white/30">
                    {buscarTicketsLocal("").length === 0
                      ? "Todavía no hay ventas registradas."
                      : "No se encontraron tickets con esa búsqueda."}
                  </td>
                </tr>
              )}
              {hayTickets && tickets.map((t) => (
                <tr key={t.id} className="border-b border-white/10 last:border-b-0 transition-colors hover:bg-white/[0.04]">
                  <td className="px-4 py-3 font-medium tabular-nums text-white">{t.numero || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-white/60">{fmtFechaHora(t.fecha)}</td>
                  <td className="px-4 py-3 text-white/70">{t.cliente}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-white">{fmtTotal(t.total)}</td>
                  <td className="px-4 py-3">
                    {confirmandoTotalId === t.id ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-[11px] text-red-300/80">¿Anular todo?</span>
                        <button type="button" onClick={() => anularTotal(t)} className={btnAnularTotalConfirm}>
                          Confirmar
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmandoTotalId(null)}
                          aria-label="Cancelar anulación total"
                          className={`${iconBtn} text-white/40 hover:bg-white/5 hover:text-white`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1.5">
                        <button type="button" onClick={() => setConfirmandoTotalId(t.id)} className={btnAnularTotal}>
                          <Ban className="h-3.5 w-3.5" /> Anulación total
                        </button>
                        <button type="button" onClick={() => seleccionarTicket(t)} className={btnDevolucionParcial}>
                          <SlidersHorizontal className="h-3.5 w-3.5" /> Devolución parcial
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  /* ── Capa 2: desglose del ticket original, marcar lo que se devuelve ── */
  const renderDetalle = () => {
    const lineas = ticketSel?.lineas || [];
    return (
      <div className="space-y-4 p-5">
        <div className="space-y-3 rounded-none border border-white/10 bg-white/[0.02] p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
            <Ban className="h-4 w-4 text-[var(--accent)]" />
            Quitá o reducí lo que devuelve el cliente
          </h3>
          <p className="text-xs text-white/40">
            Reducí la cantidad a conservar: ponela en 0 para devolver el producto entero. Lo que conservás pasa al carrito de la Caja.
          </p>

          <div className="overflow-hidden border border-white/10 bg-[#0c0c0e]">
            <div className="max-h-[46vh] overflow-y-auto [color-scheme:dark] [scrollbar-color:#2a2a32_transparent] [scrollbar-width:thin]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-[#0c0c0e]">
                  <tr className="border-b border-white/10 bg-emerald-500/10 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
                    <th className="px-4 py-3 font-medium">Producto</th>
                    <th className="px-4 py-3 text-center font-medium">Cant. ticket</th>
                    <th className="px-4 py-3 font-medium">Cant. a conservar</th>
                    <th className="px-4 py-3 font-medium">Destino</th>
                  </tr>
                </thead>
                <tbody>
                  {lineas.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-white/30">Este ticket no tiene productos.</td>
                    </tr>
                  )}
                  {rows.map((r) => {
                    const devolviendo = r.devuelve > 0;
                    return (
                      <tr key={`${r.l.productoId}-${r.i}`} className={`border-b border-white/10 last:border-0 transition ${devolviendo ? "bg-red-500/[0.04]" : "hover:bg-white/[0.04]"}`}>
                        <td className={`px-4 py-3 ${devolviendo ? "text-red-300/80" : "text-white/80"}`}>{r.l.nombre}</td>
                        <td className="px-4 py-3 text-center tabular-nums text-white/70">{fmtCant(r.original, r.um)}</td>
                        <td className="px-4 py-3">
                          <CantidadInput
                            unidadMedida={r.um}
                            value={r.cfg.cant}
                            onChange={(v) => cambiarCant(r.l, r.i, v, r.um === "KG")}
                            permitirCero
                            max={r.original}
                            maxDecimales={3}
                            ariaLabel={`Cantidad a conservar de ${r.l.nombre}`}
                            className="mx-auto w-28"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={r.cfg.destino || "VENDIBLE"}
                            onChange={(e) => setRow(r.l, r.i, { destino: e.target.value })}
                            aria-label={`Destino de lo devuelto de ${r.l.nombre}`}
                            className={`${fieldClass} cursor-pointer [color-scheme:dark]`}
                          >
                            {DESTINOS_ANULACION.map((d) => (
                              <option key={d.value} value={d.value}>{d.label}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Capa 1: búsqueda / escaneo del ticket */}
      {createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onCerrar}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Anular y refacturar"
            className={`${modalShell} max-w-3xl max-h-[90vh]`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
              <div>
                <h2 className="text-sm font-semibold text-white">Nueva anulación</h2>
                <p className="mt-0.5 text-xs text-white/50">Elegí anulación total o devolución parcial del ticket.</p>
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

      {/* Capa 2: detalle del ticket, superpuesto a la búsqueda */}
      {pasoDetalle && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Modificar o devolver productos"
            className={`${modalShell} max-w-5xl max-h-[90vh]`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
              <div>
                <h2 className="text-sm font-semibold text-white">Anular y refacturar</h2>
                <p className="mt-0.5 text-xs text-white/50">
                  Ticket <span className="tabular-nums">{ticketSel.numero || "—"}</span> · {ticketSel.cliente}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setTicketSel(null); setConfigs({}); }}
                aria-label="Cerrar"
                className="rounded p-1 text-white/40 transition-colors hover:bg-white/5 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">{renderDetalle()}</div>

            <div className="flex items-center justify-between gap-3 border-t border-white/10 px-5 py-3.5">
              <div className="flex flex-1 items-start gap-2 text-xs">
                {lineasDevueltas.length > 0 ? (
                  <p className="text-white/40">
                    <span className="font-semibold tabular-nums text-[var(--accent)]">{totalDevuelto}</span>{" "}
                    <span className="text-red-300/80">devuelto</span> ·{" "}
                    <span className="font-semibold tabular-nums text-[var(--accent)]">{lineasConservadas.length}</span>{" "}
                    producto(s) pasan a la Caja.
                  </p>
                ) : (
                  <p className="text-white/40">Reducí la cantidad a conservar (0 devuelve el producto entero) para habilitar la anulación.</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setTicketSel(null); setConfigs({}); }}
                  className="flex items-center gap-1 rounded-none border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70 transition-colors hover:text-white"
                >
                  <ChevronLeft className="h-4 w-4" /> Volver
                </button>
                <button
                  type="button"
                  onClick={handleRegistrar}
                  disabled={!puedeRegistrar}
                  className="flex items-center gap-2 rounded-none bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Ban className="h-4 w-4" />
                  Anular y refacturar
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

  const devueltas = Array.isArray(anulacion.lineasDevueltas) ? anulacion.lineasDevueltas : [];
  const conservadas = Array.isArray(anulacion.lineasConservadas) ? anulacion.lineasConservadas : [];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Detalle de la anulación"
        className={`${modalShell} max-w-2xl max-h-[90vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
              <Ban className="h-4 w-4 text-[var(--accent)]" />
              {anulacion.numero || "Anulación"}
            </h2>
            <p className="mt-0.5 text-xs text-white/50">
              Ticket <span className="tabular-nums">{anulacion.ticketNumero || "—"}</span> · {anulacion.cliente}
            </p>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar"
            className="rounded p-1 text-white/40 transition-colors hover:bg-white/5 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div className="space-y-1 text-xs text-white/50">
            <p className="tabular-nums">{fmtFechaHora(anulacion.fecha)}</p>
            <p>{anulacion.motivoLabel || "—"}</p>
          </div>

          <div className="overflow-hidden border border-white/10 bg-[#0c0c0e]">
            <p className="border-b border-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-red-300">
              Devuelto al stock
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
                  <th className="px-4 py-2 font-medium">Producto</th>
                  <th className="px-4 py-2 text-center font-medium">Cant.</th>
                  <th className="px-4 py-2 font-medium">Destino</th>
                </tr>
              </thead>
              <tbody>
                {devueltas.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-white/30">Sin productos devueltos.</td>
                  </tr>
                )}
                {devueltas.map((d) => (
                  <tr key={`${d.productoId}-${d.cantidad}`} className="border-b border-white/10 last:border-0">
                    <td className="px-4 py-2.5 text-white/80">{d.producto}</td>
                    <td className="px-4 py-2.5 text-center tabular-nums text-white/70">{fmtCant(d.cantidad, d.unidadMedida)}</td>
                    <td className="px-4 py-2.5 text-white/70">{labelDestinoAnulacion(d.destino)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="overflow-hidden border border-white/10 bg-[#0c0c0e]">
            <p className="border-b border-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
              Refacturado en la Caja
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
                  <th className="px-4 py-2 font-medium">Producto</th>
                  <th className="px-4 py-2 text-center font-medium">Cant.</th>
                </tr>
              </thead>
              <tbody>
                {conservadas.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-4 py-6 text-center text-white/30">Anulación total, sin refacturación.</td>
                  </tr>
                )}
                {conservadas.map((c) => (
                  <tr key={`${c.productoId}-${c.cantidad}`} className="border-b border-white/10 last:border-0">
                    <td className="px-4 py-2.5 text-white/80">{c.nombre}</td>
                    <td className="px-4 py-2.5 text-center tabular-nums text-white/70">{fmtCant(c.cantidad, c.unidadMedida)}</td>
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

function fmtTotal(n) {
  return new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", minimumFractionDigits: 0 }).format(n ?? 0);
}