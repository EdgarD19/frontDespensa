import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { Store, Eye, EyeOff, LogIn } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password.trim()) {
      setError("Completa todos los campos");
      return;
    }
    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate("/", { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.error || "Error al iniciar sesi\u00f3n";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#101419] px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center mb-4">
            <Store className="w-6 h-6 text-[#22c55e]" />
          </div>
          <h1 className="text-xl font-bold text-white">Despensa</h1>
          <p className="text-sm text-white/40 mt-1">Inicia sesion para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5 text-sm text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-white/60 mb-1.5">Usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nombre de usuario"
              autoComplete="username"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder:text-white/30 text-sm outline-none focus:border-[#22c55e]/40 focus:ring-1 focus:ring-[#22c55e]/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-1.5">Contraseña</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                autoComplete="current-password"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 pr-10 text-white placeholder:text-white/30 text-sm outline-none focus:border-[#22c55e]/40 focus:ring-1 focus:ring-[#22c55e]/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            {loading ? "Ingresando..." : "Iniciar sesi\u00f3n"}
          </button>
        </form>
      </div>
    </div>
  );
}
