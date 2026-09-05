import { useState, useEffect } from "react";
import {
  Plus, Pencil, Trash2, ChevronDown, Check, X, ToggleLeft, ToggleRight,
} from "lucide-react";
import {
  getPaisesABM, getCiudadesABM, crearPais, actualizarPais, toggleActivoPais,
  crearCiudad, actualizarCiudad, toggleActivoCiudad,
} from "../../api/paisesCiudadesApi";

const inputClass =
  "flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[var(--accent-green)]";

function esCodigoValido(codigo) {
  return /^[A-Z]{2}$/.test(String(codigo || "").trim().toUpperCase());
}

export function SeccionPaises() {
  const [paises, setPaises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoCodigo, setNuevoCodigo] = useState("");

  const [editId, setEditId] = useState(null);
  const [editNombre, setEditNombre] = useState("");
  const [editCodigo, setEditCodigo] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      setPaises(await getPaisesABM());
    } catch {
      setError("No se pudieron cargar los países.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    setError("");
    const nombre = nuevoNombre.trim();
    if (!nombre) { setError("El nombre es obligatorio."); return; }
    if (!esCodigoValido(nuevoCodigo)) { setError("El código debe tener 2 letras (ej: PY)."); return; }
    try {
      await crearPais({ nombre, codigo: nuevoCodigo.trim().toUpperCase() });
      setNuevoNombre("");
      setNuevoCodigo("");
      await load();
    } catch {
      setError("No se pudo crear el país (¿nombre o código duplicado?).");
    }
  };

  const handleEdit = async () => {
    if (editId == null) return;
    setError("");
    const nombre = editNombre.trim();
    if (!nombre) { setError("El nombre es obligatorio."); return; }
    if (!esCodigoValido(editCodigo)) { setError("El código debe tener 2 letras (ej: PY)."); return; }
    try {
      await actualizarPais(editId, { nombre, codigo: editCodigo.trim().toUpperCase() });
      setEditId(null);
      await load();
    } catch {
      setError("No se pudo actualizar el país (¿nombre o código duplicado?).");
    }
  };

  const handleToggle = async (p) => {
    setError("");
    const accion = p.activo === false ? "activar" : "desactivar";
    if (!window.confirm(`¿${accion} a ${p.nombre}?`)) return;
    try {
      await toggleActivoPais(p.id, p.activo);
      await load();
    } catch {
      setError("No se pudo cambiar el estado del país.");
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <input value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Nombre del país..."
          className={inputClass} />
        <input value={nuevoCodigo} onChange={(e) => setNuevoCodigo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Código (PY)"
          maxLength={2}
          className="w-28 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[var(--accent-green)]" />
        <button onClick={handleAdd} className="flex items-center gap-1 px-3 py-2 bg-[var(--accent-green)]/90 hover:bg-[var(--accent-green)] text-black text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Agregar
        </button>
      </div>

      {error && <div className="mb-3 px-3 py-2 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg">{error}</div>}

      {loading ? (
        <div className="text-white/40 text-sm py-4 text-center">Cargando...</div>
      ) : paises.length === 0 ? (
        <div className="text-white/30 text-sm py-4 text-center">Sin países</div>
      ) : (
        <div className="space-y-1">
          {paises.map((p) => (
            <div key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 group">
              {editId === p.id ? (
                <>
                  <input value={editNombre} onChange={(e) => setEditNombre(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleEdit()}
                    className="flex-1 bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-white focus:outline-none" autoFocus />
                  <input value={editCodigo} onChange={(e) => setEditCodigo(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleEdit()}
                    maxLength={2}
                    className="w-20 bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-white focus:outline-none" />
                  <button onClick={handleEdit} className="p-1 text-green-400 hover:text-green-300"><Check className="w-4 h-4" /></button>
                  <button onClick={() => { setEditId(null); }} className="p-1 text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
                </>
              ) : (
                <>
                  <span className="text-white text-sm flex-none">{p.codigo}</span>
                  <span className="flex-1 text-sm text-white">{p.nombre}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p.activo === false ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>
                    {p.activo === false ? "Inactivo" : "Activo"}
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditId(p.id); setEditNombre(p.nombre); setEditCodigo(p.codigo ?? ""); }} className="p-1 text-white/40 hover:text-[var(--accent-green)]"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleToggle(p)} className="p-1 text-white/40 hover:text-[var(--accent-green)]">
                      {p.activo === false ? <ToggleLeft className="w-3.5 h-3.5" /> : <ToggleRight className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SeccionCiudades() {
  const [paises, setPaises] = useState([]);
  const [idPais, setIdPais] = useState("");
  const [ciudades, setCiudades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoCodigoPostal, setNuevoCodigoPostal] = useState("");

  const [editId, setEditId] = useState(null);
  const [editNombre, setEditNombre] = useState("");
  const [editCodigoPostal, setEditCodigoPostal] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const p = await getPaisesABM();
        setPaises(p);
        if (p.length) {
          setIdPais(String(p[0].id));
        }
      } catch {
        setError("No se pudieron cargar los países.");
      }
    })();
  }, []);

  const loadCiudades = async (paisId) => {
    if (!paisId) { setCiudades([]); return; }
    setLoading(true);
    try {
      setCiudades(await getCiudadesABM(paisId));
    } catch {
      setError("No se pudieron cargar las ciudades.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (idPais) {
      setError("");
      loadCiudades(idPais);
      setEditId(null);
    }
  }, [idPais]);

  const handleAdd = async () => {
    setError("");
    const nombre = nuevoNombre.trim();
    if (!idPais) { setError("Seleccioná un país."); return; }
    if (!nombre) { setError("El nombre es obligatorio."); return; }
    try {
      await crearCiudad({
        idPais: Number(idPais),
        nombre,
        codigoPostal: nuevoCodigoPostal.trim() || null,
      });
      setNuevoNombre("");
      setNuevoCodigoPostal("");
      await loadCiudades(idPais);
    } catch {
      setError("No se pudo crear la ciudad.");
    }
  };

  const handleEdit = async () => {
    if (editId == null) return;
    setError("");
    const nombre = editNombre.trim();
    if (!nombre) { setError("El nombre es obligatorio."); return; }
    try {
      await actualizarCiudad(editId, {
        idPais: Number(idPais),
        nombre,
        codigoPostal: editCodigoPostal.trim() || null,
      });
      setEditId(null);
      await loadCiudades(idPais);
    } catch {
      setError("No se pudo actualizar la ciudad.");
    }
  };

  const handleToggle = async (c) => {
    setError("");
    const accion = c.activo === false ? "activar" : "desactivar";
    if (!window.confirm(`¿${accion} a ${c.nombre}?`)) return;
    try {
      await toggleActivoCiudad(c.id, c.activo);
      await loadCiudades(idPais);
    } catch {
      setError("No se pudo cambiar el estado de la ciudad.");
    }
  };

  const selectClass =
    "bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--accent-green)] cursor-pointer";

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-white/50">País</span>
        <select value={idPais} onChange={(e) => setIdPais(e.target.value)} className={selectClass}>
          {paises.map((p) => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <input value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Nombre de la ciudad..."
          className={inputClass} />
        <input value={nuevoCodigoPostal} onChange={(e) => setNuevoCodigoPostal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Código postal"
          className="w-32 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[var(--accent-green)]" />
        <button onClick={handleAdd} className="flex items-center gap-1 px-3 py-2 bg-[var(--accent-green)]/90 hover:bg-[var(--accent-green)] text-black text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Agregar
        </button>
      </div>

      {error && <div className="mb-3 px-3 py-2 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg">{error}</div>}

      {loading ? (
        <div className="text-white/40 text-sm py-4 text-center">Cargando...</div>
      ) : ciudades.length === 0 ? (
        <div className="text-white/30 text-sm py-4 text-center">Sin ciudades para este país</div>
      ) : (
        <div className="space-y-1">
          {ciudades.map((c) => (
            <div key={c.id} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 group">
              {editId === c.id ? (
                <>
                  <input value={editNombre} onChange={(e) => setEditNombre(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleEdit()}
                    className="flex-1 bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-white focus:outline-none" autoFocus />
                  <input value={editCodigoPostal} onChange={(e) => setEditCodigoPostal(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleEdit()}
                    className="w-28 bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-white focus:outline-none" />
                  <button onClick={handleEdit} className="p-1 text-green-400 hover:text-green-300"><Check className="w-4 h-4" /></button>
                  <button onClick={() => { setEditId(null); }} className="p-1 text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
                </>
              ) : (
                <>
                  <span className="text-white text-sm flex-none">{c.codigoPostal || "—"}</span>
                  <span className="flex-1 text-sm text-white">{c.nombre}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${c.activo === false ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>
                    {c.activo === false ? "Inactivo" : "Activo"}
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditId(c.id); setEditNombre(c.nombre); setEditCodigoPostal(c.codigoPostal ?? ""); }} className="p-1 text-white/40 hover:text-[var(--accent-green)]"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleToggle(c)} className="p-1 text-white/40 hover:text-[var(--accent-green)]">
                      {c.activo === false ? <ToggleLeft className="w-3.5 h-3.5" /> : <ToggleRight className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AccordionSection({ titulo, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-white/[0.03] hover:bg-white/[0.06] transition-colors text-left">
        <h3 className="text-white font-medium text-sm">{titulo}</h3>
        <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

export default function PaisesCiudadesABM() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-[#f1f1f3] tracking-tight">
          Países y Ciudades
        </h1>
        <p className="text-sm text-[#5a5a6e]">
          Gestión de países y ciudades
        </p>
      </div>
      <div className="space-y-5">
        <AccordionSection titulo="Países" defaultOpen={true}>
          <SeccionPaises />
        </AccordionSection>
        <AccordionSection titulo="Ciudades">
          <SeccionCiudades />
        </AccordionSection>
      </div>
    </div>
  );
}