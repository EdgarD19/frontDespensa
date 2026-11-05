import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import PageHeader from "../../components/ui/PageHeader";
import { Link } from "react-router-dom";
import {
  Plus, FileText, Pencil,
  AlertTriangle, Check, X, Hash, LayoutGrid, ListOrdered, Lock, Loader2,
} from "lucide-react";
import {
  EXTRAS_DEFAULT, extrasDe, guardarExtrasLocal,
  estadoComprobante, numeroCompleto, rangoDisplay, proximoNumero, pad3, tieneRango, fechasIsoAEs,
} from "../../api/comprobantesApi";
import {
  getTimbradosVenta, crearTimbradoVenta, actualizarTimbradoVenta, apiErrorMessage,
} from "../../api/timbradosVentaApi";
import Modal from "../../components/ui/Modal";

const CARD = "rounded-none border border-white/10 bg-white/[0.02]";
const LABEL = "text-[11px] font-medium uppercase tracking-[0.14em] text-white/50";
const MONO = { fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" };
const INPUT = "h-11 w-full rounded-none border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50";
const BTN_PRIMARIO = "flex items-center gap-2 rounded-none bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-40";
const BTN_SECUNDARIO = "rounded-none border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white/70 transition-colors hover:text-white";

const CHIP_ESTADO = {
  vigente: "border-[var(--border-accent)] bg-[var(--accent-dim)] text-[var(--accent)]",
  vencido: "border-red-500/30 bg-red-500/10 text-red-400",
  sin_iniciar: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  agotado: "border-red-500/30 bg-red-500/10 text-red-400",
  sin_configuracion: "border-white/10 bg-white/[0.06] text-white/50",
};

const MSJ = {
  numeroTimbrado: "Código único de 8 dígitos otorgado por la DNIT.",
  fechas: "Período de vigencia del timbrado autorizado.",
  establecimiento: "Formato 001-001: establecimiento y punto de expedición.",
  rango: "Numeración autorizada, por ejemplo 1 hasta 500.",
};

const TIMBRADO_VACIO = {
  numeroTimbrado: "",
  fechaInicio: "",
  fechaVencimiento: "",
  activo: true,
};

/* ───────────────────────── Validaciones ───────────────────────── */

function validarTimbrado(d) {
  const e = {};
  if (!/^\d{8}$/.test(String(d.numeroTimbrado ?? "").trim()))
    e.numeroTimbrado = "Ingresá los 8 dígitos del timbrado.";
  if (!d.fechaInicio) e.fechaInicio = "Fecha de inicio requerida.";
  if (!d.fechaVencimiento) e.fechaVencimiento = "Fecha de vencimiento requerida.";
  if (d.fechaInicio && d.fechaVencimiento && d.fechaVencimiento < d.fechaInicio)
    e.fechaVencimiento = "Debe ser posterior al inicio.";
  return e;
}

function validarFactura(d, ultimoEmitido) {
  const e = {};
  if (!/^\d{3}$/.test(String(d.establecimiento ?? "").trim())) e.establecimiento = "3 dígitos (ej: 001).";
  if (!/^\d{3}$/.test(String(d.puntoExpedicion ?? "").trim())) e.puntoExpedicion = "3 dígitos (ej: 001).";

  const desde = Number(d.numeroDesde);
  const hasta = Number(d.numeroHasta);
  const desdeOk = String(d.numeroDesde ?? "").trim() !== "" && Number.isInteger(desde) && desde >= 1;
  const hastaOk = String(d.numeroHasta ?? "").trim() !== "" && Number.isInteger(hasta) && hasta >= 1;

  if (!desdeOk) e.numeroDesde = "Número inicial inválido.";
  if (!hastaOk) e.numeroHasta = "Número final inválido.";
  else if (desdeOk && hasta < desde) e.numeroHasta = "Debe ser mayor o igual al inicial.";
  else if (hasta < ultimoEmitido) e.numeroHasta = `Ya se emitió hasta el Nº ${ultimoEmitido}.`;
  return e;
}

/* ───────────────────────── Página ───────────────────────── */

export default function ComprobantesConfig() {
  const [timbrados, setTimbrados] = useState([]);
  const [extrasVersion, setExtrasVersion] = useState(0); // fuerza releer localStorage
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);

  // Modales independientes: uno para el timbrado, otro para la factura.
  const [modalTimbrado, setModalTimbrado] = useState(null); // null | { inicial }
  const [facturaId, setFacturaId] = useState(null);         // id del timbrado cuya factura se configura

  const avisoTimer = useRef(null);
  useEffect(() => () => clearTimeout(avisoTimer.current), []);

  function mostrarAviso(msg) {
    clearTimeout(avisoTimer.current);
    setAviso(msg);
    avisoTimer.current = setTimeout(() => setAviso(null), 4000);
  }

  const cargar = useCallback(async ({ silencioso = false } = {}) => {
    if (!silencioso) setCargando(true);
    setError(null);
    try {
      const { content } = await getTimbradosVenta({ pageSize: 200 });
      setTimbrados(content);
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // Mezcla el timbrado del back con la configuración de factura (localStorage).
  // La disponibilidad del timbrado depende solo de su fecha (vigencia), no del
  // flag activo del back, así que se muestran siempre todos los timbrados.
  const vivas = useMemo(
    () => timbrados
      .map((t) => {
      const ex = extrasDe(t.idTimbradoVenta);
      const c = {
        ...t,
        id: t.idTimbradoVenta,
        establecimiento: ex.establecimiento,
        puntoExpedicion: ex.puntoExpedicion,
        numeroDesde: ex.numeroDesde,
        numeroHasta: ex.numeroHasta,
        ultimoEmitido: ex.ultimoEmitido,
      };
      return { ...c, st: estadoComprobante(c) };
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- extrasDe es lectura de localStorage
    [timbrados, extrasVersion]
  );

  const timbradoFactura = facturaId != null ? vivas.find((v) => v.id === facturaId) : null;

  /* ── Paso 1: timbrado (solo back) ── */
  async function guardarTimbrado(form) {
    // El estado activo ya no se gestiona en el front: la disponibilidad del
    // timbrado depende solo de su fecha de vigencia.
    const payload = {
      numeroTimbrado: String(form.numeroTimbrado).trim(),
      fechaInicio: form.fechaInicio || null,
      fechaVencimiento: form.fechaVencimiento || null,
      activo: true,
    };

    const saved = form.id
      ? await actualizarTimbradoVenta(form.id, payload)
      : await crearTimbradoVenta(payload);

    await cargar({ silencioso: true });
    setModalTimbrado(null);

    if (form.id) {
      mostrarAviso("Timbrado actualizado.");
    } else {
      mostrarAviso("Timbrado registrado. Falta configurar la factura.");
      setFacturaId(saved?.idTimbradoVenta ?? null); // continúa el flujo con el paso 2
    }
  }

  /* ── Paso 2: factura (solo local) ── */
  function guardarFactura(c, datos) {
    guardarExtrasLocal(c.id, {
      establecimiento: String(datos.establecimiento).trim(),
      puntoExpedicion: String(datos.puntoExpedicion).trim(),
      numeroDesde: Math.trunc(Number(datos.numeroDesde)),
      numeroHasta: Math.trunc(Number(datos.numeroHasta)),
      ultimoEmitido: c.ultimoEmitido ?? 0, // nunca se pisa el correlativo
    });
    setExtrasVersion((v) => v + 1);
    setFacturaId(null);
    mostrarAviso("Configuración de factura guardada.");
  }

  const hayDatos = vivas.length > 0;
  const pendientes = vivas.filter((c) => !tieneRango(c)).length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader
        backTo="/configuracion"
        title="Comprobantes (DNIT)"
        subtitle="Datos legales de comprobantes otorgados por la DNIT"
      />

      {aviso && (
        <div className={`${CARD} mb-4 flex items-center gap-2 p-3 text-sm text-[var(--accent)]`}>
          <Check className="h-4 w-4" /> {aviso}
        </div>
      )}

      {error && (
        <div className={`${CARD} mb-4 flex items-center gap-2 border-red-500/30 bg-red-500/[0.06] p-3 text-sm text-red-400`}>
          <AlertTriangle className="h-4 w-4" /> {fechasIsoAEs(error)}
        </div>
      )}

      {/* Cómo funciona */}

      <div className="mb-4 flex items-center justify-between">
        <p className={LABEL}>
          {hayDatos ? `${vivas.length} timbrado(s) registrado(s)` : "Sin timbrados registrados"}
          {pendientes > 0 && <span className="ml-2 text-amber-300">· {pendientes} sin configurar factura</span>}
        </p>
        <button type="button" onClick={() => setModalTimbrado({ inicial: TIMBRADO_VACIO })} className={BTN_PRIMARIO}>
          <Plus className="h-4 w-4" /> Nuevo timbrado
        </button>
      </div>      {cargando ? (
        <div className={`${CARD} flex items-center justify-center gap-2 px-6 py-16 text-sm text-white/50`}>
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando timbrados…
        </div>
      ) : !hayDatos ? (
        <div className={`${CARD} flex flex-col items-center justify-center gap-2 px-6 py-16 text-center`}>
          <FileText className="h-10 w-10 text-white/15" />
          <p className="text-sm text-white/50">No hay comprobantes configurados.</p>
          <p className="max-w-md text-xs text-white/35">
            Registrá el timbrado otorgado por la DNIT y luego configurá su factura para habilitar la pantalla de ventas.
            Sin esta configuración, la venta queda bloqueada.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {vivas.map((c) => (
            <TarjetaTimbrado
              key={c.id}
              c={c}
              onEditarTimbrado={() =>
                setModalTimbrado({
                  inicial: {
                    id: c.id,
                    numeroTimbrado: c.numeroTimbrado,
                    fechaInicio: c.fechaInicio ?? "",
                    fechaVencimiento: c.fechaVencimiento ?? "",
                    activo: true,
                  },
                })
              }
              onConfigurarFactura={() => setFacturaId(c.id)}
            />
          ))}
        </div>
      )}

      <div className={`${CARD} mt-5 flex items-center gap-3 p-4 text-xs text-white/45`}>
        <Lock className="h-4 w-4 shrink-0 text-white/30" />
        <span>
          La venta asigna automáticamente el timbrado vigente y el número correlativo.
          Si el timbrado vence o no tiene factura configurada, la pantalla de ventas se bloquea.
        </span>
      </div>

      {modalTimbrado && (
        <TimbradoModal
          inicial={modalTimbrado.inicial}
          onCerrar={() => setModalTimbrado(null)}
          onGuardar={guardarTimbrado}
        />
      )}

      {timbradoFactura && (
        <FacturaModal
          timbrado={timbradoFactura}
          onCerrar={() => setFacturaId(null)}
          onGuardar={(datos) => guardarFactura(timbradoFactura, datos)}
        />
      )}
    </div>
  );
}

/* ───────────────────────── Tarjeta ───────────────────────── */

function formatFechaEs(iso) {
  if (!iso) return "";
  // Fechas sin hora se interpretan al mediodía LOCAL para evitar el corrimiento UTC
  // (que hacía retroceder un día en zonas UTC-3).
  const s = String(iso);
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T12:00:00`) : new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const anio = d.getFullYear();
  return `${dia}/${mes}/${anio}`;
}

function TarjetaTimbrado({ c, onEditarTimbrado, onConfigurarFactura }) {
  const configurado = tieneRango(c);

  return (
    <div className={`${CARD} overflow-hidden`}>
      {/* Timbrado */}
      <div className="flex flex-wrap items-start justify-between gap-4 px-4 py-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-semibold text-white" style={MONO}>{c.numeroTimbrado}</span>
            <span className={`rounded-none border px-2 py-0.5 text-xs ${CHIP_ESTADO[c.st.estado]}`}>
              {c.st.label}
            </span>
          </div>
          <p className="text-xs text-white/55">
            Vigencia: <span className="text-white/85">{formatFechaEs(c.fechaInicio)} → {formatFechaEs(c.fechaVencimiento)}</span>
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button type="button" onClick={onEditarTimbrado} title="Editar timbrado"
            className="rounded-none border border-white/10 bg-white/[0.03] p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40">
            <Pencil className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Factura */}
      <div className={`flex flex-wrap items-center justify-between gap-4 border-t px-4 py-3 ${configurado ? "border-white/10 bg-white/[0.015]" : "border-amber-400/20 bg-amber-400/[0.04]"}`}>
        {configurado ? (
          <div className="grid min-w-0 flex-1 grid-cols-1 gap-x-8 gap-y-1 text-xs text-white/55 sm:grid-cols-3">
            <span>Estab.-punto: <span className="text-white/85" style={MONO}>{pad3(c.establecimiento)}-{pad3(c.puntoExpedicion)}</span></span>
            <span>Rango: <span className="text-white/85" style={MONO}>{rangoDisplay(c)}</span></span>
            <span>Nº sig.: <span className="text-[var(--accent)]" style={MONO}>{numeroCompleto(c, proximoNumero(c))}</span></span>
          </div>
        ) : (
          <p className="flex items-center gap-2 text-xs text-amber-300/90">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Falta configurar la factura: establecimiento, punto de expedición y rango.
          </p>
        )}

        <button type="button" onClick={onConfigurarFactura}
          className={configurado ? `${BTN_SECUNDARIO} flex items-center gap-2 !py-2` : `${BTN_PRIMARIO} !py-2`}>
          <LayoutGrid className="h-4 w-4" />
          {configurado ? "Editar factura" : "Configurar factura"}
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────── Piezas compartidas de modal ───────────────────────── */
/* ModalShell fue promovido a components/ui/Modal.jsx (import arriba) */

function Campo({ label, requerido, ayuda, error, children }) {
  return (
    <div>
      <label className={`${LABEL} mb-1.5 block`}>
        {label} {requerido && <span className="text-red-400">*</span>}
      </label>
      {children}
      {ayuda && !error && <p className="mt-1 text-xs text-white/40">{ayuda}</p>}
      {error && (
        <p className="mt-1 flex items-center gap-1 text-xs text-red-400">
          <AlertTriangle className="h-3.5 w-3.5" /> {error}
        </p>
      )}
    </div>
  );
}

function ErrorServidor({ msg }) {
  if (!msg) return null;
  return (
    <p className="flex items-center gap-1 text-xs text-red-400">
      <AlertTriangle className="h-3.5 w-3.5" /> {fechasIsoAEs(msg)}
    </p>
  );
}

/* ───────────────────────── Modal 1: timbrado ───────────────────────── */

function TimbradoModal({ inicial, onCerrar, onGuardar }) {
  const [form, setForm] = useState({ ...TIMBRADO_VACIO, ...inicial });
  const [tocados, setTocados] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [errorServidor, setErrorServidor] = useState(null);

  const errores = validarTimbrado(form);
  const visible = (k) => (tocados[k] ? errores[k] : null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const tocar = (k) => setTocados((t) => ({ ...t, [k]: true }));
  const esNuevo = !form.id;

  async function submit(e) {
    e.preventDefault();
    if (Object.keys(errores).length > 0) {
      setTocados(Object.fromEntries(Object.keys(errores).map((k) => [k, true])));
      return;
    }
    setEnviando(true);
    setErrorServidor(null);
    try {
      await onGuardar(form);
    } catch (err) {
      setErrorServidor(apiErrorMessage(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal
      titulo={esNuevo ? "Nuevo timbrado" : `Editar timbrado ${inicial.numeroTimbrado}`}
      onCerrar={onCerrar}
      onSubmit={submit}
      textoOk={esNuevo ? "Registrar timbrado" : "Guardar cambios"}
      enviando={enviando}
    >
      <Campo label="Nº de timbrado" requerido ayuda={MSJ.numeroTimbrado} error={visible("numeroTimbrado")}>
        <input
          value={form.numeroTimbrado}
          onChange={(e) => set("numeroTimbrado", e.target.value.replace(/\D/g, "").slice(0, 8))}
          onBlur={() => tocar("numeroTimbrado")}
          placeholder="12345678"
          inputMode="numeric"
          maxLength={8}
          autoFocus
          className={`${INPUT} ${visible("numeroTimbrado") ? "border-red-500/50" : ""}`}
          style={MONO}
        />
      </Campo>

      <div>
        <label className={`${LABEL} mb-1.5 block`}>Vigencia <span className="text-red-400">*</span></label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <input type="date"
              value={form.fechaInicio}
              onChange={(e) => set("fechaInicio", e.target.value)}
              onBlur={() => tocar("fechaInicio")}
              className={`${INPUT} ${visible("fechaInicio") ? "border-red-500/50" : ""}`} />
            <p className="mt-1 text-xs text-white/40">Inicio</p>
            {visible("fechaInicio") && <p className="mt-1 text-xs text-red-400">{visible("fechaInicio")}</p>}
          </div>
          <div>
            <input type="date"
              value={form.fechaVencimiento}
              min={form.fechaInicio || undefined}
              onChange={(e) => set("fechaVencimiento", e.target.value)}
              onBlur={() => tocar("fechaVencimiento")}
              className={`${INPUT} ${visible("fechaVencimiento") ? "border-red-500/50" : ""}`} />
            <p className="mt-1 text-xs text-white/40">Vencimiento</p>
            {visible("fechaVencimiento") && <p className="mt-1 text-xs text-red-400">{visible("fechaVencimiento")}</p>}
          </div>
        </div>
      </div>

      {esNuevo && (
        <p className="text-xs text-white/40">
          Después de registrarlo vas a configurar la factura (establecimiento, punto y rango).
        </p>
      )}

      <ErrorServidor msg={errorServidor} />
    </Modal>
  );
}

/* ───────────────────────── Modal 2: configuración de factura ───────────────────────── */

function FacturaModal({ timbrado, onCerrar, onGuardar }) {
  const ultimoEmitido = timbrado.ultimoEmitido ?? 0;
  const bloqueado = ultimoEmitido > 0; // ya hay comprobantes emitidos: no se toca la base de la numeración

  const [form, setForm] = useState({
    establecimiento: String(timbrado.establecimiento ?? EXTRAS_DEFAULT.establecimiento ?? "001"),
    puntoExpedicion: String(timbrado.puntoExpedicion ?? EXTRAS_DEFAULT.puntoExpedicion ?? "001"),
    numeroDesde: String(timbrado.numeroDesde ?? EXTRAS_DEFAULT.numeroDesde ?? "1"),
    numeroHasta: timbrado.numeroHasta == null ? "" : String(timbrado.numeroHasta),
  });
  const [tocados, setTocados] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [errorServidor, setErrorServidor] = useState(null);

  const errores = validarFactura(form, ultimoEmitido);
  const visible = (k) => (tocados[k] ? errores[k] : null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const tocar = (k) => setTocados((t) => ({ ...t, [k]: true }));
  const valido = Object.keys(errores).length === 0;

  async function submit(e) {
    e.preventDefault();
    if (!valido) {
      setTocados(Object.fromEntries(Object.keys(errores).map((k) => [k, true])));
      return;
    }
    setEnviando(true);
    setErrorServidor(null);
    try {
      await onGuardar(form);
    } catch (err) {
      setErrorServidor(apiErrorMessage(err));
    } finally {
      setEnviando(false);
    }
  }

  const cantidad = valido ? Number(form.numeroHasta) - Number(form.numeroDesde) + 1 : 0;

  return (
    <Modal
      titulo={`Factura del timbrado ${timbrado.numeroTimbrado}`}
      onCerrar={onCerrar}
      onSubmit={submit}
      textoOk="Guardar configuración"
      enviando={enviando}
    >
      {bloqueado && (
        <p className="flex items-start gap-2 border border-white/10 bg-white/[0.03] p-3 text-xs text-white/55">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-white/35" />
          <span>
            Ya se emitieron comprobantes hasta el Nº {ultimoEmitido}. Establecimiento, punto y número inicial
            quedan fijos; podés ampliar el número final.
          </span>
        </p>
      )}

      <Campo
        label="Establecimiento y punto de expedición"
        requerido
        ayuda={MSJ.establecimiento}
        error={visible("establecimiento") || visible("puntoExpedicion")}
      >
        <div className="flex items-center gap-2">
          <input
            value={form.establecimiento}
            onChange={(e) => set("establecimiento", e.target.value.replace(/\D/g, "").slice(0, 3))}
            onBlur={() => tocar("establecimiento")}
            placeholder="001"
            inputMode="numeric"
            disabled={bloqueado}
            autoFocus={!bloqueado}
            className={`${INPUT} text-center ${visible("establecimiento") ? "border-red-500/50" : ""}`}
            style={MONO}
          />
          <span className="text-lg text-white/40">-</span>
          <input
            value={form.puntoExpedicion}
            onChange={(e) => set("puntoExpedicion", e.target.value.replace(/\D/g, "").slice(0, 3))}
            onBlur={() => tocar("puntoExpedicion")}
            placeholder="001"
            inputMode="numeric"
            disabled={bloqueado}
            className={`${INPUT} text-center ${visible("puntoExpedicion") ? "border-red-500/50" : ""}`}
            style={MONO}
          />
        </div>
      </Campo>

      <div>
        <label className={`${LABEL} mb-1.5 block`}>Rango de numeración <span className="text-red-400">*</span></label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <input
              value={form.numeroDesde}
              onChange={(e) => set("numeroDesde", e.target.value.replace(/\D/g, "").slice(0, 6))}
              onBlur={() => tocar("numeroDesde")}
              placeholder="1"
              inputMode="numeric"
              disabled={bloqueado}
              className={`${INPUT} text-center ${visible("numeroDesde") ? "border-red-500/50" : ""}`}
              style={MONO}
            />
            <p className="mt-1 text-xs text-white/40">Desde</p>
            {visible("numeroDesde") && <p className="mt-1 text-xs text-red-400">{visible("numeroDesde")}</p>}
          </div>
          <div>
            <input
              value={form.numeroHasta}
              onChange={(e) => set("numeroHasta", e.target.value.replace(/\D/g, "").slice(0, 6))}
              onBlur={() => tocar("numeroHasta")}
              placeholder="500"
              inputMode="numeric"
              autoFocus={bloqueado}
              className={`${INPUT} text-center ${visible("numeroHasta") ? "border-red-500/50" : ""}`}
              style={MONO}
            />
            <p className="mt-1 text-xs text-white/40">Hasta</p>
            {visible("numeroHasta") && <p className="mt-1 text-xs text-red-400">{visible("numeroHasta")}</p>}
          </div>
        </div>
        <p className="mt-1 text-xs text-white/40">{MSJ.rango}</p>
      </div>

      {/* Vista previa de la numeración resultante */}
      {valido && (
        <div className="border border-[var(--border-accent)] bg-[var(--accent-dim)] p-3 text-xs text-white/70">
          <p>
            Se emitirá de{" "}
            <span className="text-[var(--accent)]" style={MONO}>{numeroCompleto(form, Number(form.numeroDesde))}</span>
            {" "}a{" "}
            <span className="text-[var(--accent)]" style={MONO}>{numeroCompleto(form, Number(form.numeroHasta))}</span>
            {" "}({cantidad} comprobante{cantidad === 1 ? "" : "s"}).
          </p>
        </div>
      )}

      <ErrorServidor msg={errorServidor} />
    </Modal>
  );
}
