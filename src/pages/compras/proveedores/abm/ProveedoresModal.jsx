import { useState, useEffect } from "react";
import { X } from "lucide-react";

const inputClass =
  "w-full rounded-none border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:border-[var(--accent)] outline-none transition-colors";

const selectClass =
  "w-full rounded-none border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-white focus:border-[var(--accent)] outline-none cursor-pointer transition-colors";

const labelClass = "block space-y-0.5";

const labelText = "text-[11px] text-white/50";

const FORM_INICIAL = {
  nombre: "",
  tipoPersona: "FISICA",
  apellido: "",
  numeroDocumento: "",
  descripcionNegocio: "",
  personaContacto: "",
  idPais: "",
  idCiudad: "",
  direccion: "",
  telefono: "",
  celular: "",
  email: "",
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
        numeroDocumento: proveedorEdit.numeroDocumento ?? "",
        descripcionNegocio: proveedorEdit.descripcion ?? "",
        personaContacto: proveedorEdit.personaContacto ?? "",
        idPais: proveedorEdit.idPais ?? "",
        idCiudad: proveedorEdit.idCiudad ?? "",
        direccion: proveedorEdit.direccion ?? "",
        telefono: proveedorEdit.telefono ?? "",
        celular: proveedorEdit.celular ?? "",
        email: proveedorEdit.email ?? "",
      });
      onPaisChange?.(proveedorEdit.idPais);
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

  const esJuridica = form.tipoPersona === "JURIDICA";

  const docDocument = form.numeroDocumento ?? "";
  const idxGuion = docDocument.lastIndexOf("-");
  const baseDoc = idxGuion !== -1 ? docDocument.slice(0, idxGuion) : docDocument;
  const dvDoc = idxGuion !== -1 ? docDocument.slice(idxGuion + 1) : "";

  function handleDocBaseChange(e) {
    const solo = e.target.value.replace(/\D/g, "").slice(0, 8);
    setForm((prev) => ({ ...prev, numeroDocumento: dvDoc ? `${solo}-${dvDoc}` : solo }));
  }

  function handleDocDvChange(e) {
    const dv = e.target.value.replace(/\D/g, "").slice(0, 1);
    setForm((prev) => ({ ...prev, numeroDocumento: dv ? `${baseDoc}-${dv}` : baseDoc }));
  }

  const celularResto = form.celular?.startsWith("+595")
    ? form.celular.slice(4)
    : form.celular ?? "";

  function handleCelularChange(e) {
    const solo = e.target.value.replace(/\D/g, "").slice(0, 9);
    setForm((prev) => ({ ...prev, celular: solo ? `+595${solo}` : "" }));
  }

  const telefonoResto = form.telefono?.startsWith("021")
    ? form.telefono.slice(3)
    : form.telefono ?? "";

  function handleTelefonoChange(e) {
    const solo = e.target.value.replace(/\D/g, "").slice(0, 6);
    setForm((prev) => ({ ...prev, telefono: solo ? `021${solo}` : "" }));
  }

  const handleTipoPersonaChange = (value) => {
    setForm((prev) => ({
      ...prev,
      tipoPersona: value,
      apellido: value === "JURIDICA" ? "" : prev.apellido,
    }));
    if (errores.apellido) setErrores((prev) => ({ ...prev, apellido: null }));
  };

  function handlePaisChange(e) {
    const val = e.target.value;
    setForm((prev) => ({ ...prev, idPais: val, idCiudad: "" }));
    onPaisChange?.(val);
  }

  function validar() {
    const errs = {};
    const esJuridica = form.tipoPersona === "JURIDICA";
    if (!form.nombre.trim()) errs.nombre = "Requerido";
    if (!form.numeroDocumento.trim()) {
      errs.numeroDocumento = "Requerido";
    } else if (esJuridica) {
      const ruc = form.numeroDocumento.trim();
      if (!/^80\d{6}-\d$/.test(ruc)) {
        errs.numeroDocumento = "El RUC debe empezar con 80, tener 8 dígitos y 1 dígito verificador";
      }
    } else if (!/^\d{6,8}-\d$/.test(form.numeroDocumento.trim())) {
      errs.numeroDocumento = "La cédula debe tener de 6 a 8 dígitos y 1 dígito verificador";
    }
    if (
      form.telefono &&
      !/^021\d{6}$/.test(form.telefono.trim())
    ) {
      errs.telefono = "Debés ingresar los 6 números del teléfono (formato 021 XXXXXX)";
    }
    if (form.celular && !/^\+5959\d{8}$/.test(form.celular.trim())) {
      errs.celular = "Debés ingresar los 9 números del celular (formato +5959XXXXXXXX)";
    }
    const email = form.email?.trim() ?? "";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = "Email inválido";
    }
    if (!esJuridica && !form.apellido.trim()) errs.apellido = "Requerido";
    if (!form.idPais) errs.idPais = "Requerido";
    if (!form.idCiudad) errs.idCiudad = "Requerido";
    return errs;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validar();
    if (Object.keys(errs).length > 0) {
      setErrores(errs);
      return;
    }
    onGuardar({
      ...form,
      nombre: form.nombre.trim(),
      numeroDocumento: form.numeroDocumento.trim(),
      tipoDocumento: form.tipoPersona === "JURIDICA" ? "RUC" : "CI",
    });
  }

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="bg-[#0c0c0e] border border-white/10 rounded-none w-full max-w-2xl flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 shrink-0">
          <h2 className="text-sm font-semibold text-white">
            {proveedorEdit ? "Editar Proveedor" : "Nuevo Proveedor"}
          </h2>
          <button type="button" onClick={onCerrar}
            className="p-1 rounded text-white/40 hover:text-white hover:bg-[#1a1f2e] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-2.5">

          {/* Tipo de persona */}
          <div>
            <span className={labelText}>Tipo de persona *</span>
            <div className="flex items-center gap-4 mt-1">
              <label className={`flex items-center gap-1.5 ${proveedorEdit ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
                <input
                  type="radio"
                  name="tipoPersona"
                  value="FISICA"
                  checked={form.tipoPersona === "FISICA"}
                  onChange={(e) => handleTipoPersonaChange(e.target.value)}
                  disabled={!!proveedorEdit}
                  className="accent-[var(--accent)]"
                />
                <span className="text-xs text-white/70">Persona Física</span>
              </label>
              <label className={`flex items-center gap-1.5 ${proveedorEdit ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
                <input
                  type="radio"
                  name="tipoPersona"
                  value="JURIDICA"
                  checked={form.tipoPersona === "JURIDICA"}
                  onChange={(e) => handleTipoPersonaChange(e.target.value)}
                  disabled={!!proveedorEdit}
                  className="accent-[var(--accent)]"
                />
                <span className="text-xs text-white/70">Persona Jurídica</span>
              </label>
            </div>
          </div>

          {/* Nombre + Apellido */}
          <div className="grid grid-cols-2 gap-3">
            <label className={labelClass}>
              <span className={labelText}>
                {esJuridica ? "Razón social" : "Nombre"} <span className="text-rose-400">*</span>
              </span>
              <input
                type="text"
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                required
                placeholder={esJuridica ? "Razón social" : "Nombre"}
                className={inputClass}
              />
              {errores.nombre && <span className="text-[11px] text-rose-400">{errores.nombre}</span>}
            </label>

            {!esJuridica && (
              <label className={labelClass}>
                <span className={labelText}>Apellido <span className="text-rose-400">*</span></span>
                <input
                  type="text"
                  name="apellido"
                  value={form.apellido}
                  onChange={handleChange}
                  required
                  placeholder="Apellido"
                  className={inputClass}
                />
                {errores.apellido && <span className="text-[11px] text-rose-400">{errores.apellido}</span>}
              </label>
            )}
          </div>

          {/* Numero documento + Persona contacto */}
          <div className="grid grid-cols-2 gap-3">
            <label className={labelClass}>
              <span className={labelText}>
                {esJuridica ? "R.U.C." : "C.I. / R.U.C."} <span className="text-rose-400">*</span>
              </span>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  inputMode="numeric"
                  name="numeroDocumento"
                  value={baseDoc}
                  onChange={handleDocBaseChange}
                  required
                  maxLength={8}
                  placeholder={esJuridica ? "80012345" : "1234567"}
                  className={inputClass}
                />
                <span className="text-white/40 font-mono">-</span>
                <input
                  type="text"
                  inputMode="numeric"
                  name="numeroDocumentoDv"
                  value={dvDoc}
                  onChange={handleDocDvChange}
                  required
                  maxLength={1}
                  placeholder="DV"
                  className={`${inputClass} !w-14 text-center`}
                />
              </div>
              {errores.numeroDocumento && <span className="text-[11px] text-rose-400">{errores.numeroDocumento}</span>}
            </label>

            <label className={labelClass}>
              <span className={labelText}>
                Persona de contacto
              </span>
              <input
                type="text"
                name="personaContacto"
                value={form.personaContacto}
                onChange={handleChange}
                placeholder="Persona de contacto"
                className={inputClass}
              />
              {errores.personaContacto && <span className="text-[11px] text-rose-400">{errores.personaContacto}</span>}
            </label>
          </div>

          {/* Descripcion + Direccion */}
          <div className="grid grid-cols-2 gap-3">
            <label className={labelClass}>
              <span className={labelText}>
                Descripción del negocio
              </span>
              <input
                type="text"
                name="descripcionNegocio"
                value={form.descripcionNegocio}
                onChange={handleChange}
                placeholder="Descripción del negocio"
                className={inputClass}
              />
              {errores.descripcionNegocio && <span className="text-[11px] text-rose-400">{errores.descripcionNegocio}</span>}
            </label>

            <label className={labelClass}>
              <span className={labelText}>
                Dirección
              </span>
              <input
                type="text"
                name="direccion"
                value={form.direccion}
                onChange={handleChange}
                placeholder="Calle, número y barrio"
                className={inputClass}
              />
              {errores.direccion && <span className="text-[11px] text-rose-400">{errores.direccion}</span>}
            </label>
          </div>

          {/* Pais + Ciudad */}
          <div className="grid grid-cols-2 gap-3">
            <label className={labelClass}>
              <span className={labelText}>País <span className="text-rose-400">*</span></span>
              <select
                name="idPais"
                value={form.idPais ?? ""}
                onChange={handlePaisChange}
                required
                className={selectClass}
              >
                <option value="">Seleccionar...</option>
                {paises.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
              {errores.idPais && <span className="text-[11px] text-rose-400">{errores.idPais}</span>}
            </label>

            <label className={labelClass}>
              <span className={labelText}>Ciudad <span className="text-rose-400">*</span></span>
              <select
                name="idCiudad"
                value={form.idCiudad ?? ""}
                onChange={handleChange}
                required
                className={selectClass}
              >
                <option value="">Seleccionar...</option>
                {ciudades.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
              {errores.idCiudad && <span className="text-[11px] text-rose-400">{errores.idCiudad}</span>}
            </label>
          </div>

          {/* Telefono + Celular + Email */}
          <div className="grid grid-cols-3 gap-3">
            <label className={labelClass}>
              <span className={labelText}>Teléfono</span>
              <div className="flex items-center gap-1">
                <span className="rounded-l-none border border-r-0 border-white/10 bg-white/[0.06] px-2.5 py-1.5 text-sm text-white select-none">
                  021
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  name="telefono"
                  value={telefonoResto}
                  onChange={handleTelefonoChange}
                  maxLength={6}
                  placeholder="123456"
                  className={`${inputClass} !rounded-l-none`}
                />
              </div>
              {errores.telefono && <span className="text-[11px] text-rose-400">{errores.telefono}</span>}
            </label>

            <label className={labelClass}>
              <span className={labelText}>Celular</span>
              <div className="flex items-center gap-1">
                <span className="rounded-l-none border border-r-0 border-white/10 bg-white/[0.06] px-2.5 py-1.5 text-sm text-white select-none">
                  +595
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  name="celular"
                  value={celularResto}
                  onChange={handleCelularChange}
                  maxLength={9}
                  placeholder="961000000"
                  className={`${inputClass} !rounded-l-none`}
                />
              </div>
              {errores.celular && <span className="text-[11px] text-rose-400">{errores.celular}</span>}
            </label>

            <label className={labelClass}>
              <span className={labelText}>Email</span>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="correo@dominio.com"
                className={inputClass}
              />
              {errores.email && <span className="text-[11px] text-rose-400">{errores.email}</span>}
            </label>
          </div>

          {/* Botones */}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onCerrar}
              className="flex-1 rounded-none border border-white/10 bg-white/[0.03] py-1.5 text-sm text-white/70 hover:text-white transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={guardando}
              className="flex-1 rounded-none bg-[var(--accent)] py-1.5 text-sm font-semibold text-black hover:bg-[var(--accent-hover)] disabled:opacity-40 transition-colors">
              {guardando ? "Guardando..." : proveedorEdit ? "Guardar cambios" : "Agregar proveedor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
