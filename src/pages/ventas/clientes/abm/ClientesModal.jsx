import { useState, useEffect } from "react";
import { X } from "lucide-react";

const inputClass =
  "w-full rounded-none border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:border-[var(--accent)] outline-none transition-colors";

const selectClass =
  "w-full rounded-none border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-white focus:border-[var(--accent)] outline-none cursor-pointer transition-colors";

const labelClass = "block space-y-0.5";

const labelText = "text-[11px] text-white/50";

const FORM_INICIAL = {
  firstName: "",
  lastName: "",
  tipoCliente: "FISICA",
  razonSocial: "",
  ruc: "",
  documentNumber: "",
  gender: "",
  celular: "",
  email: "",
  direccion: "",
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
        documentNumber: esJuridicaInferida ? "" : rawDoc,
        gender: clienteEdit.genero ?? clienteEdit.gender ?? "",
        celular: clienteEdit.celular ?? "",
        email: clienteEdit.email ?? "",
        direccion: clienteEdit.direccion ?? "",
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
    if (form.celular && !/^\+5959\d{8}$/.test(form.celular.trim())) {
      errs.celular = "Debés ingresar los 9 números del celular (formato +5959XXXXXXXX)";
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
      gender: form.gender || null,
      celular: form.celular?.trim() || null,
      email: form.email?.trim() || null,
      direccion: form.direccion?.trim() || null,
    };
    if (form.tipoCliente === "JURIDICA") {
      payload.razonSocial = form.razonSocial.trim();
      payload.ruc = form.ruc?.trim() || null;
      payload.documentNumber = form.ruc?.trim() || null;
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
      <div className="bg-[#0c0c0e] border border-white/10 rounded-none w-full max-w-2xl flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 shrink-0">
          <h2 className="text-sm font-semibold text-white">
            {clienteEdit ? "Editar Cliente" : "Nuevo Cliente"}
          </h2>
          <button type="button" onClick={onCerrar}
            className="p-1 rounded text-white/40 hover:text-white hover:bg-[#1a1f2e] transition-colors">
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
                  className="accent-[var(--accent)]"
                />
                <span className="text-xs text-white/70">Persona Física</span>
              </label>
              <label className={`flex items-center gap-1.5 ${clienteEdit ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
                <input
                  type="radio"
                  name="tipoCliente"
                  value="JURIDICA"
                  checked={form.tipoCliente === "JURIDICA"}
                  onChange={handleChange}
                  disabled={!!clienteEdit}
                  className="accent-[var(--accent)]"
                />
                <span className="text-xs text-white/70">Persona Jurídica</span>
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
                  <span className={labelText}>RUC <span className="text-rose-400">*</span></span>
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
                    <span className="text-white/40 font-mono">-</span>
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
                  <span className={labelText}>Apellido <span className="text-rose-400">*</span></span>
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

              {/* C.I. / R.U.C. + Celular */}
              <div className="grid grid-cols-2 gap-3">
                <label className={labelClass}>
                  <span className={labelText}>C.I. / R.U.C. <span className="text-rose-400">*</span></span>
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
                    <span className="text-white/40 font-mono">-</span>
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
              </div>
            </>
          )}

          {/* Celular + Email (solo jurídica) */}
          {esJuridica && (
            <div className="grid grid-cols-2 gap-3">
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
              </label>
            </div>
          )}

          {/* Dirección */}
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

          {/* Botones */}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onCerrar}
              className="flex-1 rounded-none border border-white/10 bg-white/[0.03] py-1.5 text-sm text-white/70 hover:text-white transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={guardando || !puedeGuardar}
              className="flex-1 rounded-none bg-[var(--accent)] py-1.5 text-sm font-semibold text-black hover:bg-[var(--accent-hover)] disabled:opacity-40 transition-colors">
              {guardando ? "Guardando..." : clienteEdit ? "Guardar cambios" : "Agregar cliente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
