import { useEffect, useState, useCallback, useRef } from "react";
import { Search, X, UserPlus, User, Check } from "lucide-react";
import { getClientes, createCliente } from "../../../api/clientesApi";
import { apiErrorMessage } from "../../../api/errors";
import { labelCliente } from "./utils";

const DEBOUNCE_MS = 350;

const FORM_NUEVO = {
  firstName: "",
  lastName: "",
  tipoCliente: "FISICA",
  razonSocial: "",
  ruc: "",
  documentType: "",
  documentNumber: "",
  phoneNumber: "",
  celular: "",
  email: "",
  direccion: "",
};

export default function ClienteOpcional({ cliente, onSeleccionar, onQuitar, abierto, onCerrar }) {
  const [busqueda, setBusqueda] = useState("");
  const [debounced, setDebounced] = useState("");
  const [opciones, setOpciones] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(FORM_NUEVO);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState(null);

  const inputRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(busqueda), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [busqueda]);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await getClientes({
        search: debounced,
        page: 0,
        pageSize: 20,
        sortBy: "idCliente",
        sortDir: "ASC",
      });
      const body = res.data ?? {};
      setOpciones(Array.isArray(body.content) ? body.content : []);
    } catch (err) {
      setOpciones([]);
      setError(apiErrorMessage(err) || "No se pudieron cargar clientes");
    } finally {
      setCargando(false);
    }
  }, [debounced]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    if (abierto) {
      setBusqueda("");
      setMostrarForm(false);
      setForm(FORM_NUEVO);
      setErrorForm(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;
    function handleKey(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCerrar();
      }
    }
    window.addEventListener("keydown", handleKey, true);
    return () => window.removeEventListener("keydown", handleKey, true);
  }, [abierto, onCerrar]);

  function handleFormChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleCrearCliente(e) {
    e.preventDefault();
    setGuardando(true);
    setErrorForm(null);
    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        tipoCliente: form.tipoCliente,
        documentType: form.documentType || null,
        documentNumber: form.documentNumber?.trim() || null,
        phoneNumber: form.phoneNumber?.trim() || null,
        celular: form.celular?.trim() || null,
        email: form.email?.trim() || null,
        direccion: form.direccion?.trim() || null,
      };
      if (form.tipoCliente === "JURIDICA") {
        payload.razonSocial = form.razonSocial.trim();
        payload.ruc = form.ruc?.trim() || null;
        payload.documentNumber = form.ruc?.trim() || null;
      }
      const res = await createCliente(payload);
      const nuevo = res.data;
      onSeleccionar(nuevo);
      onCerrar();
    } catch (err) {
      setErrorForm(apiErrorMessage(err) || "Error al crear cliente");
    } finally {
      setGuardando(false);
    }
  }

  if (!abierto) return null;

  const esJuridica = form.tipoCliente === "JURIDICA";
  const puedeCrear = esJuridica ? form.razonSocial.trim() !== "" : form.firstName.trim() !== "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div ref={modalRef} className="bg-[#111114] border border-[#1e1e24] rounded-xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#1e1e24] shrink-0">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-[#22c55e]" />
            <h2 className="text-sm font-semibold text-[#f1f1f3]">Seleccionar Cliente</h2>
          </div>
          <button type="button" onClick={onCerrar} className="p-1 rounded text-[#5a5a6e] hover:text-[#e1e1eb] hover:bg-[#1a1f2e] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
          {/* Cliente actual */}
          {cliente && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-[#22c55e]/30 bg-[#22c55e]/10 px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <Check className="w-4 h-4 text-[#22c55e] shrink-0" />
                <span className="text-sm text-[#f1f1f3] truncate">{labelCliente(cliente)}</span>
              </div>
              <button type="button" onClick={onQuitar}
                className="p-1 rounded text-[#9a9aac] hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0" title="Quitar cliente">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Search */}
          {!mostrarForm && (
            <>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3a3a4a]" />
                <input ref={inputRef} type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre o documento..."
                  className="w-full rounded-lg border border-[#2a2a32] bg-[#0d0d0f] pl-8 pr-3 py-2 text-sm text-[#f1f1f3] placeholder:text-[#4a4a5a] focus:border-[#22c55e]/50 outline-none transition-colors" />
              </div>

              {error && <p className="text-xs text-rose-300">{error}</p>}

              <ul className="max-h-48 overflow-y-auto rounded-lg border border-[#1e1e24] divide-y divide-[#1e1e24] bg-[#0d0d0f]">
                {cargando ? (
                  <li className="px-3 py-2 text-xs text-[#5a5a6e]">Buscando...</li>
                ) : opciones.length === 0 ? (
                  <li className="px-3 py-2 text-xs text-[#5a5a6e]">Sin resultados</li>
                ) : (
                  opciones.map((c) => (
                    <li key={c.id ?? c.idCliente}>
                      <button type="button" onClick={() => { onSeleccionar(c); onCerrar(); }}
                        className="w-full text-left px-3 py-2.5 text-sm text-[#e1e1eb] hover:bg-[#151a24] transition-colors flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-[#5a5a6e] shrink-0" />
                        {labelCliente(c)}
                      </button>
                    </li>
                  ))
                )}
              </ul>

              <button type="button" onClick={() => setMostrarForm(true)}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-[#2a2a32] bg-[#0d0d0f] py-2.5 text-sm text-[#9a9aac] hover:border-[#22c55e]/40 hover:text-[#22c55e] transition-colors">
                <UserPlus className="w-4 h-4" />
                Nuevo cliente
              </button>
            </>
          )}

          {/* Form nuevo cliente */}
          {mostrarForm && (
            <form onSubmit={handleCrearCliente} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-[#9a9aac] uppercase tracking-wide">Nuevo Cliente</h3>
                <button type="button" onClick={() => setMostrarForm(false)} className="text-xs text-[#5a5a6e] hover:text-[#e1e1eb]">Volver a buscar</button>
              </div>

              <div className="flex gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="tipoCliente" value="FISICA" checked={form.tipoCliente === "FISICA"} onChange={handleFormChange} className="accent-[#22c55e]" />
                  <span className="text-xs text-[#9a9aac]">Física</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="tipoCliente" value="JURIDICA" checked={form.tipoCliente === "JURIDICA"} onChange={handleFormChange} className="accent-[#22c55e]" />
                  <span className="text-xs text-[#9a9aac]">Jurídica</span>
                </label>
              </div>

              {esJuridica ? (
                <>
                  <input name="razonSocial" value={form.razonSocial} onChange={handleFormChange} placeholder="Razón social *"
                    className="w-full rounded-lg border border-[#2a2a32] bg-[#0d0d0f] px-3 py-2 text-sm text-[#f1f1f3] placeholder:text-[#4a4a5a] focus:border-[#22c55e]/50 outline-none" />
                  <input name="ruc" value={form.ruc} onChange={handleFormChange} placeholder="RUC / Documento"
                    className="w-full rounded-lg border border-[#2a2a32] bg-[#0d0d0f] px-3 py-2 text-sm text-[#f1f1f3] placeholder:text-[#4a4a5a] focus:border-[#22c55e]/50 outline-none" />
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <input name="firstName" value={form.firstName} onChange={handleFormChange} placeholder="Nombre *"
                    className="rounded-lg border border-[#2a2a32] bg-[#0d0d0f] px-3 py-2 text-sm text-[#f1f1f3] placeholder:text-[#4a4a5a] focus:border-[#22c55e]/50 outline-none" />
                  <input name="lastName" value={form.lastName} onChange={handleFormChange} placeholder="Apellido"
                    className="rounded-lg border border-[#2a2a32] bg-[#0d0d0f] px-3 py-2 text-sm text-[#f1f1f3] placeholder:text-[#4a4a5a] focus:border-[#22c55e]/50 outline-none" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <input name="phoneNumber" value={form.phoneNumber} onChange={handleFormChange} placeholder="Teléfono"
                  className="rounded-lg border border-[#2a2a32] bg-[#0d0d0f] px-3 py-2 text-sm text-[#f1f1f3] placeholder:text-[#4a4a5a] focus:border-[#22c55e]/50 outline-none" />
                <input name="email" value={form.email} onChange={handleFormChange} placeholder="Email"
                  className="rounded-lg border border-[#2a2a32] bg-[#0d0d0f] px-3 py-2 text-sm text-[#f1f1f3] placeholder:text-[#4a4a5a] focus:border-[#22c55e]/50 outline-none" />
              </div>

              {errorForm && <p className="text-xs text-rose-300">{errorForm}</p>}

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setMostrarForm(false)}
                  className="flex-1 rounded-lg border border-[#2a2a32] bg-[#0d0d0f] py-2 text-sm text-[#9a9aac] hover:text-[#e1e1eb] transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={guardando || !puedeCrear}
                  className="flex-1 rounded-lg bg-[#22c55e] py-2 text-sm font-semibold text-[#0d0d0f] hover:bg-[#16a34a] disabled:opacity-40 transition-colors">
                  {guardando ? "Guardando..." : "Crear y seleccionar"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
