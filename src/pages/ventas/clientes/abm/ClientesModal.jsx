import { useState, useEffect } from "react";
import { X } from "lucide-react";

const inputClass =
  "w-full rounded-lg border border-[#2a2a32] bg-[#0d0d0f] px-3 py-1.5 text-sm text-[#f1f1f3] placeholder:text-[#4a4a5a] focus:border-[#22c55e]/50 outline-none transition-colors";

const selectClass =
  "w-full rounded-lg border border-[#2a2a32] bg-[#0d0d0f] px-3 py-1.5 text-sm text-[#f1f1f3] focus:border-[#22c55e]/50 outline-none cursor-pointer transition-colors";

const labelClass = "block space-y-0.5";

const labelText = "text-[11px] text-[#7a7a8c]";

const FORM_INICIAL = {
  firstName: "",
  lastName: "",
  tipoCliente: "FISICA",
  razonSocial: "",
  ruc: "",
  descripcionEmpresa: "",
  contactoNombre: "",
  contactoCelular: "",
  documentNumber: "",
  birthDate: "",
  gender: "",
  phoneNumber: "",
  celular: "",
  email: "",
  direccion: "",
  observaciones: "",
  idPais: "",
  idCiudad: "",
};

export default function ClientesModal({
  abierto,
  clienteEdit = null,
  guardando = false,
  paises = [],
  ciudades = [],
  onGuardar,
  onCerrar,
  onPaisChange,
}) {
  const [form, setForm] = useState(FORM_INICIAL);
  const [errores, setErrores] = useState({});
  const [ciudadPendiente, setCiudadPendiente] = useState(null);

  useEffect(() => {
    if (!abierto) return;

    if (clienteEdit) {
      const rawBirth = clienteEdit.fechaNacimiento ?? clienteEdit.dateBirth ?? clienteEdit.birthDate ?? null;
      const rawDoc = clienteEdit.numeroDocumento ?? clienteEdit.documentNumber ?? "";
      // El back no devuelve tipoCliente; se infiere desde tipoDocumento (RUC = Jurídica)
      const esJuridicaInferida =
        clienteEdit.tipoCliente === "JURIDICA" ||
        clienteEdit.tipoDocumento === "RUC" ||
        /^80\d{6}-?\d?$/.test(String(rawDoc).trim());
      const paisId = clienteEdit.idPais ?? (paises.find(
        (p) => String(p.nombre ?? "").toLowerCase() === String(clienteEdit.pais ?? "").toLowerCase()
      )?.id ?? "");
      setForm({
        firstName: clienteEdit.nombre ?? clienteEdit.firstName ?? clienteEdit.name ?? "",
        lastName: clienteEdit.apellido ?? clienteEdit.lastName ?? "",
        tipoCliente: clienteEdit.tipoCliente ?? (esJuridicaInferida ? "JURIDICA" : "FISICA"),
        razonSocial: clienteEdit.razonSocial ?? (esJuridicaInferida ? (clienteEdit.nombre ?? clienteEdit.firstName ?? clienteEdit.name ?? "") : ""),
        ruc: clienteEdit.ruc ?? (esJuridicaInferida ? rawDoc : ""),
        descripcionEmpresa: clienteEdit.descripcionEmpresa ?? clienteEdit.descripcion ?? "",
        contactoNombre: clienteEdit.contactoNombre ?? (Array.isArray(clienteEdit.contactos) && clienteEdit.contactos.length > 0 ? clienteEdit.contactos[0] : ""),
        contactoCelular: clienteEdit.contactoCelular ?? "",
        documentNumber: esJuridicaInferida ? "" : rawDoc,
        birthDate: rawBirth ? new Date(rawBirth).toISOString().split("T")[0] : "",
        gender: clienteEdit.genero ?? clienteEdit.gender ?? "",
        phoneNumber: clienteEdit.telefono ?? clienteEdit.phoneNumber ?? clienteEdit.phone ?? "",
        celular: clienteEdit.celular ?? "",
        email: clienteEdit.email ?? "",
        direccion: clienteEdit.direccion ?? "",
        observaciones: clienteEdit.observaciones ?? "",
        idPais: paisId,
        idCiudad: "",
      });
      setCiudadPendiente(clienteEdit.ciudad ?? clienteEdit.nombreCiudad ?? null);
      if (paisId) onPaisChange?.(paisId);
      setErrores({});
    } else {
      setForm(FORM_INICIAL);
      setCiudadPendiente(null);
      setErrores({});
    }
  }, [abierto, clienteEdit]);

  // Cuando llegan las ciudades del país seleccionado, emparejar la ciudad guardada por nombre
  useEffect(() => {
    if (!ciudadPendiente || !Array.isArray(ciudades) || ciudades.length === 0) return;
    const match = ciudades.find(
      (c) => String(c.nombre ?? "").toLowerCase() === String(ciudadPendiente).toLowerCase()
    );
    if (match) {
      setForm((prev) => ({ ...prev, idCiudad: match.id ?? match.idCiudad ?? prev.idCiudad }));
    }
    setCiudadPendiente(null);
  }, [ciudades, ciudadPendiente]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errores[name]) setErrores((prev) => ({ ...prev, [name]: null }));
  }

  function handlePaisChange(e) {
    const val = e.target.value;
    setForm((prev) => ({ ...prev, idPais: val, idCiudad: "" }));
    onPaisChange?.(val);
    if (errores.idPais) setErrores((prev) => ({ ...prev, idPais: null }));
  }

  const docDocument = form.documentNumber ?? "";
  const idxGuion = docDocument.lastIndexOf("-");
  const baseDoc = idxGuion !== -1 ? docDocument.slice(0, idxGuion) : docDocument;
  const dvDoc = idxGuion !== -1 ? docDocument.slice(idxGuion + 1) : "";

  function handleDocBaseChange(e) {
    const solo = e.target.value.replace(/\D/g, "").slice(0, 8);
    setForm((prev) => ({ ...prev, documentNumber: dvDoc ? `${solo}-${dvDoc}` : solo }));
    if (errores.documentNumber) setErrores((prev) => ({ ...prev, documentNumber: null }));
  }

  function handleDocDvChange(e) {
    const dv = e.target.value.replace(/\D/g, "").slice(0, 1);
    setForm((prev) => ({ ...prev, documentNumber: dv ? `${baseDoc}-${dv}` : baseDoc }));
    if (errores.documentNumber) setErrores((prev) => ({ ...prev, documentNumber: null }));
  }

  const rucDoc = form.ruc ?? "";
  const idxRuc = rucDoc.lastIndexOf("-");
  const baseRuc = idxRuc !== -1 ? rucDoc.slice(0, idxRuc) : rucDoc;
  const dvRuc = idxRuc !== -1 ? rucDoc.slice(idxRuc + 1) : "";

  function handleRucBaseChange(e) {
    const solo = e.target.value.replace(/\D/g, "").slice(0, 8);
    setForm((prev) => ({ ...prev, ruc: dvRuc ? `${solo}-${dvRuc}` : solo }));
    if (errores.ruc) setErrores((prev) => ({ ...prev, ruc: null }));
  }

  function handleRucDvChange(e) {
    const dv = e.target.value.replace(/\D/g, "").slice(0, 1);
    setForm((prev) => ({ ...prev, ruc: dv ? `${baseRuc}-${dv}` : baseRuc }));
    if (errores.ruc) setErrores((prev) => ({ ...prev, ruc: null }));
  }

  const celularResto = form.celular?.startsWith("+595")
    ? form.celular.slice(4)
    : form.celular ?? "";

  function handleCelularChange(e) {
    const solo = e.target.value.replace(/\D/g, "").slice(0, 9);
    setForm((prev) => ({ ...prev, celular: solo ? `+595${solo}` : "" }));
    if (errores.celular) setErrores((prev) => ({ ...prev, celular: null }));
  }

  const contactoCelularResto = form.contactoCelular?.startsWith("+595")
    ? form.contactoCelular.slice(4)
    : form.contactoCelular ?? "";

  function handleContactoCelularChange(e) {
    const solo = e.target.value.replace(/\D/g, "").slice(0, 9);
    setForm((prev) => ({ ...prev, contactoCelular: solo ? `+595${solo}` : "" }));
    if (errores.contactoCelular) setErrores((prev) => ({ ...prev, contactoCelular: null }));
  }

  const telefonoResto = form.phoneNumber?.startsWith("021")
    ? form.phoneNumber.slice(3)
    : form.phoneNumber ?? "";

  function handleTelefonoChange(e) {
    const solo = e.target.value.replace(/\D/g, "").slice(0, 6);
    setForm((prev) => ({ ...prev, phoneNumber: solo ? `021${solo}` : "" }));
    if (errores.phoneNumber) setErrores((prev) => ({ ...prev, phoneNumber: null }));
  }

  function validar() {
    const errs = {};
    if (esJuridica) {
      if (!form.razonSocial.trim()) errs.razonSocial = "Requerido";
      const ruc = form.ruc?.trim() ?? "";
      if (!ruc) {
        errs.ruc = "El número de documento (RUC) es obligatorio";
      } else if (!/^80\d{6}-\d$/.test(ruc)) {
        errs.ruc = "El RUC debe empezar con 80, tener 8 dígitos y 1 dígito verificador (80XXXXXX-X)";
      }
    } else {
      if (!form.firstName.trim()) errs.firstName = "El nombre es obligatorio";
      if (!form.lastName.trim()) errs.lastName = "El apellido es obligatorio";
      if (!form.documentNumber.trim()) {
        errs.documentNumber = "El número de documento es obligatorio";
      } else if (!/^\d{6,8}(-\d)?$/.test(form.documentNumber.trim())) {
        errs.documentNumber = "El documento debe tener de 6 a 8 dígitos y opcionalmente 1 dígito verificador";
      }
    }
    if (!form.idPais) errs.idPais = "El país es obligatorio";
    if (!form.idCiudad) errs.idCiudad = "La ciudad es obligatoria";
    if (form.phoneNumber && !/^021\d{6}$/.test(form.phoneNumber.trim())) {
      errs.phoneNumber = "Debés ingresar los 6 números del teléfono (formato 021 XXXXXX)";
    }
    if (form.celular && !/^\+5959\d{8}$/.test(form.celular.trim())) {
      errs.celular = "Debés ingresar los 9 números del celular (formato +5959XXXXXXXX)";
    }
    if (esJuridica && form.contactoCelular && !/^\+5959\d{8}$/.test(form.contactoCelular.trim())) {
      errs.contactoCelular = "Debés ingresar los 9 números del celular (formato +5959XXXXXXXX)";
    }
    return errs;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validar();
    if (Object.keys(errs).length > 0) {
      setErrores(errs);
      return;
    }
    const payload = {
      ...form,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      documentNumber: form.documentNumber?.trim() || null,
      birthDate: form.birthDate || null,
      gender: form.gender || null,
      phoneNumber: form.phoneNumber?.trim() || null,
      celular: form.celular?.trim() || null,
      email: form.email?.trim() || null,
      direccion: form.direccion?.trim() || null,
      observaciones: form.observaciones?.trim() || null,
    };
    if (form.tipoCliente === "JURIDICA") {
      payload.razonSocial = form.razonSocial.trim();
      payload.ruc = form.ruc?.trim() || null;
      payload.documentNumber = form.ruc?.trim() || null;
      payload.descripcionEmpresa = form.descripcionEmpresa?.trim() || null;
      payload.contactoNombre = form.contactoNombre?.trim() || null;
      payload.contactoCelular = form.contactoCelular?.trim() || null;
    }
    onGuardar(payload);
  }

  const esJuridica = form.tipoCliente === "JURIDICA";
  const puedeGuardar = esJuridica
    ? form.razonSocial.trim() !== ""
    : form.firstName.trim() !== "";

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="bg-[#111114] border border-[#1e1e24] rounded-xl w-full max-w-2xl flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1e1e24] shrink-0">
          <h2 className="text-sm font-semibold text-[#f1f1f3]">
            {clienteEdit ? "Editar Cliente" : "Nuevo Cliente"}
          </h2>
          <button type="button" onClick={onCerrar}
            className="p-1 rounded text-[#5a5a6e] hover:text-[#e1e1eb] hover:bg-[#1a1f2e] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-2.5">

          {/* Tipo de cliente */}
          <div>
            <span className={labelText}>Tipo de cliente *</span>
            <div className="flex items-center gap-4 mt-1">
              <label className={`flex items-center gap-1.5 ${clienteEdit ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
                <input
                  type="radio"
                  name="tipoCliente"
                  value="FISICA"
                  checked={form.tipoCliente === "FISICA"}
                  onChange={handleChange}
                  disabled={!!clienteEdit}
                  className="accent-[#22c55e]"
                />
                <span className="text-xs text-[#9a9aac]">Persona Física</span>
              </label>
              <label className={`flex items-center gap-1.5 ${clienteEdit ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
                <input
                  type="radio"
                  name="tipoCliente"
                  value="JURIDICA"
                  checked={form.tipoCliente === "JURIDICA"}
                  onChange={handleChange}
                  disabled={!!clienteEdit}
                  className="accent-[#22c55e]"
                />
                <span className="text-xs text-[#9a9aac]">Persona Jurídica</span>
              </label>
            </div>
          </div>

          {esJuridica ? (
            <>
              {/* Razón social + RUC */}
              <div className="grid grid-cols-2 gap-3">
                <label className={labelClass}>
                  <span className={labelText}>Razón social <span className="text-rose-400">*</span></span>
                  <input
                    type="text"
                    name="razonSocial"
                    value={form.razonSocial}
                    onChange={handleChange}
                    required
                    placeholder="Razón social"
                    className={inputClass}
                  />
                  {errores.razonSocial && <span className="text-[11px] text-rose-400">{errores.razonSocial}</span>}
                </label>
                <label className={labelClass}>
                  <span className={labelText}>RUC / Documento</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      inputMode="numeric"
                      name="ruc"
                      value={baseRuc}
                      onChange={handleRucBaseChange}
                      maxLength={8}
                      placeholder="80123456"
                      className={inputClass}
                    />
                    <span className="text-[#5a5a6e] font-mono">-</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      name="rucDv"
                      value={dvRuc}
                      onChange={handleRucDvChange}
                      maxLength={1}
                      placeholder="DV"
                      className={`${inputClass} !w-14 text-center`}
                    />
                  </div>
                  {errores.ruc && <span className="text-[11px] text-rose-400">{errores.ruc}</span>}
                </label>
              </div>
            </>
          ) : (
            <>
              {/* Nombre + Apellido */}
              <div className="grid grid-cols-2 gap-3">
                <label className={labelClass}>
                  <span className={labelText}>Nombre <span className="text-rose-400">*</span></span>
                  <input
                    type="text"
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    required
                    placeholder="Nombre"
                    className={inputClass}
                  />
                  {errores.firstName && <span className="text-[11px] text-rose-400">{errores.firstName}</span>}
                </label>
                <label className={labelClass}>
                  <span className={labelText}>Apellido</span>
                  <input
                    type="text"
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    placeholder="Apellido"
                    className={inputClass}
                  />
                  {errores.lastName && <span className="text-[11px] text-rose-400">{errores.lastName}</span>}
                </label>
              </div>

              {/* Número de documento + Fecha nacimiento */}
              <div className="grid grid-cols-2 gap-3">
                <label className={labelClass}>
                  <span className={labelText}>C.I. / R.U.C.</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      inputMode="numeric"
                      name="documentNumber"
                      value={baseDoc}
                      onChange={handleDocBaseChange}
                      maxLength={8}
                      placeholder="1234567"
                      className={inputClass}
                    />
                    <span className="text-[#5a5a6e] font-mono">-</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      name="documentNumberDv"
                      value={dvDoc}
                      onChange={handleDocDvChange}
                      maxLength={1}
                      placeholder="DV"
                      className={`${inputClass} !w-14 text-center`}
                    />
                  </div>
                  {errores.documentNumber && <span className="text-[11px] text-rose-400">{errores.documentNumber}</span>}
                </label>
                <label className={labelClass}>
                  <span className={labelText}>Fecha de nacimiento</span>
                  <input
                    type="date"
                    name="birthDate"
                    value={form.birthDate}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </label>
              </div>
            </>
          )}

          {/* Contacto + Descripción (solo jurídica) */}
          {esJuridica && (
            <div className="grid grid-cols-2 gap-3">
              <label className={labelClass}>
                <span className={labelText}>Nombre del contacto</span>
                <input
                  type="text"
                  name="contactoNombre"
                  value={form.contactoNombre}
                  onChange={handleChange}
                  placeholder="Nombre del contacto"
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                <span className={labelText}>Descripción de la empresa</span>
                <input
                  type="text"
                  name="descripcionEmpresa"
                  value={form.descripcionEmpresa}
                  onChange={handleChange}
                  placeholder="Descripción de la empresa"
                  className={inputClass}
                />
              </label>
            </div>
          )}

          {/* Teléfono + Celular (física) / + Celular del contacto (jurídica) */}
          {!esJuridica ? (
            <div className="grid grid-cols-2 gap-3">
              <label className={labelClass}>
                <span className={labelText}>Teléfono</span>
                <div className="flex items-center gap-1">
                  <span className="rounded-l-lg border border-r-0 border-[#2a2a32] bg-[#141418] px-2.5 py-1.5 text-sm text-[#f1f1f3] select-none">
                    021
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    name="phoneNumber"
                    value={telefonoResto}
                    onChange={handleTelefonoChange}
                    maxLength={6}
                    placeholder="123456"
                    className={`${inputClass} !rounded-l-none`}
                  />
                </div>
                {errores.phoneNumber && <span className="text-[11px] text-rose-400">{errores.phoneNumber}</span>}
              </label>
              <label className={labelClass}>
                <span className={labelText}>Celular</span>
                <div className="flex items-center gap-1">
                  <span className="rounded-l-lg border border-r-0 border-[#2a2a32] bg-[#141418] px-2.5 py-1.5 text-sm text-[#f1f1f3] select-none">
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
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <label className={labelClass}>
                <span className={labelText}>Teléfono</span>
                <div className="flex items-center gap-1">
                  <span className="rounded-l-lg border border-r-0 border-[#2a2a32] bg-[#141418] px-2.5 py-1.5 text-sm text-[#f1f1f3] select-none">
                    021
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    name="phoneNumber"
                    value={telefonoResto}
                    onChange={handleTelefonoChange}
                    maxLength={6}
                    placeholder="123456"
                    className={`${inputClass} !rounded-l-none`}
                  />
                </div>
                {errores.phoneNumber && <span className="text-[11px] text-rose-400">{errores.phoneNumber}</span>}
              </label>
              <label className={labelClass}>
                <span className={labelText}>Celular</span>
                <div className="flex items-center gap-1">
                  <span className="rounded-l-lg border border-r-0 border-[#2a2a32] bg-[#141418] px-2.5 py-1.5 text-sm text-[#f1f1f3] select-none">
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
                <span className={labelText}>Celular del contacto</span>
                <div className="flex items-center gap-1">
                  <span className="rounded-l-lg border border-r-0 border-[#2a2a32] bg-[#141418] px-2.5 py-1.5 text-sm text-[#f1f1f3] select-none">
                    +595
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    name="contactoCelular"
                    value={contactoCelularResto}
                    onChange={handleContactoCelularChange}
                    maxLength={9}
                    placeholder="961000000"
                    className={`${inputClass} !rounded-l-none`}
                  />
                </div>
                {errores.contactoCelular && <span className="text-[11px] text-rose-400">{errores.contactoCelular}</span>}
              </label>
            </div>
          )}

          {/* Dirección (+ Email en jurídica) */}
          {esJuridica ? (
            <div className="grid grid-cols-2 gap-3">
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
              </label>
              <label className={labelClass}>
                <span className={labelText}>Dirección</span>
                <input
                  type="text"
                  name="direccion"
                  value={form.direccion}
                  onChange={handleChange}
                  placeholder="Calle, número y barrio"
                  className={inputClass}
                />
              </label>
            </div>
          ) : (
            <label className={labelClass}>
              <span className={labelText}>Dirección</span>
              <input
                type="text"
                name="direccion"
                value={form.direccion}
                onChange={handleChange}
                placeholder="Calle, número y barrio"
                className={inputClass}
              />
            </label>
          )}

          {/* Email + Sexo (solo física) */}
          {!esJuridica && (
            <div className="grid grid-cols-2 gap-3">
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
              </label>
              <label className={labelClass}>
                <span className={labelText}>Sexo</span>
                <select
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                  className={selectClass}
                >
                  <option value="">Seleccionar...</option>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                </select>
              </label>
            </div>
          )}

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

          {/* Observaciones */}
          <label className={labelClass}>
            <span className={labelText}>Observaciones</span>
            <textarea
              name="observaciones"
              value={form.observaciones}
              onChange={handleChange}
              rows={2}
              placeholder="Observaciones"
              className={`${inputClass} resize-none`}
            />
          </label>

          {/* Botones */}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onCerrar}
              className="flex-1 rounded-lg border border-[#2a2a32] bg-[#0d0d0f] py-1.5 text-sm text-[#9a9aac] hover:text-[#e1e1eb] transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={guardando || !puedeGuardar}
              className="flex-1 rounded-lg bg-[#22c55e] py-1.5 text-sm font-semibold text-[#0d0d0f] hover:bg-[#16a34a] disabled:opacity-40 transition-colors">
              {guardando ? "Guardando..." : clienteEdit ? "Guardar cambios" : "Agregar cliente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
