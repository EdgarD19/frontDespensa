import { useState, useEffect } from "react";
import {
  Plus, Pencil, Check, X, ChevronDown, ToggleLeft, ToggleRight,
} from "lucide-react";
import ConfirmModal from "../../../components/ui/ConfirmModal";
import { getCategorias, getSubcategorias } from "../../../api/maestrosApi";
import {
  crearCategoria, actualizarCategoria, toggleActivoCategoria,
  crearSubcategoria, actualizarSubcategoria, toggleActivoSubcategoria,
} from "../../../api/maestrosABMApi";

const inputClass =
  "flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[var(--accent-green)]";

export function SeccionCategorias() {
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [confirmarCat, setConfirmarCat] = useState(null);
  const [cambiando, setCambiando] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setCats(await getCategorias());
    } catch {
      setError("No se pudieron cargar las categorías.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    setError("");
    const nombre = newName.trim();
    if (!nombre) { setError("El nombre es obligatorio."); return; }
    try {
      await crearCategoria(nombre);
      setNewName("");
      await load();
    } catch {
      setError("No se pudo crear la categoría (¿nombre duplicado?).");
    }
  };

  const handleEdit = async () => {
    if (editId == null) return;
    setError("");
    const nombre = editName.trim();
    if (!nombre) { setError("El nombre es obligatorio."); return; }
    try {
      await actualizarCategoria(editId, nombre);
      setEditId(null);
      await load();
    } catch {
      setError("No se pudo actualizar la categoría (¿nombre duplicado?).");
    }
  };

  const handleToggle = (c) => setConfirmarCat({ id: c.id, nombre: c.nombre, activar: c.activo === false });

  const confirmarCambioEstado = async () => {
    if (!confirmarCat) return;
    setCambiando(true);
    setError("");
    try {
      await toggleActivoCategoria(confirmarCat.id, !confirmarCat.activar);
      setConfirmarCat(null);
      await load();
    } catch {
      setError("No se pudo cambiar el estado de la categoría.");
      setConfirmarCat(null);
    } finally {
      setCambiando(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <input value={newName} onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Nueva categoría..."
          className={inputClass} />
        <button onClick={handleAdd} className="flex items-center gap-1 px-3 py-2 bg-[var(--accent-green)]/90 hover:bg-[var(--accent-green)] text-black text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Agregar
        </button>
      </div>

      {error && <div className="mb-3 px-3 py-2 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg">{error}</div>}

      {loading ? (
        <div className="text-white/40 text-sm py-4 text-center">Cargando...</div>
      ) : cats.length === 0 ? (
        <div className="text-white/30 text-sm py-4 text-center">Sin categorías</div>
      ) : (
        <div className="space-y-1">
          {cats.map((c) => (
            <div key={c.id} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 group">
              {editId === c.id ? (
                <>
                  <input value={editName} onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleEdit()}
                    className="flex-1 bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-white focus:outline-none" autoFocus />
                  <button onClick={handleEdit} className="p-1 text-green-400 hover:text-green-300"><Check className="w-4 h-4" /></button>
                  <button onClick={() => { setEditId(null); }} className="p-1 text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-white">{c.nombre}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${c.activo === false ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>
                    {c.activo === false ? "Inactivo" : "Activo"}
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditId(c.id); setEditName(c.nombre); }} className="p-1 text-white/40 hover:text-[var(--accent-green)]"><Pencil className="w-3.5 h-3.5" /></button>
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
      {confirmarCat && (
        <ConfirmModal
          abierto
          titulo={confirmarCat.activar ? "Activar categoría" : "Inactivar categoría"}
          mensaje={`¿${confirmarCat.activar ? "Activar" : "Inactivar"} "${confirmarCat.nombre}"?`}
          confirmarLabel={confirmarCat.activar ? "Activar" : "Inactivar"}
          confirmarClass={
            confirmarCat.activar
              ? "bg-[#22c55e] text-[#0d0d0f] hover:bg-[#16a34a]"
              : "bg-[#ef4444] text-[#0d0d0f] hover:bg-[#dc2626]"
          }
          cargando={cambiando}
          onConfirmar={confirmarCambioEstado}
          onCerrar={() => setConfirmarCat(null)}
        />
      )}
    </div>
  );
}

export function SeccionSubcategorias() {
  const [cats, setCats] = useState([]);
  const [idCategoria, setIdCategoria] = useState("");
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [confirmarSub, setConfirmarSub] = useState(null);
  const [cambiando, setCambiando] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const c = await getCategorias();
        setCats(c);
        if (c.length) setIdCategoria(String(c[0].id));
      } catch {
        setError("No se pudieron cargar las categorías.");
      }
    })();
  }, []);

  const loadSubs = async (catId) => {
    if (!catId) { setSubs([]); return; }
    setLoading(true);
    try {
      setSubs(await getSubcategorias(catId));
    } catch {
      setError("No se pudieron cargar las subcategorías.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (idCategoria) {
      setError("");
      loadSubs(idCategoria);
      setEditId(null);
    }
  }, [idCategoria]);

  const handleAdd = async () => {
    setError("");
    const nombre = newName.trim();
    if (!idCategoria) { setError("Seleccioná una categoría."); return; }
    if (!nombre) { setError("El nombre es obligatorio."); return; }
    try {
      await crearSubcategoria(Number(idCategoria), nombre);
      setNewName("");
      await loadSubs(idCategoria);
    } catch {
      setError("No se pudo crear la subcategoría.");
    }
  };

  const handleEdit = async () => {
    if (editId == null) return;
    setError("");
    const nombre = editName.trim();
    if (!nombre) { setError("El nombre es obligatorio."); return; }
    try {
      await actualizarSubcategoria(editId, nombre, Number(idCategoria));
      setEditId(null);
      await loadSubs(idCategoria);
    } catch {
      setError("No se pudo actualizar la subcategoría.");
    }
  };

  const handleToggle = (s) => setConfirmarSub({ id: s.id, nombre: s.nombre, activar: s.activo === false });

  const confirmarCambioEstado = async () => {
    if (!confirmarSub) return;
    setCambiando(true);
    setError("");
    try {
      await toggleActivoSubcategoria(confirmarSub.id, !confirmarSub.activar);
      setConfirmarSub(null);
      await loadSubs(idCategoria);
    } catch {
      setError("No se pudo cambiar el estado de la subcategoría.");
      setConfirmarSub(null);
    } finally {
      setCambiando(false);
    }
  };

  const selectClass =
    "bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--accent-green)] cursor-pointer";

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-white/50">Categoría</span>
        <select value={idCategoria} onChange={(e) => setIdCategoria(e.target.value)} className={selectClass}>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <input value={newName} onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Nueva subcategoría..."
          className={inputClass} />
        <button onClick={handleAdd} className="flex items-center gap-1 px-3 py-2 bg-[var(--accent-green)]/90 hover:bg-[var(--accent-green)] text-black text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Agregar
        </button>
      </div>

      {error && <div className="mb-3 px-3 py-2 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg">{error}</div>}

      {loading ? (
        <div className="text-white/40 text-sm py-4 text-center">Cargando...</div>
      ) : subs.length === 0 ? (
        <div className="text-white/30 text-sm py-4 text-center">Sin subcategorías para esta categoría</div>
      ) : (
        <div className="space-y-1">
          {subs.map((s) => (
            <div key={s.id} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 group">
              {editId === s.id ? (
                <>
                  <input value={editName} onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleEdit()}
                    className="flex-1 bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-white focus:outline-none" autoFocus />
                  <button onClick={handleEdit} className="p-1 text-green-400 hover:text-green-300"><Check className="w-4 h-4" /></button>
                  <button onClick={() => { setEditId(null); }} className="p-1 text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-white">{s.nombre}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.activo === false ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>
                    {s.activo === false ? "Inactivo" : "Activo"}
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditId(s.id); setEditName(s.nombre); }} className="p-1 text-white/40 hover:text-[var(--accent-green)]"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleToggle(s)} className="p-1 text-white/40 hover:text-[var(--accent-green)]">
                      {s.activo === false ? <ToggleLeft className="w-3.5 h-3.5" /> : <ToggleRight className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
      {confirmarSub && (
        <ConfirmModal
          abierto
          titulo={confirmarSub.activar ? "Activar subcategoría" : "Inactivar subcategoría"}
          mensaje={`¿${confirmarSub.activar ? "Activar" : "Inactivar"} "${confirmarSub.nombre}"?`}
          confirmarLabel={confirmarSub.activar ? "Activar" : "Inactivar"}
          confirmarClass={
            confirmarSub.activar
              ? "bg-[#22c55e] text-[#0d0d0f] hover:bg-[#16a34a]"
              : "bg-[#ef4444] text-[#0d0d0f] hover:bg-[#dc2626]"
          }
          cargando={cambiando}
          onConfirmar={confirmarCambioEstado}
          onCerrar={() => setConfirmarSub(null)}
        />
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

export default function MaestrosABM() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-white mb-1">Administrar Maestros</h1>
        <p className="text-sm text-white/40">Gestiona categorías y subcategorías</p>
      </div>
      <AccordionSection titulo="Categorías" defaultOpen={true}>
        <SeccionCategorias />
      </AccordionSection>
      <AccordionSection titulo="Subcategorías">
        <SeccionSubcategorias />
      </AccordionSection>
    </div>
  );
}