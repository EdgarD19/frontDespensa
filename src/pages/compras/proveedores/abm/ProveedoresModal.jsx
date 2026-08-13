import { useState, useEffect } from "react";
import { X } from "lucide-react";

const FORM_INICIAL = {
  nombre: "",
  tipoPersona: "FISICA",
  apellido: "",
  tipoDocumento: "",
  numeroDocumento: "",
  descripcionNegocio: "",
  personaContacto: "",
  idPais: "",
  idCiudad: "",
  direccion: "",
  fechaNacimiento: "",
  telefono: "",
  celular: "",
  formaPago: "EFECTIVO",
  banco: "",
  numeroCuenta: "",
  documentoTransferencia: "",
  nombreRazonSocial: "",
  alias: "",

};

export default function ProveedoresModal({
  abierto,
  proveedorEdit = null,
  guardando = false,
  paises = [],
  ciudades = [],

  onGuardar,
  onCerrar,
  onPaisChange,
}) {
  const [form, setForm] = useState(FORM_INICIAL);
  const [errores, setErrores] = useState({});

  useEffect(() => {
    if (!abierto) return;
    if (proveedorEdit) {
      setForm({
        nombre: proveedorEdit.nombre ?? "",
        tipoPersona: proveedorEdit.tipoPersona ?? "FISICA",
        apellido: proveedorEdit.apellido ?? "",
        tipoDocumento: proveedorEdit.tipoDocumento ?? "",
        numeroDocumento: proveedorEdit.numeroDocumento ?? "",
        descripcionNegocio: proveedorEdit.descripcionNegocio ?? "",
        personaContacto: proveedorEdit.personaContacto ?? "",
        idPais: proveedorEdit.idPais ?? "",
        idCiudad: proveedorEdit.idCiudad ?? "",
        direccion: proveedorEdit.direccion ?? "",
        fechaNacimiento: proveedorEdit.fechaNacimiento
          ? new Date(proveedorEdit.fechaNacimiento).toISOString().split("T")[0]
          : "",
        telefono: proveedorEdit.telefono ?? "",
        celular: proveedorEdit.celular ?? "",
        formaPago: proveedorEdit.formaPago ?? "EFECTIVO",
        banco: proveedorEdit.banco ?? "",
        numeroCuenta: proveedorEdit.numeroCuenta ?? "",
        documentoTransferencia: proveedorEdit.documentoTransferencia ?? "",
        nombreRazonSocial: proveedorEdit.nombreRazonSocial ?? "",
        alias: proveedorEdit.alias ?? "",
      });
      if (proveedorEdit.idPais) onPaisChange?.(proveedorEdit.idPais);
    } else {
      setForm(FORM_INICIAL);
    }
    setErrores({});
  }, [abierto, proveedorEdit]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errores[name]) setErrores((prev) => ({ ...prev, [name]: null }));
  }

  function handlePaisChange(e) {
    const val = e.target.value;
    handleChange(e);
    onPaisChange?.(val);
    setForm((prev) => ({ ...prev, idCiudad: "" }));
  }

  function validar() {
    const errs = {};
    if (!form.nombre.trim()) errs.nombre = "Requerido";
    if (!form.tipoDocumento) errs.tipoDocumento = "Requerido";
    if (!form.numeroDocumento.trim()) errs.numeroDocumento = "Requerido";
    if (!form.descripcionNegocio.trim()) errs.descripcionNegocio = "Requerido";
    if (!form.personaContacto.trim()) errs.personaContacto = "Requerido";
    if (!form.direccion.trim()) errs.direccion = "Requerido";
    return errs;
  }

  function handleSubmit() {
    const errs = validar();
    if (Object.keys(errs).length > 0) {
      setErrores(errs);
      return;
    }
    onGuardar({
      ...form,
      nombre: form.nombre.trim(),
      numeroDocumento: form.numeroDocumento.trim(),
    });
  }

  const esJuridica = form.tipoPersona === "JURIDICA";
  const esTransferencia = form.formaPago === "TRANSFERENCIA";

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="bg-[var(--bg-card)] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-white font-semibold text-lg">
            {proveedorEdit ? "Editar Proveedor" : "Nuevo Proveedor"}
          </h2>
          <button type="button" onClick={onCerrar} className="text-white/40 hover:text-white transition-colors p-1" aria-label="Cerrar">
            <X />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          {errores._general && (
            <div className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg">
              {errores._general}
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-white/50 text-xs">Tipo de persona *</label>
            <div className="flex gap-3">
              {["FISICA", "JURIDICA"].map((t) => (
                <label key={t} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="tipoPersona" value={t} checked={form.tipoPersona === t} onChange={handleChange} className="accent-[var(--accent-green)]" />
                  <span className="text-sm text-white">{t === "FISICA" ? "Persona Física" : "Persona Jurídica"}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre / Razón Social *" name="nombre" value={form.nombre} onChange={handleChange} error={errores.nombre} />
            {!esJuridica && (
              <Field label="Apellido" name="apellido" value={form.apellido} onChange={handleChange} />
            )}
          </div>

          {!esJuridica && (
            <Field label="Fecha de Nacimiento" name="fechaNacimiento" value={form.fechaNacimiento} onChange={handleChange} type="date" />
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-white/50 text-xs">Tipo de documento *</label>
              <select name="tipoDocumento" value={form.tipoDocumento} onChange={handleChange}
                className={`bg-white/5 border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--accent-green)] transition-colors ${errores.tipoDocumento ? "border-red-500/50" : "border-white/10"}`}>
                <option value="">-- Selecciona --</option>
                <option value="RUC">RUC</option>
                <option value="CI">CI</option>
              </select>
              {errores.tipoDocumento && <span className="text-red-400 text-xs">{errores.tipoDocumento}</span>}
            </div>
            <Field label="Número de documento *" name="numeroDocumento" value={form.numeroDocumento} onChange={handleChange} error={errores.numeroDocumento} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Descripción del negocio *" name="descripcionNegocio" value={form.descripcionNegocio} onChange={handleChange} error={errores.descripcionNegocio} />
            <Field label="Persona de Contacto *" name="personaContacto" value={form.personaContacto} onChange={handleChange} error={errores.personaContacto} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-white/50 text-xs">País</label>
              <select name="idPais" value={form.idPais} onChange={handlePaisChange} disabled
                className={`bg-white/5 border rounded-lg px-3 py-2 text-sm text-white/40 focus:outline-none transition-colors border-white/10 ${errores.idPais ? "border-red-500/50" : "border-white/10"}`}>
                <option value="">-- Selecciona --</option>
                {paises.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
              {errores.idPais && <span className="text-red-400 text-xs">{errores.idPais}</span>}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-white/50 text-xs">Ciudad</label>
              <select name="idCiudad" value={form.idCiudad} onChange={handleChange} disabled
                className={`bg-white/5 border rounded-lg px-3 py-2 text-sm text-white/40 focus:outline-none transition-colors border-white/10 ${errores.idCiudad ? "border-red-500/50" : "border-white/10"}`}>
                <option value="">-- Selecciona --</option>
                {ciudades.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
              {errores.idCiudad && <span className="text-red-400 text-xs">{errores.idCiudad}</span>}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-white/50 text-xs">Dirección completa *</label>
            <textarea name="direccion" value={form.direccion} onChange={handleChange} rows={2}
              className={`bg-white/5 border rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[var(--accent-green)] transition-colors resize-none ${errores.direccion ? "border-red-500/50" : "border-white/10"}`}
              placeholder="Calle, número y barrio" />
            {errores.direccion && <span className="text-red-400 text-xs">{errores.direccion}</span>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Teléfono" name="telefono" value={form.telefono} onChange={handleChange} type="tel" />
            <Field label="Celular" name="celular" value={form.celular} onChange={handleChange} type="tel" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-white/50 text-xs">Forma de pago</label>
            <div className="flex gap-3">
              {["EFECTIVO", "TRANSFERENCIA"].map((f) => (
                <label key={f} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="formaPago" value={f} checked={form.formaPago === f} onChange={handleChange} className="accent-[var(--accent-green)]" />
                  <span className="text-sm text-white">{f === "EFECTIVO" ? "Efectivo" : "Transferencia"}</span>
                </label>
              ))}
            </div>
          </div>

          {esTransferencia && (
            <div className="border border-white/10 rounded-lg p-4 space-y-3">
              <h3 className="text-white/50 text-xs font-semibold">Datos de Transferencia</h3>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Banco" name="banco" value={form.banco} onChange={handleChange} />
                <Field label="Número de cuenta" name="numeroCuenta" value={form.numeroCuenta} onChange={handleChange} />
                <Field label="Documento" name="documentoTransferencia" value={form.documentoTransferencia} onChange={handleChange} />
                <Field label="Nombre o Razón Social" name="nombreRazonSocial" value={form.nombreRazonSocial} onChange={handleChange} />
                <Field label="Alias (opcional)" name="alias" value={form.alias} onChange={handleChange} />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10">
          <button type="button" onClick={onCerrar} className="px-4 py-2 text-sm text-white/60 hover:text-white transition-colors">Cancelar</button>
          <button type="button" onClick={handleSubmit} disabled={guardando}
            className="px-5 py-2 text-sm font-medium bg-[var(--accent-green)] text-black rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">
            {guardando ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, name, value, onChange, type = "text", placeholder = "", error }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-white/50 text-xs">{label}</label>
      <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder}
        className={`bg-white/5 border rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[var(--accent-green)] transition-colors ${error ? "border-red-500/50" : "border-white/10"}`} />
      {error && <span className="text-red-400 text-xs">{error}</span>}
    </div>
  );
}
