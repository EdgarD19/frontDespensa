import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { api } from "../../api/client";
import { listUsers, updateUser } from "../../api/authApi";
import { UserPlus, Pencil, Check, X, Eye, EyeOff, Search } from "lucide-react";

const ROLES = [
  { id: 1, nombre: "ADMIN" },
  { id: 2, nombre: "CAJERO" },
];

export default function RegisterPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ username: "", password: "", confirmPassword: "", nombre: "", idRol: 2 });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAdmin) { navigate("/", { replace: true }); return; }
    fetchUsers();
  }, [isAdmin, navigate]);

  async function fetchUsers() {
    try {
      setLoading(true);
      const data = await listUsers();
      setUsers(data);
    } catch (err) {
      if (err?.response?.status === 403) {
        setError("Acceso denegado. No tienes permisos de administrador.");
        return;
      }
      setError("Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm({ username: "", password: "", confirmPassword: "", nombre: "", idRol: 2 });
    setShowPassword(false);
    setError("");
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    if (!form.username.trim() || !form.password.trim()) {
      setError("Usuario y contrase\u00f1a son obligatorios"); return;
    }
    if (form.password.length < 4) {
      setError("La contrase\u00f1a debe tener al menos 4 caracteres"); return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Las contrase\u00f1as no coinciden"); return;
    }
    setSaving(true);
    try {
      await api.post("/api/auth/register", {
        username: form.username.trim(),
        password: form.password,
        nombre: form.nombre.trim() || undefined,
        idRol: form.idRol,
      });
      setShowCreate(false);
      resetForm();
      fetchUsers();
    } catch (err) {
      setError(err?.response?.data?.error || "Error al crear usuario");
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(user) {
    setEditUser({ ...user, password: "", confirmPassword: "" });
    setError("");
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const body = {};
      if (editUser.nombre?.trim()) body.nombre = editUser.nombre.trim();
      if (editUser.idRol) body.idRol = editUser.idRol;
      if (editUser.password?.length >= 4) body.password = editUser.password;
      await updateUser(editUser.id, body);
      setEditUser(null);
      fetchUsers();
    } catch (err) {
      setError(err?.response?.data?.error || "Error al actualizar usuario");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActivo(user) {
    try {
      await updateUser(user.id, { activo: !user.activo });
      fetchUsers();
    } catch {
      setError("Error al cambiar estado");
    }
  }

  const fieldClass = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder:text-white/30 text-sm outline-none focus:border-[#22c55e]/40 focus:ring-1 focus:ring-[#22c55e]/20 transition-all";

  return (
    <div className="max-w-3xl mx-auto mt-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white">Usuarios</h2>
          <p className="text-xs text-white/40">{users.length} usuarios registrados</p>
        </div>
        <button onClick={() => { setShowCreate(true); resetForm(); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent-green)]/90 hover:bg-[var(--accent-green)] text-white rounded-lg font-medium transition-all text-sm">
          <UserPlus className="w-4 h-4" />
          Nuevo usuario
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5 text-sm text-red-400">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-16 text-white/40 text-sm">Cargando...</div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/5 text-left">
                <th className="px-4 py-3 font-medium text-white/40 border-b border-white/10">Usuario</th>
                <th className="px-4 py-3 font-medium text-white/40 border-b border-white/10">Nombre</th>
                <th className="px-4 py-3 font-medium text-white/40 border-b border-white/10">Rol</th>
                <th className="px-4 py-3 font-medium text-white/40 border-b border-white/10 text-center">Estado</th>
                <th className="px-4 py-3 font-medium text-white/40 border-b border-white/10 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{u.username}</td>
                  <td className="px-4 py-3 text-white/60">{u.nombre || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      u.rol === "ADMIN"
                        ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                        : "bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20"
                    }`}>{u.rol}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      u.activo
                        ? "bg-green-500/10 text-green-400 border border-green-500/20"
                        : "bg-red-500/10 text-red-400 border border-red-500/20"
                    }`}>
                      {u.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => handleEdit(u)}
                        className="p-2 rounded-md bg-white/5 text-white/70 hover:bg-white/10 border border-white/10 transition-all" title="Editar">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleToggleActivo(u)}
                        className={`p-2 rounded-md border transition-all ${
                          u.activo
                            ? "bg-white/5 text-red-400 hover:bg-red-500/20 border-white/10"
                            : "bg-white/5 text-green-400 hover:bg-green-500/20 border-white/10"
                        }`}
                        title={u.activo ? "Inactivar" : "Activar"}>
                        {u.activo ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="bg-[#1a1f2e] rounded-xl border border-white/10 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white">Nuevo usuario</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Usuario *</label>
                <input type="text" value={form.username} onChange={(e) => setForm({...form, username: e.target.value})}
                  placeholder="Nombre de usuario" className={fieldClass} />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Nombre completo</label>
                <input type="text" value={form.nombre} onChange={(e) => setForm({...form, nombre: e.target.value})}
                  placeholder="Nombre y apellido" className={fieldClass} />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Rol</label>
                <select value={form.idRol} onChange={(e) => setForm({...form, idRol: Number(e.target.value)})}
                  className={fieldClass}>
                  {ROLES.map((r) => (
                    <option key={r.id} value={r.id} className="bg-[#1a1f2e]">{r.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Contraseña *</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={form.password}
                    onChange={(e) => setForm({...form, password: e.target.value})}
                    placeholder="Contraseña" className={fieldClass + " pr-10"} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Confirmar contraseña *</label>
                <input type={showPassword ? "text" : "password"} value={form.confirmPassword}
                  onChange={(e) => setForm({...form, confirmPassword: e.target.value})}
                  placeholder="Repetir contraseña" className={fieldClass} />
              </div>
              <button type="submit" disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-50">
                {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <UserPlus className="w-4 h-4" />}
                {saving ? "Creando..." : "Crear usuario"}
              </button>
            </form>
          </div>
        </div>
      )}

      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setEditUser(null)}>
          <div className="bg-[#1a1f2e] rounded-xl border border-white/10 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white">Editar usuario</h3>
              <button onClick={() => setEditUser(null)} className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="px-6 py-5 space-y-4">
              <div className="text-sm text-white/40">Usuario: <span className="text-white font-medium">{editUser.username}</span></div>
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Nombre completo</label>
                <input type="text" value={editUser.nombre || ""}
                  onChange={(e) => setEditUser({...editUser, nombre: e.target.value})}
                  placeholder="Nombre y apellido" className={fieldClass} />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Rol</label>
                <select value={editUser.idRol || 2}
                  onChange={(e) => setEditUser({...editUser, idRol: Number(e.target.value)})}
                  className={fieldClass}>
                  {ROLES.map((r) => (
                    <option key={r.id} value={r.id} className="bg-[#1a1f2e]">{r.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Nueva contraseña (dejar vacío para mantener)</label>
                <input type="password" value={editUser.password || ""}
                  onChange={(e) => setEditUser({...editUser, password: e.target.value})}
                  placeholder="Nueva contraseña" className={fieldClass} />
              </div>
              <button type="submit" disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-50">
                {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Pencil className="w-4 h-4" />}
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
