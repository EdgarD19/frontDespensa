import { useState, useEffect } from "react";
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronRight, X, Check
} from "lucide-react";
import { getCategorias, getPaises, getMarcas, getSubcategorias, getCiudades } from "../../../api/maestrosApi";
import {
  crearCategoria, actualizarCategoria, eliminarCategoria,
  crearSubcategoria, actualizarSubcategoria, eliminarSubcategoria,
  crearMarca, actualizarMarca, eliminarMarca,
  crearPais, actualizarPais, eliminarPais,
  crearCiudad, actualizarCiudad, eliminarCiudad,
} from "../../../api/maestrosABMApi";

function SeccionCategorias() {
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [expandedCat, setExpandedCat] = useState(null);
  const [subs, setSubs] = useState([]);
  const [subNewName, setSubNewName] = useState("");
  const [subEditId, setSubEditId] = useState(null);
  const [subEditName, setSubEditName] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const d = await getCategorias();
      setCats(Array.isArray(d) ? d : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const loadSubs = async (id) => {
    if (!id) { setSubs([]); return; }
    try {
      const d = await getSubcategorias(id);
      setSubs(Array.isArray(d) ? d : []);
    } catch { setSubs([]); }
  };

  const handleExpand = (id) => {
    if (expandedCat === id) {
      setExpandedCat(null);
      setSubs([]);
    } else {
      setExpandedCat(id);
      loadSubs(id);
    }
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await crearCategoria(newName.trim());
    setNewName("");
    await load();
  };

  const handleEdit = async (id) => {
    if (!editName.trim()) return;
    await actualizarCategoria(id, editName.trim());
    setEditId(null);
    setEditName("");
    await load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar esta categoría?")) return;
    await eliminarCategoria(id);
    if (expandedCat === id) { setExpandedCat(null); setSubs([]); }
    await load();
  };

  const handleSubAdd = async () => {
    if (!subNewName.trim() || !expandedCat) return;
    await crearSubcategoria(expandedCat, subNewName.trim());
    setSubNewName("");
    await loadSubs(expandedCat);
  };

  const handleSubEdit = async (id) => {
    if (!subEditName.trim()) return;
    await actualizarSubcategoria(id, subEditName.trim());
    setSubEditId(null);
    setSubEditName("");
    await loadSubs(expandedCat);
  };

  const handleSubDelete = async (id) => {
    if (!window.confirm("¿Eliminar esta subcategoría?")) return;
    await eliminarSubcategoria(id);
    await loadSubs(expandedCat);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <input value={newName} onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Nueva categoría..."
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[var(--accent-green)]" />
        <button onClick={handleAdd} className="flex items-center gap-1 px-3 py-2 bg-[var(--accent-green)]/90 hover:bg-[var(--accent-green)] text-black text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Agregar
        </button>
      </div>
      {loading ? (
        <div className="text-white/40 text-sm py-4 text-center">Cargando...</div>
      ) : cats.length === 0 ? (
        <div className="text-white/30 text-sm py-4 text-center">Sin categorías</div>
      ) : (
        <div className="space-y-1">
          {cats.map((cat) => (
            <div key={cat.id}>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 group">
                <button onClick={() => handleExpand(cat.id)} className="text-white/30 hover:text-white transition-colors p-0.5">
                  {expandedCat === cat.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                {editId === cat.id ? (
                  <>
                    <input value={editName} onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleEdit(cat.id)}
                      className="flex-1 bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-white focus:outline-none" autoFocus />
                    <button onClick={() => handleEdit(cat.id)} className="p-1 text-green-400 hover:text-green-300"><Check className="w-4 h-4" /></button>
                    <button onClick={() => { setEditId(null); setEditName(""); }} className="p-1 text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-white">{cat.nombre}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditId(cat.id); setEditName(cat.nombre); }} className="p-1 text-white/40 hover:text-[var(--accent-green)]"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(cat.id)} className="p-1 text-white/40 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </>
                )}
              </div>
              {expandedCat === cat.id && (
                <div className="ml-8 mt-1 mb-2 pl-3 border-l border-white/10 space-y-1">
                  <div className="flex items-center gap-2">
                    <input value={subNewName} onChange={(e) => setSubNewName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSubAdd()}
                      placeholder="Nueva subcategoría..."
                      className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[var(--accent-green)]" />
                    <button onClick={handleSubAdd} className="p-1.5 text-[var(--accent-green)] hover:text-green-300"><Plus className="w-4 h-4" /></button>
                  </div>
                  {subs.length === 0 ? (
                    <div className="text-white/30 text-xs py-2">Sin subcategorías</div>
                  ) : (
                    subs.map((s) => (
                      <div key={s.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 group">
                        {subEditId === s.id ? (
                          <>
                            <input value={subEditName} onChange={(e) => setSubEditName(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && handleSubEdit(s.id)}
                              className="flex-1 bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-white focus:outline-none" autoFocus />
                            <button onClick={() => handleSubEdit(s.id)} className="p-1 text-green-400"><Check className="w-3.5 h-3.5" /></button>
                            <button onClick={() => { setSubEditId(null); setSubEditName(""); }} className="p-1 text-white/40"><X className="w-3.5 h-3.5" /></button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-xs text-white/70">{s.nombre}</span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setSubEditId(s.id); setSubEditName(s.nombre); }} className="p-1 text-white/40 hover:text-[var(--accent-green)]"><Pencil className="w-3 h-3" /></button>
                              <button onClick={() => handleSubDelete(s.id)} className="p-1 text-white/40 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SeccionPaises() {
  const [paises, setPaises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [expandedPais, setExpandedPais] = useState(null);
  const [ciudades, setCiudades] = useState([]);
  const [ciuNewName, setCiuNewName] = useState("");
  const [ciuEditId, setCiuEditId] = useState(null);
  const [ciuEditName, setCiuEditName] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const d = await getPaises();
      setPaises(Array.isArray(d) ? d : []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const loadCiudades = async (id) => {
    if (!id) { setCiudades([]); return; }
    try { const d = await getCiudades(id); setCiudades(Array.isArray(d) ? d : []); }
    catch { setCiudades([]); }
  };

  const handleExpand = (id) => {
    if (expandedPais === id) { setExpandedPais(null); setCiudades([]); }
    else { setExpandedPais(id); loadCiudades(id); }
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await crearPais(newName.trim());
    setNewName("");
    await load();
  };

  const handleEdit = async (id) => {
    if (!editName.trim()) return;
    await actualizarPais(id, editName.trim());
    setEditId(null);
    setEditName("");
    await load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar este país?")) return;
    await eliminarPais(id);
    if (expandedPais === id) { setExpandedPais(null); setCiudades([]); }
    await load();
  };

  const handleCiuAdd = async () => {
    if (!ciuNewName.trim() || !expandedPais) return;
    await crearCiudad(expandedPais, ciuNewName.trim());
    setCiuNewName("");
    await loadCiudades(expandedPais);
  };

  const handleCiuEdit = async (id) => {
    if (!ciuEditName.trim()) return;
    await actualizarCiudad(id, ciuEditName.trim());
    setCiuEditId(null);
    setCiuEditName("");
    await loadCiudades(expandedPais);
  };

  const handleCiuDelete = async (id) => {
    if (!window.confirm("¿Eliminar esta ciudad?")) return;
    await eliminarCiudad(id);
    await loadCiudades(expandedPais);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <input value={newName} onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Nuevo país..."
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[var(--accent-green)]" />
        <button onClick={handleAdd} className="flex items-center gap-1 px-3 py-2 bg-[var(--accent-green)]/90 hover:bg-[var(--accent-green)] text-black text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Agregar
        </button>
      </div>
      {loading ? (
        <div className="text-white/40 text-sm py-4 text-center">Cargando...</div>
      ) : paises.length === 0 ? (
        <div className="text-white/30 text-sm py-4 text-center">Sin países</div>
      ) : (
        <div className="space-y-1">
          {paises.map((p) => (
            <div key={p.id}>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 group">
                <button onClick={() => handleExpand(p.id)} className="text-white/30 hover:text-white transition-colors p-0.5">
                  {expandedPais === p.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                {editId === p.id ? (
                  <>
                    <input value={editName} onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleEdit(p.id)}
                      className="flex-1 bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-white focus:outline-none" autoFocus />
                    <button onClick={() => handleEdit(p.id)} className="p-1 text-green-400"><Check className="w-4 h-4" /></button>
                    <button onClick={() => { setEditId(null); setEditName(""); }} className="p-1 text-white/40"><X className="w-4 h-4" /></button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-white">{p.nombre}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditId(p.id); setEditName(p.nombre); }} className="p-1 text-white/40 hover:text-[var(--accent-green)]"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(p.id)} className="p-1 text-white/40 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </>
                )}
              </div>
              {expandedPais === p.id && (
                <div className="ml-8 mt-1 mb-2 pl-3 border-l border-white/10 space-y-1">
                  <div className="flex items-center gap-2">
                    <input value={ciuNewName} onChange={(e) => setCiuNewName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCiuAdd()}
                      placeholder="Nueva ciudad..."
                      className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[var(--accent-green)]" />
                    <button onClick={handleCiuAdd} className="p-1.5 text-[var(--accent-green)] hover:text-green-300"><Plus className="w-4 h-4" /></button>
                  </div>
                  {ciudades.length === 0 ? (
                    <div className="text-white/30 text-xs py-2">Sin ciudades</div>
                  ) : (
                    ciudades.map((c) => (
                      <div key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 group">
                        {ciuEditId === c.id ? (
                          <>
                            <input value={ciuEditName} onChange={(e) => setCiuEditName(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && handleCiuEdit(c.id)}
                              className="flex-1 bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-white focus:outline-none" autoFocus />
                            <button onClick={() => handleCiuEdit(c.id)} className="p-1 text-green-400"><Check className="w-3.5 h-3.5" /></button>
                            <button onClick={() => { setCiuEditId(null); setCiuEditName(""); }} className="p-1 text-white/40"><X className="w-3.5 h-3.5" /></button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-xs text-white/70">{c.nombre}</span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setCiuEditId(c.id); setCiuEditName(c.nombre); }} className="p-1 text-white/40 hover:text-[var(--accent-green)]"><Pencil className="w-3 h-3" /></button>
                              <button onClick={() => handleCiuDelete(c.id)} className="p-1 text-white/40 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SeccionMarcas() {
  const [marcas, setMarcas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const d = await getMarcas();
      setMarcas(Array.isArray(d) ? d : []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await crearMarca(newName.trim());
    setNewName("");
    await load();
  };

  const handleEdit = async (id) => {
    if (!editName.trim()) return;
    await actualizarMarca(id, editName.trim());
    setEditId(null);
    setEditName("");
    await load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar esta marca?")) return;
    await eliminarMarca(id);
    await load();
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <input value={newName} onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Nueva marca..."
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[var(--accent-green)]" />
        <button onClick={handleAdd} className="flex items-center gap-1 px-3 py-2 bg-[var(--accent-green)]/90 hover:bg-[var(--accent-green)] text-black text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Agregar
        </button>
      </div>
      {loading ? (
        <div className="text-white/40 text-sm py-4 text-center">Cargando...</div>
      ) : marcas.length === 0 ? (
        <div className="text-white/30 text-sm py-4 text-center">Sin marcas</div>
      ) : (
        <div className="space-y-1">
          {marcas.map((m) => (
            <div key={m.id} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 group">
              {editId === m.id ? (
                <>
                  <input value={editName} onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleEdit(m.id)}
                    className="flex-1 bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-white focus:outline-none" autoFocus />
                  <button onClick={() => handleEdit(m.id)} className="p-1 text-green-400"><Check className="w-4 h-4" /></button>
                  <button onClick={() => { setEditId(null); setEditName(""); }} className="p-1 text-white/40"><X className="w-4 h-4" /></button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-white">{m.nombre}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditId(m.id); setEditName(m.nombre); }} className="p-1 text-white/40 hover:text-[var(--accent-green)]"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(m.id)} className="p-1 text-white/40 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
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

const TABS = [
  { id: "categorias", label: "Categorías + Subcategorías" },
  { id: "paises", label: "Países + Ciudades" },
  { id: "marcas", label: "Marcas" },
];

const CLS_ACTIVE = "border-b-2 border-[#22c55e] text-[#22c55e]";
const CLS_INACTIVE = "text-white/40 hover:text-white/70 border-b-2 border-transparent";

export default function MaestrosABM() {
  const [tab, setTab] = useState("categorias");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-white mb-1">Administrar Maestros</h1>
        <p className="text-sm text-white/40">Gestiona categorías, subcategorías, marcas, países y ciudades</p>
      </div>

      <div className="flex gap-6 border-b border-white/10">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`pb-2 text-sm font-medium transition-colors ${tab === t.id ? CLS_ACTIVE : CLS_INACTIVE}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="pt-1">
        {tab === "categorias" && <SeccionCategorias />}
        {tab === "paises" && <SeccionPaises />}
        {tab === "marcas" && <SeccionMarcas />}
      </div>
    </div>
  );
}
