import { useState, useEffect } from "react";
import { X } from "lucide-react";

const inputClass =
  "w-full rounded-lg border border-[#2a2a32] bg-[#0d0d0f] px-3 py-1.5 text-sm text-[#f1f1f3] placeholder:text-[#4a4a5a] focus:border-[#22c55e]/50 outline-none transition-colors";

const selectClass =
  "w-full rounded-lg border border-[#2a2a32] bg-[#0d0d0f] px-3 py-1.5 text-sm text-[#f1f1f3] focus:border-[#22c55e]/50 outline-none cursor-pointer transition-colors";

const labelClass = "block space-y-0.5";

const labelText = "text-[11px] text-[#7a7a8c]";

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

  const handleTipoPersonaChange = (value) => {
    setForm((prev) => ({
      ...prev,
      tipoPersona: value,
      tipoDocumento: value === "JURIDICA" ? "RUC" : "",
    }));
  };

  function handlePaisChange(e) {
    const val = e.target.value;
    setForm((prev) => ({ ...prev, idPais: val, idCiudad: "" }));
    onPaisChange?.(val);
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
    });
  }

  const esJuridica = form.tipoPersona === "JURIDICA";

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="bg-[#111114] border border-[#1e1e24] rounded-xl w-full max-w-2xl flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1e1e24] shrink-0">
          <h2 className="text-sm font-semibold text-[#f1f1f3]">
            {proveedorEdit ? "Editar Proveedor" : "Nuevo Proveedor"}
          </h2>
          <button type="button" onClick={onCerrar}
            className="p-1 rounded text-[#5a5a6e] hover:text-[#e1e1eb] hover:bg-[#1a1f2e] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-2.5">

          {/* Tipo de persona */}
          <div>
            <span className={labelText}>Tipo de persona *</span>
            <div className="flex items-center gap-4 mt-1">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="tipoPersona"
                  value="FISICA"
                  checked={form.tipoPersona === "FISICA"}
                  onChange={(e) => handleTipoPersonaChange(e.target.value)}
                  className="accent-[#22c55e]"
                />
                <span className="text-xs text-[#9a9aac]">Persona Física</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="tipoPersona"
                  value="JURIDICA"
                  checked={form.tipoPersona === "JURIDICA"}
                  onChange={(e) => handleTipoPersonaChange(e.target.value)}
                  className="accent-[#22c55e]"
                />
                <span className="text-xs text-[#9a9aac]">Persona Jurídica</span>
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
                <span className={labelText}>Apellido</span>
                <input
                  type="text"
                  name="apellido"
                  value={form.apellido}
                  onChange={handleChange}
                  placeholder="Apellido"
                  className={inputClass}
                />
              </label>
            )}
          </div>

          {/* Fecha nacimiento + Tipo documento */}
          <div className="grid grid-cols-2 gap-3">
            {!esJuridica && (
              <label className={labelClass}>
                <span className={labelText}>Fecha de nacimiento</span>
                <input
                  type="date"
                  name="fechaNacimiento"
                  value={form.fechaNacimiento}
                  onChange={handleChange}
                  className={inputClass}
                />
              </label>
            )}

            <label className={labelClass}>
              <span className={labelText}>
                Tipo de documento <span className="text-rose-400">*</span>
              </span>
              <select
                name="tipoDocumento"
                value={form.tipoDocumento}
                onChange={handleChange}
                required
                className={selectClass}
              >
                {esJuridica ? (
                  <option value="RUC">RUC</option>
                ) : (
                  <>
                    <option value="">Seleccionar...</option>
                    <option value="RUC">RUC</option>
                    <option value="CI">CI</option>
                  </>
                )}
              </select>
              {errores.tipoDocumento && <span className="text-[11px] text-rose-400">{errores.tipoDocumento}</span>}
            </label>
          </div>

          {/* Numero documento + Persona contacto */}
          <div className="grid grid-cols-2 gap-3">
            <label className={labelClass}>
              <span className={labelText}>
                Número de documento <span className="text-rose-400">*</span>
              </span>
              <input
                type="text"
                name="numeroDocumento"
                value={form.numeroDocumento}
                onChange={handleChange}
                required
                placeholder="Número de documento"
                className={inputClass}
              />
              {errores.numeroDocumento && <span className="text-[11px] text-rose-400">{errores.numeroDocumento}</span>}
            </label>

            <label className={labelClass}>
              <span className={labelText}>
                Persona de contacto <span className="text-rose-400">*</span>
              </span>
              <input
                type="text"
                name="personaContacto"
                value={form.personaContacto}
                onChange={handleChange}
                required
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
                Descripción del negocio <span className="text-rose-400">*</span>
              </span>
              <input
                type="text"
                name="descripcionNegocio"
                value={form.descripcionNegocio}
                onChange={handleChange}
                required
                placeholder="Descripción del negocio"
                className={inputClass}
              />
              {errores.descripcionNegocio && <span className="text-[11px] text-rose-400">{errores.descripcionNegocio}</span>}
            </label>

            <label className={labelClass}>
              <span className={labelText}>
                Dirección <span className="text-rose-400">*</span>
              </span>
              <input
                type="text"
                name="direccion"
                value={form.direccion}
                onChange={handleChange}
                required
                placeholder="Calle, número y barrio"
                className={inputClass}
              />
              {errores.direccion && <span className="text-[11px] text-rose-400">{errores.direccion}</span>}
            </label>
          </div>

          {/* Pais + Ciudad */}
          <div className="grid grid-cols-2 gap-3">
            <label className={labelClass}>
              <span className={labelText}>País</span>
              <select
                name="idPais"
                value={form.idPais ?? ""}
                onChange={handlePaisChange}
                className={`${selectClass} text-[#4a4a5a] cursor-not-allowed opacity-50`}
                disabled
              >
                <option value="">Proximamente...</option>
                {paises.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </label>

            <label className={labelClass}>
              <span className={labelText}>Ciudad</span>
              <select
                name="idCiudad"
                value={form.idCiudad ?? ""}
                onChange={handleChange}
                className={`${selectClass} text-[#4a4a5a] cursor-not-allowed opacity-50`}
                disabled
              >
                <option value="">Proximamente...</option>
                {ciudades.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </label>
          </div>

          {/* Telefono + Celular */}
          <div className="grid grid-cols-2 gap-3">
            <label className={labelClass}>
              <span className={labelText}>Teléfono</span>
              <input
                type="tel"
                name="telefono"
                value={form.telefono}
                onChange={handleChange}
                placeholder="Teléfono"
                className={inputClass}
              />
            </label>

            <label className={labelClass}>
              <span className={labelText}>Celular</span>
              <input
                type="tel"
                name="celular"
                value={form.celular}
                onChange={handleChange}
                placeholder="Celular"
                className={inputClass}
              />
            </label>
          </div>

          {/* Botones */}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onCerrar}
              className="flex-1 rounded-lg border border-[#2a2a32] bg-[#0d0d0f] py-1.5 text-sm text-[#9a9aac] hover:text-[#e1e1eb] transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={guardando}
              className="flex-1 rounded-lg bg-[#22c55e] py-1.5 text-sm font-semibold text-[#0d0d0f] hover:bg-[#16a34a] disabled:opacity-40 transition-colors">
              {guardando ? "Guardando..." : proveedorEdit ? "Guardar cambios" : "Agregar proveedor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
