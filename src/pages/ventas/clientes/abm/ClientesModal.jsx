// formulario de alta y edicion

import { useState, useEffect } from "react";
import { X } from "lucide-react";

const FORM_INICIAL = {
  firstName: "",
  lastName: "",
  documentType: "",
  documentNumber: "",
  birthDate: "",
  gender: "",
  phoneNumber: "",
  observations: "",
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
      const rawBirth =
        clienteEdit.dateBirth ?? clienteEdit.birthDate ?? null;
      setForm({
        firstName:
          clienteEdit.firstName ?? clienteEdit.name ?? "",
        lastName: clienteEdit.lastName ?? "",
        documentType: clienteEdit.documentType ?? "",
        documentNumber: clienteEdit.documentNumber ?? "",
        birthDate: rawBirth
          ? new Date(rawBirth).toISOString().split("T")[0]
          : "",
        gender: clienteEdit.gender ?? "",
        phoneNumber:
          clienteEdit.phoneNumber ?? clienteEdit.phone ?? "",
        observations: clienteEdit.observations ?? "",
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
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      documentType: form.documentType || null,
      documentNumber: form.documentNumber?.trim() || null,
      birthDate: form.birthDate || null,
      gender: form.gender || null,
      phoneNumber: form.phoneNumber?.trim() || null,
      observations: form.observations?.trim() || null,
    };
    onGuardar(payload);
  }

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div
        className="bg-[var(--bg-card)] border border-white/10 rounded-2xl
                        w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
      >
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
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Nombre *"
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
            />
            <Field
              label="Apellido *"
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
              label="Numero de documento"
              name="documentNumber"
              value={form.documentNumber}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
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
          </div>

          <Field
            label="Telefono / Celular"
            name="phoneNumber"
            value={form.phoneNumber}
            onChange={handleChange}
            placeholder="+595 981 000 000"
          />

          <div className="flex flex-col gap-1">
            <label className="text-white/50 text-xs">Observaciones</label>
            <textarea
              name="observations"
              value={form.observations}
              onChange={handleChange}
              rows={3}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2
                          text-sm text-white placeholder:text-white/20
                          focus:outline-none focus:border-[var(--accent-green)]
                          transition-colors resize-none"
            />
          </div>
        </div>

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
            disabled={guardando || !form.firstName || !form.lastName}
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
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder = "",
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
