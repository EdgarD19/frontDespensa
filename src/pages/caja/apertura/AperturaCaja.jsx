import { useState, useEffect } from "react";
import { Lock, Unlock, DollarSign, TrendingUp, TrendingDown, AlertCircle, Check } from "lucide-react";
import { abrirCaja, cerrarCaja, getCajaActual } from "../../../api/cajaApi";
import { apiErrorMessage } from "../../../api/errors";

export default function AperturaCaja() {
  const [caja, setCaja] = useState(null);
  const [loading, setLoading] = useState(true);
  const [montoInicial, setMontoInicial] = useState("");
  const [accionando, setAccionando] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCajaActual();
      setCaja(data);
    } catch {
      setCaja(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAbrir = async () => {
    setError(null);
    setAccionando(true);
    try {
      const monto = parseFloat(montoInicial.replace(",", "."));
      const data = await abrirCaja(Number.isFinite(monto) && monto > 0 ? monto : 0);
      setCaja(data);
      setExito("Caja abierta correctamente");
      setMontoInicial("");
    } catch (err) {
      setError(apiErrorMessage(err) || "Error al abrir caja");
    } finally {
      setAccionando(false);
    }
  };

  const handleCerrar = async () => {
    if (!window.confirm("¿Estás seguro de cerrar la caja?")) return;
    setError(null);
    setAccionando(true);
    try {
      const data = await cerrarCaja();
      setCaja(data);
      setExito("Caja cerrada correctamente");
    } catch (err) {
      setError(apiErrorMessage(err) || "Error al cerrar caja");
    } finally {
      setAccionando(false);
    }
  };

  const format = (n) => {
    if (n == null) return "$0.00";
    return "$" + Number(n).toLocaleString("es-PY", { minimumFractionDigits: 2 });
  };

  const formatFecha = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("es-PY");
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="space-y-4 animate-pulse">
          <div className="h-8 w-48 bg-white/5 rounded" />
          <div className="h-4 w-64 bg-white/5 rounded" />
          <div className="h-48 rounded-xl border border-[#1e1e24] bg-[#111114]" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-[#f1f1f3] tracking-tight">Apertura y Cierre de Caja</h1>
        <p className="text-sm text-[#5a5a6e]">Gestioná el estado de la caja diaria</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {exito && (
        <div className="flex items-center gap-2 rounded-lg border border-[#22c55e]/30 bg-[#22c55e]/10 px-4 py-3 text-sm text-green-300">
          <Check className="w-4 h-4 flex-shrink-0" />
          {exito}
        </div>
      )}

      {caja && caja.estado === "ABIERTA" ? (
        <div className="rounded-xl border border-[#1e1e24] bg-[#111114] overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-[#1e1e24] bg-[#22c55e]/5">
            <Unlock className="w-4 h-4 text-[#22c55e]" />
            <span className="text-sm font-semibold text-[#22c55e]">Caja abierta</span>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-[#5a5a6e]">Apertura</span>
                <p className="text-white font-medium">{formatFecha(caja.fechaApertura)}</p>
              </div>
              <div>
                <span className="text-[#5a5a6e]">Monto inicial</span>
                <p className="text-white font-medium">{format(caja.montoInicial)}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-[#22c55e]/5 border border-[#22c55e]/10 p-3 text-center">
                <TrendingUp className="w-4 h-4 mx-auto text-[#22c55e] mb-1" />
                <p className="text-xs text-[#5a5a6e]">Ingresos</p>
                <p className="text-sm font-bold text-white">{format(caja.totalIngresos)}</p>
              </div>
              <div className="rounded-lg bg-red-500/5 border border-red-500/10 p-3 text-center">
                <TrendingDown className="w-4 h-4 mx-auto text-red-400 mb-1" />
                <p className="text-xs text-[#5a5a6e]">Egresos</p>
                <p className="text-sm font-bold text-white">{format(caja.totalEgresos)}</p>
              </div>
              <div className="rounded-lg bg-blue-500/5 border border-blue-500/10 p-3 text-center">
                <DollarSign className="w-4 h-4 mx-auto text-blue-400 mb-1" />
                <p className="text-xs text-[#5a5a6e]">Saldo</p>
                <p className="text-sm font-bold text-white">
                  {format((caja.montoInicial || 0) + (caja.totalIngresos || 0) - (caja.totalEgresos || 0))}
                </p>
              </div>
            </div>
            <button onClick={handleCerrar} disabled={accionando}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/80 hover:bg-red-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors">
              <Lock className="w-4 h-4" />
              {accionando ? "Cerrando..." : "Cerrar Caja"}
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-[#1e1e24] bg-[#111114] overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-[#1e1e24] bg-red-500/5">
            <Lock className="w-4 h-4 text-red-400" />
            <span className="text-sm font-semibold text-red-400">Caja cerrada</span>
          </div>
          <div className="p-5 space-y-4">
            {caja && caja.estado === "CERRADA" && (
              <div className="text-sm text-white/60 bg-white/5 rounded-lg p-3 space-y-1">
                <p><span className="text-[#5a5a6e]">Cerrada el:</span> {formatFecha(caja.fechaCierre)}</p>
                <p><span className="text-[#5a5a6e]">Monto final:</span> {format(caja.montoFinal)}</p>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-[#5a5a6e] mb-1.5 uppercase tracking-wider">Monto inicial</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3a3a4a]" />
                <input value={montoInicial} onChange={(e) => setMontoInicial(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#22c55e]/50" />
              </div>
            </div>
            <button onClick={handleAbrir} disabled={accionando}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#22c55e] hover:bg-green-400 disabled:opacity-50 text-black font-medium rounded-lg transition-colors">
              <Unlock className="w-4 h-4" />
              {accionando ? "Abriendo..." : "Abrir Caja"}
            </button>
          </div>
        </div>
      )}

      {caja && caja.estado === "CERRADA" && (
        <div className="text-center">
          <button onClick={() => { setExito(null); setCaja(null); }}
            className="text-sm text-[#22c55e] hover:underline">
            Abrir nueva caja
          </button>
        </div>
      )}
    </div>
  );
}
