import { useState, useEffect } from "react";
import { X } from "lucide-react";

const FORM_INICIAL = {
  firstName: "",
  lastName: "",
  tipoCliente: "FISICA",
  razonSocial: "",
  ruc: "",
  descripcionEmpresa: "",
  contactoNombre: "",
  contactoCelular: "",
  documentType: "",
  documentNumber: "",
  birthDate: "",
  gender: "",
  phoneNumber: "",
  celular: "",
  email: "",
  direccion: "",
  observaciones: "",
};

export default function ClientesModal({
  abierto,
  clienteEdit = null,
  guardando = false,
  onGuardar,
  onCerrar,
}) {
  const [form, setForm] = useState(FORM_INICIAL);

  useEffect(() => {
    if (!abierto) return;

    if (clienteEdit) {
      const rawBirth = clienteEdit.dateBirth ?? clienteEdit.birthDate ?? null;
      setForm({
        firstName: clienteEdit.firstName ?? clienteEdit.name ?? "",
        lastName: clienteEdit.lastName ?? "",
        tipoCliente: clienteEdit.tipoCliente ?? "FISICA",
        razonSocial: clienteEdit.razonSocial ?? "",
        ruc: clienteEdit.ruc ?? "",
        descripcionEmpresa: clienteEdit.descripcionEmpresa ?? "",
        contactoNombre: clienteEdit.contactoNombre ?? "",
        contactoCelular: clienteEdit.contactoCelular ?? "",
        documentType: clienteEdit.documentType ?? "",
        documentNumber: clienteEdit.documentNumber ?? "",
        birthDate: rawBirth ? new Date(rawBirth).toISOString().split("T")[0] : "",
        gender: clienteEdit.gender ?? "",
        phoneNumber: clienteEdit.phoneNumber ?? clienteEdit.phone ?? "",
        celular: clienteEdit.celular ?? "",
        email: clienteEdit.email ?? "",
        direccion: clienteEdit.direccion ?? "",
        observaciones: clienteEdit.observaciones ?? "",
      });
    } else {
      setForm(FORM_INICIAL);
    }
  }, [abierto, clienteEdit]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit() {
    const payload = {
      ...form,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      documentType: form.documentType || null,
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
      <div
        className="bg-[var(--bg-card)] border border-white/10 rounded-2xl
                        w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4
                          border-b border-white/10"
        >
          <h2 className="text-white font-semibold text-lg">
            {clienteEdit ? "Editar Cliente" : "Nuevo Cliente"}
          </h2>
          <button
            type="button"
            onClick={onCerrar}
            className="text-white/40 hover:text-white transition-colors p-1"
            aria-label="Cerrar"
          >
            <X />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Tipo de cliente */}
          <div className="flex flex-col gap-1">
            <label className="text-white/50 text-xs">Tipo de cliente</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="tipoCliente"
                  value="FISICA"
                  checked={form.tipoCliente === "FISICA"}
                  onChange={handleChange}
                  className="accent-[var(--accent-green)]"
                />
                <span className="text-sm text-white">Persona Física</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="tipoCliente"
                  value="JURIDICA"
                  checked={form.tipoCliente === "JURIDICA"}
                  onChange={handleChange}
                  className="accent-[var(--accent-green)]"
                />
                <span className="text-sm text-white">Persona Jurídica</span>
              </label>
            </div>
          </div>

          {esJuridica ? (
            <>
              <Field
                label="Razón social *"
                name="razonSocial"
                value={form.razonSocial}
                onChange={handleChange}
              />
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="RUC"
                  name="ruc"
                  value={form.ruc}
                  onChange={handleChange}
                />
                <Field
                  label="Documento"
                  name="documentNumber"
                  value={form.documentNumber}
                  onChange={handleChange}
                />
              </div>
              <Field
                label="Descripción de la empresa"
                name="descripcionEmpresa"
                value={form.descripcionEmpresa}
                onChange={handleChange}
              />
              <div className="border-t border-white/10 pt-3">
                <h3 className="text-white/50 text-xs font-semibold mb-2">Contacto</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Nombre del contacto"
                    name="contactoNombre"
                    value={form.contactoNombre}
                    onChange={handleChange}
                  />
                  <Field
                    label="Celular"
                    name="contactoCelular"
                    value={form.contactoCelular}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Nombre *"
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                />
                <Field
                  label="Apellido"
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-white/50 text-xs">Tipo de documento</label>
                  <select
                    name="documentType"
                    value={form.documentType}
                    onChange={handleChange}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2
                                text-sm text-white focus:outline-none
                                focus:border-[var(--accent-green)] transition-colors"
                  >
                    <option value="">-- Selecciona --</option>
                    <option value="CI">CI</option>
                    <option value="RUC">RUC</option>
                  </select>
                </div>
                <Field
                  label="Número de documento"
                  name="documentNumber"
                  value={form.documentNumber}
                  onChange={handleChange}
                />
              </div>
            </>
          )}

          {/* Campos opcionales comunes */}
          <div className="border-t border-white/10 pt-3">
            <h3 className="text-white/50 text-xs font-semibold mb-2">Información adicional (opcional)</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Email"
                name="email"
                value={form.email}
                onChange={handleChange}
                type="email"
              />
              <Field
                label="Teléfono"
                name="phoneNumber"
                value={form.phoneNumber}
                onChange={handleChange}
              />
              <Field
                label="Celular"
                name="celular"
                value={form.celular}
                onChange={handleChange}
              />
              <Field
                label="Dirección"
                name="direccion"
                value={form.direccion}
                onChange={handleChange}
              />
              {!esJuridica && (
                <>
                  <Field
                    label="Fecha de nacimiento"
                    name="birthDate"
                    value={form.birthDate}
                    onChange={handleChange}
                    type="date"
                  />
                  <div className="flex flex-col gap-1">
                    <label className="text-white/50 text-xs">Sexo</label>
                    <select
                      name="gender"
                      value={form.gender}
                      onChange={handleChange}
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2
                                  text-sm text-white focus:outline-none
                                  focus:border-[var(--accent-green)] transition-colors"
                    >
                      <option value="">- Selecciona -</option>
                      <option value="M">Masculino</option>
                      <option value="F">Femenino</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Observaciones */}
          <div className="flex flex-col gap-1">
            <label className="text-white/50 text-xs">Observaciones</label>
            <textarea
              name="observaciones"
              value={form.observaciones}
              onChange={handleChange}
              rows={2}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2
                         text-sm text-white placeholder:text-white/20
                         focus:outline-none focus:border-[var(--accent-green)]
                         transition-colors resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 px-6 py-4
                          border-t border-white/10"
        >
          <button
            type="button"
            onClick={onCerrar}
            className="px-4 py-2 text-sm text-white/60 hover:text-white
                        transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={guardando || !puedeGuardar}
            className="px-5 py-2 text-sm font-medium bg-[var(--accent-green)]
                        text-black rounded-lg hover:opacity-90 transition-opacity
                        disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {guardando ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label, name, value, onChange, type = "text", placeholder = "",
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-white/50 text-xs">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2
                   text-sm text-white placeholder:text-white/20
                   focus:outline-none focus:border-[var(--accent-green)]
                   transition-colors"
      />
    </div>
  );
}
