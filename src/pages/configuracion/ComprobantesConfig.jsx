import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Plus, FileText, Pencil, Trash2, Power, ShieldCheck,
  AlertTriangle, Check, X, Hash, CalendarDays, LayoutGrid, ListOrdered, Lock,
} from "lucide-react";
import {
  getComprobantes, persistComprobantes, nuevoId,
  estadoComprobante, numeroCompleto, rangoDisplay, proximoNumero, pad3, pad6,
} from "../../api/comprobantesApi";

const CARD = "rounded-none border border-white/10 bg-white/[0.02]";
const LABEL = "text-[11px] font-medium uppercase tracking-[0.14em] text-white/50";
const MONO = { fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" };
const INPUT = "h-11 w-full rounded-none border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[var(--accent)]";

const CHIP_ESTADO = {
  vigente: "border-[var(--border-accent)] bg-[var(--accent-dim)] text-[var(--accent)]",
  vencido: "border-red-500/30 bg-red-500/10 text-red-400",
  sin_iniciar: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  agotado: "border-red-500/30 bg-red-500/10 text-red-400",
  sin_configuracion: "border-white/10 bg-white/[0.06] text-white/50",
};

const MSJ = {
  numeroTimbrado: "El número de timbrado es el código único de 8 dígitos otorgado por la DNIT.",
  fechas: "Período de vigencia del timbrado autorizado.",
  establecimiento: "Formato 001-001: establecimiento y punto de expedición.",
  rango: "Numeración autorizada, por ejemplo 000001 hasta 000500.",
};

function validar(d) {
  const e = {};
  if (!/^\d{8}$/.test(String(d.numeroTimbrado).trim()))
    e.numeroTimbrado = "Ingresá los 8 dígitos del timbrado.";
  if (!/^\d{3}$/.test(String(d.establecimiento).trim()))
    e.establecimiento = "3 dígitos (ej: 001).";
  if (!/^\d{3}$/.test(String(d.puntoExpedicion).trim()))
    e.puntoExpedicion = "3 dígitos (ej: 001).";
  const desde = Math.trunc(Number(d.numeroDesde));
  const hasta = Math.trunc(Number(d.numeroHasta));
  if (!Number.isFinite(desde) || String(d.numeroDesde).trim() === "" || desde < 1)
    e.numeroDesde = "Número inicial del rango.";
  if (!Number.isFinite(hasta) || String(d.numeroHasta).trim() === "")
    e.numeroHasta = "Número final del rango.";
  else if (Number.isFinite(desde) && hasta < desde)
    e.numeroHasta = "Debe ser mayor o igual al inicial.";
  if (!d.fechaInicio) e.fechaInicio = "Requerida.";
  if (!d.fechaVencimiento) e.fechaVencimiento = "Requerida.";
  else if (d.fechaInicio && d.fechaVencimiento < d.fechaInicio)
    e.fechaVencimiento = "Debe ser posterior a la fecha de inicio.";
  return e;
}

const VACIO = {
  id: "", activo: true, numeroTimbrado: "", establecimiento: "001", puntoExpedicion: "001",
  numeroDesde: 1, numeroHasta: "", fechaInicio: "", fechaVencimiento: "", ultimoEmitido: 0,
};

export default function ComprobantesConfig() {
  const [lista, setLista] = useState(() => getComprobantes());
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [aviso, setAviso] = useState(null);

  const vivas = useMemo(
    () => lista.map((c) => ({ ...c, st: estadoComprobante(c) })),
    [lista]
  );

  function guardar(d) {
    const existe = lista.some((c) => c.id === d.id);
    const next = existe ? lista.map((c) => (c.id === d.id ? d : c)) : [...lista, d];
    persistComprobantes(next);
    setLista(next);
    setShowModal(false);
    setEditando(null);
    mostrarAviso(existe ? "Timbrado actualizado." : "Timbrado registrado.");
  }

  function eliminar(c) {
    const next = lista.filter((x) => x.id !== c.id);
    persistComprobantes(next);
    setLista(next);
    mostrarAviso(`Timbrado ${c.numeroTimbrado} eliminado.`);
  }

  function toggleActivo(c) {
    const next = lista.map((x) => (x.id === c.id ? { ...x, activo: !x.activo } : x));
    persistComprobantes(next);
    setLista(next);
    mostrarAviso(c.activo ? "Timbrado desactivado." : "Timbrado activado.");
  }

  function mostrarAviso(msg) {
    setAviso(msg);
    setTimeout(() => setAviso(null), 4000);
  }

  const hayDatos = vivas.length > 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link to="/configuracion" aria-label="Volver"
          className="rounded-none p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white">
          <ArrowLeft size={18} />
        </Link>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Configuración de comprobantes</h1>
          <p className="text-sm text-white/40">Datos legales de comprobantes otorgados por la DNIT</p>
        </div>
      </div>

      {aviso && (
        <div className={`${CARD} mb-4 flex items-center gap-2 p-3 text-sm text-[var(--accent)]`}>
          <Check className="h-4 w-4" /> {aviso}
        </div>
      )}

      {/* Ayuda */}
      <div className={`${CARD} mb-5 grid grid-cols-1 gap-3 p-4 md:grid-cols-2 lg:grid-cols-4`} style={{ fontSize: "12px" }}>
        <div className="flex items-start gap-2 text-white/55">
          <Hash className="mt-0.5 h-4 w-4 shrink-0 text-white/35" />
          <span><strong className="text-white/80">Nº de timbrado:</strong> {MSJ.numeroTimbrado}</span>
        </div>
        <div className="flex items-start gap-2 text-white/55">
          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-white/35" />
          <span><strong className="text-white/80">Vigencia:</strong> {MSJ.fechas}</span>
        </div>
        <div className="flex items-start gap-2 text-white/55">
          <LayoutGrid className="mt-0.5 h-4 w-4 shrink-0 text-white/35" />
          <span><strong className="text-white/80">Establecimiento:</strong> {MSJ.establecimiento}</span>
        </div>
        <div className="flex items-start gap-2 text-white/55">
          <ListOrdered className="mt-0.5 h-4 w-4 shrink-0 text-white/35" />
          <span><strong className="text-white/80">Rango:</strong> {MSJ.rango}</span>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <p className={`${LABEL}`}>{hayDatos ? `${vivas.length} timbrado(s) registrado(s)` : "Sin timbrados registrados"}</p>
        <button type="button" onClick={() => { setEditando(null); setShowModal(true); }}
          className="flex items-center gap-2 rounded-none bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[var(--accent-hover)]">
          <Plus className="h-4 w-4" /> Nuevo timbrado
        </button>
      </div>

      {!hayDatos ? (
        <div className={`${CARD} flex flex-col items-center justify-center gap-2 px-6 py-16 text-center`}>
          <FileText className="h-10 w-10 text-white/15" />
          <p className="text-sm text-white/50">No hay comprobantes configurados.</p>
          <p className="max-w-md text-xs text-white/35">
            Registrá el timbrado otorgado por la DNIT para habilitar la pantalla de ventas.
            Sin esta configuración, la venta queda bloqueada.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {vivas.map((c) => (
            <div key={c.id} className={`${CARD} overflow-hidden`}>
              <div className="flex flex-wrap items-start justify-between gap-4 px-4 py-4">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-semibold text-white" style={MONO}>{c.numeroTimbrado}</span>
                    <span className={`rounded-none border px-2 py-0.5 text-xs ${CHIP_ESTADO[c.st.estado]}`}>
                      {c.st.label}
                    </span>
                    {c.activo && (
                      <span className="flex items-center gap-1 rounded-none border border-[var(--border-accent)] bg-[var(--accent-dim)] px-2 py-0.5 text-xs text-[var(--accent)]">
                        <ShieldCheck className="h-3.5 w-3.5" /> Activo
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-x-8 gap-y-1 text-xs text-white/55 sm:grid-cols-2 lg:grid-cols-4">
                    <span>Estab.-punto: <span className="text-white/85" style={MONO}>{pad3(c.establecimiento)}-{pad3(c.puntoExpedicion)}</span></span>
                    <span>Vigencia: <span className="text-white/85">{c.fechaInicio} → {c.fechaVencimiento}</span></span>
                    <span>Rango: <span className="text-white/85" style={MONO}>{rangoDisplay(c)}</span></span>
                    <span>Nº sig.: <span className="text-[var(--accent)]" style={MONO}>{numeroCompleto(c, proximoNumero(c))}</span></span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <button type="button" onClick={() => toggleActivo(c)} title={c.activo ? "Desactivar" : "Activar"}
                    className={`rounded-none border p-2 transition-colors ${c.activo ? "border-[var(--border-accent)] bg-[var(--accent-dim)] text-[var(--accent)] hover:brightness-125" : "border-white/10 bg-white/[0.03] text-white/40 hover:bg-white/10 hover:text-white"}`}>
                    <Power className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => { setEditando(c); setShowModal(true); }} title="Editar"
                    className="rounded-none border border-white/10 bg-white/[0.03] p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => eliminar(c)} title="Eliminar"
                    className="rounded-none border border-white/10 bg-white/[0.03] p-2 text-white/40 transition-colors hover:bg-red-500/10 hover:text-red-400">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={`${CARD} mt-5 flex items-center gap-3 p-4 text-xs text-white/45`}>
        <Lock className="h-4 w-4 shrink-0 text-white/30" />
        <span>
          La venta asigna automáticamente el timbrado vigente y el número correlativo.
          Si el timbrado vence o se agota el rango, la pantalla de ventas se bloquea.
        </span>
      </div>

      {showModal && (
        <NuevoTimbradoModal
          inicial={editando ? { ...editando } : VACIO}
          onCerrar={() => setShowModal(false)}
          onGuardar={guardar}
        />
      )}
    </div>
  );
}

function NuevoTimbradoModal({ inicial, onCerrar, onGuardar }) {
  const [form, setForm] = useState({
    ...inicial,
    numeroDesde: inicial.numeroDesde ?? 1,
    numeroHasta: inicial.numeroHasta ?? "",
  });
  const [tocados, setTocados] = useState({});
  const errores = validar(form);
  const visible = (k) => tocados[k] ? errores[k] : null;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const puedeGuardar = Object.keys(errores).length === 0;
  const esNuevo = !form.id;

  function submit(e) {
    e.preventDefault();
    if (!puedeGuardar) {
      const todos = Object.fromEntries(Object.keys(errores).map((k) => [k, true]));
      setTocados(todos);
      return;
    }
    onGuardar({
      ...form,
      id: form.id || nuevoId(),
      numeroTimbrado: String(form.numeroTimbrado).trim(),
      numeroDesde: Math.trunc(Number(form.numeroDesde)),
      numeroHasta: Math.trunc(Number(form.numeroHasta)),
      ultimoEmitido: esNuevo ? 0 : form.ultimoEmitido ?? 0,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form onSubmit={submit} className="flex w-full max-w-lg flex-col overflow-hidden rounded-none border border-white/10 bg-[#0c0c0e] shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-base font-semibold text-white">
            {esNuevo ? "Nuevo timbrado" : `Editar timbrado ${form.numeroTimbrado}`}
          </h2>
          <button type="button" onClick={onCerrar} aria-label="Cerrar"
            className="rounded-none p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-4 py-4">
          {/* Número de timbrado */}
          <div>
            <label className={`${LABEL} mb-1.5 block`}>Nº de timbrado <span className="text-red-400">*</span></label>
            <input
              value={form.numeroTimbrado}
              onChange={(e) => set("numeroTimbrado", e.target.value.replace(/\D/g, "").slice(0, 8))}
              onBlur={() => setTocados((t) => ({ ...t, numeroTimbrado: true }))}
              placeholder="12345678"
              inputMode="numeric"
              maxLength={8}
              className={`${INPUT} ${visible("numeroTimbrado") ? "border-red-500/50" : ""}`}
              style={MONO}
            />
            <p className="mt-1 text-xs text-white/40">{MSJ.numeroTimbrado}</p>
            {visible("numeroTimbrado") && <p className="mt-1 flex items-center gap-1 text-xs text-red-400"><AlertTriangle className="h-3.5 w-3.5" /> {visible("numeroTimbrado")}</p>}
          </div>

          {/* Establecimiento y punto */}
          <div>
            <label className={`${LABEL} mb-1.5 block`}>Establecimiento y punto de expedición <span className="text-red-400">*</span></label>
            <div className="flex items-center gap-2">
              <input
                value={form.establecimiento}
                onChange={(e) => set("establecimiento", e.target.value.replace(/\D/g, "").slice(0, 3))}
                onBlur={() => setTocados((t) => ({ ...t, establecimiento: true }))}
                placeholder="001"
                inputMode="numeric"
                className={`${INPUT} text-center ${visible("establecimiento") ? "border-red-500/50" : ""}`}
                style={MONO}
              />
              <span className="text-lg text-white/40">-</span>
              <input
                value={form.puntoExpedicion}
                onChange={(e) => set("puntoExpedicion", e.target.value.replace(/\D/g, "").slice(0, 3))}
                onBlur={() => setTocados((t) => ({ ...t, puntoExpedicion: true }))}
                placeholder="001"
                inputMode="numeric"
                className={`${INPUT} text-center ${visible("puntoExpedicion") ? "border-red-500/50" : ""}`}
                style={MONO}
              />
            </div>
            {(visible("establecimiento") || visible("puntoExpedicion")) && (
              <p className="mt-1 flex items-center gap-1 text-xs text-red-400">
                <AlertTriangle className="h-3.5 w-3.5" /> {visible("establecimiento") || visible("puntoExpedicion")}
              </p>
            )}
          </div>

          {/* Vigencia */}
          <div>
            <label className={`${LABEL} mb-1.5 block`}>Fecha de vigencia <span className="text-red-400">*</span></label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input type="date"
                  value={form.fechaInicio}
                  onChange={(e) => set("fechaInicio", e.target.value)}
                  onBlur={() => setTocados((t) => ({ ...t, fechaInicio: true }))}
                  className={`${INPUT} ${visible("fechaInicio") ? "border-red-500/50" : ""}`} />
                <p className="mt-1 text-xs text-white/40">Inicio</p>
                {visible("fechaInicio") && <p className="mt-1 text-xs text-red-400">{visible("fechaInicio")}</p>}
              </div>
              <div>
                <input type="date"
                  value={form.fechaVencimiento}
                  min={form.fechaInicio || undefined}
                  onChange={(e) => set("fechaVencimiento", e.target.value)}
                  onBlur={() => setTocados((t) => ({ ...t, fechaVencimiento: true }))}
                  className={`${INPUT} ${visible("fechaVencimiento") ? "border-red-500/50" : ""}`} />
                <p className="mt-1 text-xs text-white/40">Vencimiento</p>
                {visible("fechaVencimiento") && <p className="mt-1 text-xs text-red-400">{visible("fechaVencimiento")}</p>}
              </div>
            </div>
          </div>

          {/* Rango */}
          <div>
            <label className={`${LABEL} mb-1.5 block`}>Rango de numeración <span className="text-red-400">*</span></label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`${INPUT} pointer-events-none w-16 text-center text-white/40`} style={MONO}>Desde</span>
                  <input
                    value={form.numeroDesde}
                    onChange={(e) => set("numeroDesde", e.target.value.replace(/\D/g, "").slice(0, 6))}
                    onBlur={() => setTocados((t) => ({ ...t, numeroDesde: true }))}
                    placeholder="000001"
                    inputMode="numeric"
                    className={`${INPUT} text-center ${visible("numeroDesde") ? "border-red-500/50" : ""}`}
                    style={MONO}
                  />
                </div>
                {visible("numeroDesde") && <p className="mt-1 text-xs text-red-400">{visible("numeroDesde")}</p>}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`${INPUT} pointer-events-none w-14 text-center text-white/40`} style={MONO}>hasta</span>
                  <input
                    value={form.numeroHasta}
                    onChange={(e) => set("numeroHasta", e.target.value.replace(/\D/g, "").slice(0, 6))}
                    onBlur={() => setTocados((t) => ({ ...t, numeroHasta: true }))}
                    placeholder="000500"
                    inputMode="numeric"
                    className={`${INPUT} text-center ${visible("numeroHasta") ? "border-red-500/50" : ""}`}
                    style={MONO}
                  />
                </div>
                {visible("numeroHasta") && <p className="mt-1 text-xs text-red-400">{visible("numeroHasta")}</p>}
              </div>
            </div>
            <p className="mt-1 text-xs text-white/40">{MSJ.rango}</p>
          </div>

          {/* Activo */}
          <label className="flex cursor-pointer items-center gap-2 text-sm text-white/70">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(e) => set("activo", e.target.checked)}
              className="accent-[var(--accent)]"
            />
            Timbrado activo (lo usará la pantalla de ventas)
          </label>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-white/10 px-4 py-3">
          <button type="button" onClick={onCerrar}
            className="rounded-none border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white/70 transition-colors hover:text-white">
            Cancelar
          </button>
          <button type="submit" disabled={!puedeGuardar}
            className="rounded-none bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-40">
            {esNuevo ? "Registrar timbrado" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}