import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Building2, Check, AlertTriangle, Loader2 } from "lucide-react";
import {
  getConfiguracionEmpresa,
  actualizarConfiguracionEmpresa,
} from "../../api/configuracionEmpresaApi";
import { apiErrorMessage } from "../../api/errors";

const CARD = "rounded-none border border-white/10 bg-white/[0.02]";
const LABEL = "text-[11px] font-medium uppercase tracking-[0.14em] text-white/50";
const INPUT =
  "h-11 w-full rounded-none border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50";
const TEXTAREA =
  "min-h-[88px] w-full resize-y rounded-none border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50";
const BTN_PRIMARIO =
  "flex items-center gap-2 rounded-none bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-40";

const VACIO = {
  razonSocial: "",
  nombreComercial: "",
  ruc: "",
  direccion: "",
  telefono: "",
  ciudad: "",
  email: "",
  sitioWeb: "",
  pieTicket: "",
  activo: true,
};

function fromResponse(r) {
  if (!r || typeof r !== "object") return { ...VACIO };
  return {
    razonSocial: r.razonSocial ?? "",
    nombreComercial: r.nombreComercial ?? "",
    ruc: r.ruc ?? "",
    direccion: r.direccion ?? "",
    telefono: r.telefono ?? "",
    ciudad: r.ciudad ?? "",
    email: r.email ?? "",
    sitioWeb: r.sitioWeb ?? "",
    pieTicket: r.pieTicket ?? "",
    activo: r.activo !== false,
  };
}

function validar(form) {
  const e = {};
  const email = String(form.email ?? "").trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    e.email = "Email no válido.";
  }
  if (String(form.razonSocial ?? "").trim().length > 150) e.razonSocial = "Máximo 150 caracteres.";
  if (String(form.nombreComercial ?? "").trim().length > 150) e.nombreComercial = "Máximo 150 caracteres.";
  if (String(form.ruc ?? "").trim().length > 20) e.ruc = "Máximo 20 caracteres.";
  if (String(form.direccion ?? "").trim().length > 200) e.direccion = "Máximo 200 caracteres.";
  if (String(form.telefono ?? "").trim().length > 30) e.telefono = "Máximo 30 caracteres.";
  if (String(form.ciudad ?? "").trim().length > 80) e.ciudad = "Máximo 80 caracteres.";
  if (email.length > 100) e.email = "Máximo 100 caracteres.";
  if (String(form.sitioWeb ?? "").trim().length > 100) e.sitioWeb = "Máximo 100 caracteres.";
  if (String(form.pieTicket ?? "").length > 500) e.pieTicket = "Máximo 500 caracteres.";
  return e;
}

function Campo({ id, label, error, children, hint }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className={LABEL}>{label}</label>
      {children}
      {error ? (
        <p className="text-xs text-red-400">{error}</p>
      ) : hint ? (
        <p className="text-xs text-white/30">{hint}</p>
      ) : null}
    </div>
  );
}

export default function EmpresaConfig() {
  const [form, setForm] = useState(VACIO);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [errores, setErrores] = useState({});
  const [aviso, setAviso] = useState(null);
  const [meta, setMeta] = useState(null);
  const avisoTimer = useRef(null);

  useEffect(() => () => clearTimeout(avisoTimer.current), []);

  function mostrarAviso(msg) {
    clearTimeout(avisoTimer.current);
    setAviso(msg);
    avisoTimer.current = setTimeout(() => setAviso(null), 4000);
  }

  const set = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    setErrores((prev) => {
      if (!prev[campo]) return prev;
      const next = { ...prev };
      delete next[campo];
      return next;
    });
  };

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await getConfiguracionEmpresa();
      setForm(fromResponse(data));
      setMeta({
        idConfiguracion: data?.idConfiguracion,
        fechaActualizacion: data?.fechaActualizacion,
      });
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const guardar = async (e) => {
    e.preventDefault();
    const v = validar(form);
    setErrores(v);
    if (Object.keys(v).length > 0) return;

    setGuardando(true);
    setError(null);
    try {
      const payload = {
        razonSocial: String(form.razonSocial).trim() || null,
        nombreComercial: String(form.nombreComercial).trim() || null,
        ruc: String(form.ruc).trim() || null,
        direccion: String(form.direccion).trim() || null,
        telefono: String(form.telefono).trim() || null,
        ciudad: String(form.ciudad).trim() || null,
        email: String(form.email).trim() || null,
        sitioWeb: String(form.sitioWeb).trim() || null,
        pieTicket: String(form.pieTicket).trim() || null,
        activo: Boolean(form.activo),
      };
      const data = await actualizarConfiguracionEmpresa(payload);
      setForm(fromResponse(data));
      setMeta({
        idConfiguracion: data?.idConfiguracion,
        fechaActualizacion: data?.fechaActualizacion,
      });
      mostrarAviso("Configuración de empresa guardada.");
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link
          to="/configuracion"
          aria-label="Volver"
          className="rounded-none p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Datos de la empresa</h1>
          <p className="text-sm text-white/40">
            Razón social, RUC y datos que aparecen en el ticket de venta
          </p>
        </div>
      </div>

      {aviso && (
        <div className={`${CARD} mb-4 flex items-center gap-2 p-3 text-sm text-[var(--accent)]`}>
          <Check className="h-4 w-4" /> {aviso}
        </div>
      )}

      {error && (
        <div className={`${CARD} mb-4 flex items-center gap-2 border-red-500/30 bg-red-500/[0.06] p-3 text-sm text-red-400`}>
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}

      {cargando ? (
        <div className={`${CARD} flex items-center justify-center gap-2 px-6 py-16 text-sm text-white/50`}>
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando configuración…
        </div>
      ) : (
        <form onSubmit={guardar} className={`${CARD} space-y-5 p-5`}>
          <div className="flex items-start gap-3 border-b border-white/10 pb-4">
            <div className="flex h-10 w-10 items-center justify-center border border-white/10 bg-white/[0.04] text-white/60">
              <Building2 className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-medium text-white">Identidad comercial</p>
              <p className="text-xs text-white/40">
                Estos datos se usan al emitir el ticket de factura de venta.
              </p>
              {meta?.fechaActualizacion && (
                <p className="text-[11px] text-white/30">
                  Última actualización: {String(meta.fechaActualizacion).replace("T", " ").slice(0, 19)}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo id="razonSocial" label="Razón social" error={errores.razonSocial}>
              <input
                id="razonSocial"
                className={INPUT}
                value={form.razonSocial}
                onChange={(e) => set("razonSocial", e.target.value)}
                maxLength={150}
                disabled={guardando}
                placeholder="Ej: Juan Perez"
              />
            </Campo>
            <Campo id="nombreComercial" label="Nombre comercial" error={errores.nombreComercial}>
              <input
                id="nombreComercial"
                className={INPUT}
                value={form.nombreComercial}
                onChange={(e) => set("nombreComercial", e.target.value)}
                maxLength={150}
                disabled={guardando}
                placeholder="Nombre de fantasía"
              />
            </Campo>
            <Campo id="ruc" label="RUC" error={errores.ruc}>
              <input
                id="ruc"
                className={INPUT}
                value={form.ruc}
                onChange={(e) => set("ruc", e.target.value)}
                maxLength={20}
                disabled={guardando}
                placeholder="80000000-0"
              />
            </Campo>
            <Campo id="telefono" label="Teléfono" error={errores.telefono}>
              <input
                id="telefono"
                className={INPUT}
                value={form.telefono}
                onChange={(e) => set("telefono", e.target.value)}
                maxLength={30}
                disabled={guardando}
                placeholder="021 XXX XXX"
              />
            </Campo>
            <Campo id="ciudad" label="Ciudad" error={errores.ciudad}>
              <input
                id="ciudad"
                className={INPUT}
                value={form.ciudad}
                onChange={(e) => set("ciudad", e.target.value)}
                maxLength={80}
                disabled={guardando}
                placeholder="Asunción"
              />
            </Campo>
            <Campo id="email" label="Email" error={errores.email}>
              <input
                id="email"
                type="email"
                className={INPUT}
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                maxLength={100}
                disabled={guardando}
                placeholder="contacto@empresa.com"
              />
            </Campo>
            <div className="sm:col-span-2">
              <Campo id="direccion" label="Dirección" error={errores.direccion}>
                <input
                  id="direccion"
                  className={INPUT}
                  value={form.direccion}
                  onChange={(e) => set("direccion", e.target.value)}
                  maxLength={200}
                  disabled={guardando}
                  placeholder="Calle, número, barrio"
                />
              </Campo>
            </div>
            <div className="sm:col-span-2">
              <Campo id="sitioWeb" label="Sitio web" error={errores.sitioWeb}>
                <input
                  id="sitioWeb"
                  className={INPUT}
                  value={form.sitioWeb}
                  onChange={(e) => set("sitioWeb", e.target.value)}
                  maxLength={100}
                  disabled={guardando}
                  placeholder="https://…"
                />
              </Campo>
            </div>
            <div className="sm:col-span-2">
              <Campo
                id="pieTicket"
                label="Pie del ticket"
                error={errores.pieTicket}
                hint="Texto que se imprime al final del comprobante."
              >
                <textarea
                  id="pieTicket"
                  className={TEXTAREA}
                  value={form.pieTicket}
                  onChange={(e) => set("pieTicket", e.target.value)}
                  maxLength={500}
                  disabled={guardando}
                  placeholder="¡Gracias por su compra!"
                />
              </Campo>
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-3 border-t border-white/10 pt-4">
            <input
              type="checkbox"
              checked={Boolean(form.activo)}
              onChange={(e) => set("activo", e.target.checked)}
              disabled={guardando}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            <span className="text-sm text-white/80">Configuración activa</span>
          </label>

          <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
            <button type="submit" disabled={guardando} className={BTN_PRIMARIO}>
              {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {guardando ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
