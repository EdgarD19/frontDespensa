import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  Plus, X, Save, FileText, AlertTriangle, CheckCircle, ArrowLeft,
  ArrowLeftRight, Eye, Barcode, Printer, ChevronLeft,
} from "lucide-react";
import {
  buscarTicketsLocal, getTicketLocal, getInterCambiosVenta, crearIntercambioVenta,
} from "../../../api/ventasLocalApi";
import { apiErrorMessage } from "../../../api/errors";
import { getProductos } from "../../../api/productosApi";
import CantidadInput from "../../../components/ui/CantidadInput";
import { esProductoPesable } from "../registro-venta/utils";

/* ───────────── Utilidades y estilos (mismo lenguaje visual que OperacionesTipo) ───────────── */

function fmtMoneda(n) {
  return new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", minimumFractionDigits: 0 }).format(n ?? 0);
}

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

const thBase = "px-4 py-3 font-medium";

const iconBtn = "flex h-8 w-8 items-center justify-center rounded-none transition-colors";

const modalShell = "w-full rounded-none border border-white/10 bg-[#0c0c0e] shadow-2xl flex flex-col";

// Motivos y destinos del stock para el intercambio homogéneo (los elige el cajero).
const MOTIVOS = [
  { value: "DEFECTUOSO_VENCIDO", label: "Producto defectuoso / vencido" },
  { value: "ESTADO", label: "Cambio por estado (preferencia)" },
];
const DESTINOS = [
  { value: "MERMA", label: "Merma / defectuoso" },
  { value: "VENDIBLE", label: "Al inventario" },
];
const labelMotivo = (v) => MOTIVOS.find((m) => m.value === v)?.label || v || "—";
const labelDestino = (v) => DESTINOS.find((d) => d.value === v)?.label || v || "—";

// Destino sugerido según el motivo: defecto → merma; preferencia → stock vendible.
const destinoSugerido = (motivo) => (motivo === "ESTADO" ? "VENDIBLE" : "MERMA");

const ESTADO_STYLES = {
  COMPLETADA: { badge: "bg-emerald-500/10 text-emerald-400", dot: "bg-emerald-400" },
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

/* ───────────── Página ───────────── */

export default function IntercambioVentas() {
  const [intercambios, setIntercambios] = useState([]);
  const [error, setError] = useState(null);
  const [errorOperacion, setErrorOperacion] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [registrando, setRegistrando] = useState(false);
  const [showModal, setShowModal] = useState(false);
  // Comprobante de cambio: { data, imprimir } — imprime solo al registrar.
  const [comprobante, setComprobante] = useState(null);

  const cargar = useCallback(() => {
    setError(null);
    try {
      setIntercambios(getInterCambiosVenta());
    } catch (err) {
      console.error("Error al cargar intercambios:", err);
      setError("No se pudieron cargar los intercambios.");
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    if (!comprobante?.imprimir) return;
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, [comprobante]);

  const handleRegistrar = async (datos) => {
    if (registrando) return;
    setRegistrando(true);
    setErrorOperacion(null);
    setAviso(null);
    try {
      const items = Array.isArray(datos?.items) ? datos.items : [datos];
      // Revalida el ticket al confirmar (pudo haberse registrado en otra pestaña).
      const ticket = getTicketLocal(datos.ticketId);
      if (!ticket) {
        throw new Error("El ticket de venta ya no está disponible. Volvé a buscarlo.");
      }
      // Un intercambio por producto configurado (cantidad > 0), cada uno con su número IC.
      const creados = items.map((item) => crearIntercambioVenta({ ...datos, ...item }));
      setAviso(
        creados.length === 1
          ? "1 intercambio registrado"
          : `${creados.length} intercambios registrados`
      );
      setShowModal(false);
      setComprobante({ registros: creados, imprimir: true });
      cargar();
    } catch (err) {
      console.error("Error al registrar intercambio:", err);
      setErrorOperacion(err?.message || apiErrorMessage(err));
    } finally {
      setRegistrando(false);
    }
  };

  const verComprobante = (ic) => setComprobante({ registros: [ic], imprimir: false });

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
          onClick={() => { setErrorOperacion(null); setAviso(null); setShowModal(true); }}
          className="flex items-center gap-2 whitespace-nowrap rounded-none bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-black transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]/50"
        >
          <Plus className="h-4 w-4" />
          Registrar intercambio
        </button>
      </div>

      <div className="flex items-start gap-2 rounded-none border border-sky-500/20 bg-sky-500/[0.07] px-4 py-2.5 text-xs leading-relaxed text-sky-300">
        Los tickets de venta y los intercambios se guardan localmente hasta que el backend exponga los endpoints de ventas.
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
        {intercambios.length === 0 ? (
          <div className="space-y-2 px-4 py-14 text-center">
            <FileText className="mx-auto h-10 w-10 text-white/15" />
            <p className="text-sm text-white/50">Aún no hay intercambios registrados</p>
            <p className="text-xs text-white/40">Empezá con “Registrar intercambio”.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-emerald-500/10 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
                  <th className={thBase}>Fecha</th>
                  <th className={thBase}>Cliente</th>
                  <th className={thBase}>Ticket original</th>
                  <th className={thBase}>Motivo</th>
                  <th className={thBase}>Destino del stock</th>
                  <th className={`${thBase} w-24`} aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {intercambios.map((ic) => (
                  <tr key={ic.id} className="border-b border-white/10 last:border-0 transition hover:bg-white/[0.04]">
                    <td className="whitespace-nowrap px-4 py-3 text-white/60">{fmtFechaHora(ic.fecha)}</td>
                    <td className="px-4 py-3 text-white/70">{ic.cliente || "—"}</td>
                    <td className="px-4 py-3 tabular-nums text-white/70">{ic.ticketNumero || "—"}</td>
                    <td className="px-4 py-3 text-white/70">{labelMotivo(ic.motivo)}</td>
                    <td className="px-4 py-3 text-white/70">{labelDestino(ic.destino)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => verComprobante(ic)}
                          title="Ver comprobante de cambio"
                          aria-label="Ver comprobante de cambio"
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
          onRegistrar={handleRegistrar}
          registrando={registrando}
        />
      )}

      {comprobante && (
        <ComprobanteCambioModal
          registros={comprobante.registros}
          onCerrar={() => setComprobante(null)}
        />
      )}
    </div>
  );
}

/* ───────────── Wizard: buscar ticket → producto → motivo/destino ───────────── */

function NuevoIntercambioModal({ onCerrar, onRegistrar, registrando = false }) {
  const [consulta, setConsulta] = useState("");
  const [ticketSel, setTicketSel] = useState(null);
  // Configuración por fila: clave `${productoId}|${indice}` → { cantidad, motivo, destino }.
  const [configs, setConfigs] = useState({});
  // Catálogo (idProducto → unidad de medida) para distinguir kg de unidad.
  const [uniById, setUniById] = useState({});

  // kg se resuelve desde el catálogo; si no está disponible se asume unidad.
  const umDe = (l) =>
    esProductoPesable({ unidadMedida: uniById[l?.productoId] }) ? "KG" : "UN";

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

  // Escape cierra solo la capa superior: del detalle vuelve a la búsqueda, si no cierra.
  useEscape(useCallback(() => {
    if (pasoDetalle) {
      setTicketSel(null);
      setConfigs({});
    } else {
      onCerrar();
    }
  }, [pasoDetalle, onCerrar]));

  const clv = (l, i) => `${l.productoId}|${i}`;
  const cfgDe = (l, i) =>
    configs[clv(l, i)] || { cantidad: 0, motivo: "DEFECTUOSO_VENCIDO", destino: "MERMA" };
  const setRow = (l, i, patch) =>
    setConfigs((prev) => ({ ...prev, [clv(l, i)]: { ...cfgDe(l, i), ...patch } }));

  const seleccionarTicket = (t) => {
    setTicketSel(t);
    const cfg = {};
    (t.lineas || []).forEach((l, i) => {
      cfg[clv(l, i)] = { cantidad: 0, motivo: "DEFECTUOSO_VENCIDO", destino: "MERMA" };
    });
    setConfigs(cfg);
  };

  // Escáner de código de barras: Enter selecciona el primer resultado.
  const onBusquedaKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (hayTickets) seleccionarTicket(tickets[0]);
    }
  };

  const cambiarCant = (l, i, raw, esKG) => {
    const max = Number(l.cantidad) || 0;
    const n = esKG
      ? Math.min(Math.max(parseFloat(String(raw).replace(",", ".")) || 0, 0), max)
      : Math.min(Math.max(parseInt(raw, 10) || 0, 0), Math.trunc(max));
    setRow(l, i, { cantidad: n });
  };
  const cambiarMotivoFila = (l, i, v) => setRow(l, i, { motivo: v, destino: destinoSugerido(v) });
  const cambiarDestinoFila = (l, i, v) => setRow(l, i, { destino: v });

  const items = (ticketSel?.lineas || [])
    .map((l, i) => {
      const cfg = cfgDe(l, i);
      const um = umDe(l);
      const max = Number(l.cantidad) || 0;
      const canth = um === "KG"
        ? Math.min(Math.max(Number(cfg.cantidad) || 0, 0), max)
        : Math.min(Math.max(parseInt(cfg.cantidad, 10) || 0, 0), Math.trunc(max));
      return { l, i, cfg, um, canth };
    })
    .filter((x) => x.canth > 0 && x.cfg.motivo && x.cfg.destino);

  const puedeRegistrar = items.length > 0;

  const handleRegistrar = () => {
    if (!puedeRegistrar || registrando) return;
    onRegistrar({
      fecha: new Date().toISOString(),
      ticketId: ticketSel.id,
      ticketNumero: ticketSel.numero,
      cliente: ticketSel.cliente,
      items: items.map((x) => ({
        idProducto: x.l.productoId,
        producto: x.l.nombre,
        cantidad: x.canth,
        unidadMedida: x.um,
        precioUnitario: x.l.precioUnitario,
        motivo: x.cfg.motivo,
        motivoLabel: labelMotivo(x.cfg.motivo),
        destino: x.cfg.destino,
        destinoLabel: labelDestino(x.cfg.destino),
      })),
    });
  };

  /* ── Capa 1: buscar / escanear el ticket ── */
  const renderBusqueda = () => (
    <div className="space-y-4 p-5">
      <div>
        <label htmlFor="buscar-ticket" className={labelClass}>
          Escanear o buscar el ticket de venta
        </label>
        <div className="relative">
          <Barcode className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            id="buscar-ticket"
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
          Escaneá el código del comprobante o escribí una parte del número; con Enter se abre el primero.
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
                <th className="w-[26%] px-4 py-3 font-medium">N° ticket</th>
                <th className="w-[22%] px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {!hayTickets && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-white/30">
                    {buscarTicketsLocal("").length === 0
                      ? "Todavía no hay ventas registradas. Registrá una venta para poder intercambiar."
                      : "No se encontraron tickets con esa búsqueda."}
                  </td>
                </tr>
              )}
              {hayTickets && tickets.map((t) => (
                <tr
                  key={t.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => seleccionarTicket(t)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); seleccionarTicket(t); } }}
                  className="cursor-pointer border-b border-white/10 border-l-2 border-l-transparent transition-colors last:border-b-0 focus:outline-none focus-visible:bg-white/[0.06] hover:border-l-[#22c55e] hover:bg-white/[0.04]"
                >
                  <td className="px-4 py-3 font-medium tabular-nums text-white">{t.numero || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-white/60">{fmtFechaHora(t.fecha)}</td>
                  <td className="px-4 py-3 text-white/70">{t.cliente}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-white">{fmtMoneda(t.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  /* ── Capa 2: producto del ticket + motivo/destino ── */
  const renderDetalle = () => {
    const lineas = ticketSel?.lineas || [];
    return (
      <div className="space-y-4 p-5">
        <div className="space-y-3 rounded-none border border-white/10 bg-white/[0.02] p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
            <ArrowLeftRight className="h-4 w-4 text-[var(--accent)]" />
            Configurá los productos a cambiar
          </h3>

          <div className="overflow-hidden border border-white/10 bg-[#0c0c0e]">
            <div className="max-h-[46vh] overflow-y-auto [color-scheme:dark] [scrollbar-color:#2a2a32_transparent] [scrollbar-width:thin]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-[#0c0c0e]">
                <tr className="border-b border-white/10 bg-emerald-500/10 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
                  <th className="px-4 py-3 font-medium">Producto</th>
                  <th className="px-4 py-3 text-center font-medium">Cant.</th>
                  <th className="px-4 py-3 text-center font-medium">Cant. a intercambiar</th>
                  <th className="px-4 py-3 font-medium">Motivo</th>
                  <th className="px-4 py-3 font-medium">Destino del stock</th>
                </tr>
              </thead>
              <tbody>
                {lineas.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-white/30">Este ticket no tiene productos.</td>
                  </tr>
                )}
                {lineas.map((l, i) => {
                  const cfg = cfgDe(l, i);
                  const um = umDe(l);
                  return (
                    <tr key={`${l.productoId}-${i}`} className="border-b border-white/10 last:border-0 transition hover:bg-white/[0.04]">
                      <td className="px-4 py-3 text-white/80">{l.nombre}</td>
                      <td className="px-4 py-3 text-center tabular-nums text-white/70">{l.cantidad} {um === "KG" ? "kg" : "u."}</td>
                      <td className="px-4 py-3">
                        <CantidadInput
                          unidadMedida={um}
                          value={cfg.cantidad}
                          onChange={(v) => cambiarCant(l, i, v, um === "KG")}
                          permitirCero
                          max={Number(l.cantidad) || 0}
                          maxDecimales={3}
                          ariaLabel={`Cantidad a intercambiar de ${l.nombre}`}
                          className="mx-auto w-28"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={cfg.motivo}
                          onChange={(e) => cambiarMotivoFila(l, i, e.target.value)}
                          className={`${fieldClass} cursor-pointer [color-scheme:dark]`}
                        >
                          {MOTIVOS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={cfg.destino}
                          onChange={(e) => cambiarDestinoFila(l, i, e.target.value)}
                          className={`${fieldClass} cursor-pointer [color-scheme:dark]`}
                        >
                          {DESTINOS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
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
            aria-label="Registrar intercambio"
            className={`${modalShell} max-w-3xl max-h-[90vh]`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
              <div>
                <h2 className="text-sm font-semibold text-white">Nuevo intercambio</h2>
                <p className="mt-0.5 text-xs text-white/50">Escanear o buscar el ticket de venta.</p>
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
            aria-label="Seleccionar productos a intercambiar"
            className={`${modalShell} max-w-4xl max-h-[90vh]`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
              <div>
                <h2 className="text-sm font-semibold text-white">Productos a cambiar</h2>
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
                {items.length > 0 ? (
                  <p className="text-white/40">
                    <span className="font-semibold tabular-nums text-[var(--accent)]">{items.length}</span>{" "}
                    {items.length === 1 ? "producto a intercambiar" : "productos a intercambiar"}.
                  </p>
                ) : (
                  <p className="text-white/40">Configurá la cantidad, el motivo y el destino de cada producto.</p>
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
                  disabled={!puedeRegistrar || registrando}
                  className="flex items-center gap-2 rounded-none bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Save className="h-4 w-4" />
                  {registrando ? "Registrando…" : "Registrar intercambio"}
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

/* ───────────── Comprobante de cambio (también imprimible, ₲0) ───────────── */

function ComprobanteCambioModal({ registros, onCerrar }) {
  useEscape(onCerrar);

  const lista = Array.isArray(registros) ? registros : registros ? [registros] : [];
  const primero = lista[0] || {};
  const fecha = fmtFechaHora(primero.fecha);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Comprobante de cambio"
        className={`${modalShell} max-w-2xl max-h-[90vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
              <FileText className="h-4 w-4 text-[var(--accent)]" />
              Comprobante de cambio
            </h2>
            <p className="mt-0.5 text-xs text-white/50">
              Ticket <span className="tabular-nums">{primero.ticketNumero || "—"}</span> · {primero.cliente}
            </p>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar"
            className="rounded p-1 text-white/40 transition-colors hover:bg-white/5 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">

          <div className="overflow-hidden border border-white/10 bg-[#0c0c0e]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-emerald-500/10 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
                  <th className="px-4 py-3 font-medium">Producto</th>
                  <th className="px-4 py-3 text-center font-medium">Entra</th>
                  <th className="px-4 py-3 text-center font-medium">Sale</th>
                  <th className="px-4 py-3 font-medium">Motivo</th>
                  <th className="px-4 py-3 font-medium">Destino del stock</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((r) => (
                  <tr key={r.id} className="border-b border-white/10 last:border-0 transition hover:bg-white/[0.04]">
                    <td className="px-4 py-3 text-white/80">{r.producto}</td>
                    <td className="px-4 py-3 text-center tabular-nums text-amber-300">{fmtCant(r.cantidad, r.unidadMedida)}</td>
                    <td className="px-4 py-3 text-center tabular-nums text-emerald-300">{fmtCant(r.cantidad, r.unidadMedida)}</td>
                    <td className="px-4 py-3 text-white/70">{labelMotivo(r.motivo)}</td>
                    <td className="px-4 py-3 text-white/70">{labelDestino(r.destino)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-white/10 px-5 py-3.5">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-none border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70 transition-colors hover:text-white"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-none bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-black transition hover:opacity-90"
          >
            <Printer className="h-4 w-4" /> Imprimir
          </button>
        </div>
      </div>

      {/* Contenido imprimible (window.print); estilos en index.css `.print-invoice`. */}
      <div className="print-invoice hidden print:block print:p-8 print:bg-white print:text-black">
        <div className="max-w-md mx-auto font-sans text-sm text-black">
          <h1 className="text-lg font-bold border-b border-black pb-2 mb-4">Comprobante de cambio</h1>
          <p className="mb-1"><strong>N°:</strong> <span className="tabular-nums">{lista.map((r) => r.numero).filter(Boolean).join(", ") || "—"}</span></p>
          <p className="mb-1"><strong>Fecha:</strong> {fecha}</p>
          <p className="mb-1"><strong>Ticket original:</strong> <span className="tabular-nums">{primero.ticketNumero || "—"}</span></p>
          <p className="mb-4"><strong>Cliente:</strong> {primero.cliente}</p>
          <table className="w-full border-collapse mb-4">
            <thead>
              <tr className="border-b border-black">
                <th className="text-left py-1">Producto</th>
                <th className="text-center py-1">Entra</th>
                <th className="text-center py-1">Sale</th>
                <th className="text-left py-1">Motivo</th>
                <th className="text-left py-1">Destino</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((r) => (
                <tr key={r.id} className="border-b border-gray-300">
                  <td className="py-1 pr-2">{r.producto}</td>
                  <td className="text-center tabular-nums">{fmtCant(r.cantidad, r.unidadMedida)}</td>
                  <td className="text-center tabular-nums">{fmtCant(r.cantidad, r.unidadMedida)}</td>
                  <td className="py-1 pr-2">{labelMotivo(r.motivo)}</td>
                  <td className="py-1 pr-2">{labelDestino(r.destino)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>,
    document.body
  );
}
