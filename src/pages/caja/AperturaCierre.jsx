import { useState } from "react";
import { Lock, LockOpen, Wallet, Loader2 } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import { CARD, LABEL, BTN_PRIMARIO, BTN_SECUNDARIO, THEAD_ROW } from "../../components/ui/styles";
import { formatMoney, soloDigitos } from "../ventas/registro-venta/utils";
import {
  getSesion, getUltimaCerrada, resumenSesion, abrirCaja, cerrarCaja,
} from "./mock";

const INPUT =
  "h-11 w-full rounded-none border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50";

// MOCK: pantalla de demostración mientras el back no exponga la API de caja.
export default function AperturaCierre() {
  const sesion = getSesion();
  const ultimaCerrada = getUltimaCerrada();
  const resumen = resumenSesion();

  const [montoInicial, setMontoInicial] = useState("");
  const [mostrarCierre, setMostrarCierre] = useState(false);
  const [montoContado, setMontoContado] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const handleAbrir = async (e) => {
    e.preventDefault();
    const monto = Number(soloDigitos(montoInicial) || 0);
    if (!montoInicial.trim() || !Number.isFinite(monto) || monto < 0) {
      setError("Ingresá el efectivo con el que se abre la caja.");
      return;
    }
    setGuardando(true);
    try {
      abrirCaja(monto);
      setMontoInicial("");
      setError(null);
    } finally {
      setGuardando(false);
    }
  };

  const esperadoDeCierre = (() => {
    const contado = Number(soloDigitos(montoContado) || 0);
    if (montoContado.trim() === "" || !Number.isFinite(contado) || !resumen) return null;
    return contado - resumen.esperado;
  })();

  const handleCerrar = (e) => {
    e.preventDefault();
    if (!resumen) return;
    const contado = Number(soloDigitos(montoContado) || 0);
    if (montoContado.trim() === "" || !Number.isFinite(contado) || contado < 0) {
      setError("Ingresá el efectivo contado al cerrar la caja.");
      return;
    }
    cerrarCaja({ montoContado: contado, observaciones: observaciones.trim() });
    setMontoContado("");
    setObservaciones("");
    setMostrarCierre(false);
    setError(null);
  };

  const fmtHora = (iso) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("es-PY", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <PageHeader backTo="/caja" title="Apertura y cierre de caja" />

      {error && (
        <p className="rounded-none border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-300">{error}</p>
      )}

      {!sesion ? (
        <div className={`${CARD} max-w-md space-y-4 p-5`}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-none border border-[var(--accent)]/15 bg-[var(--accent)]/8 text-[var(--accent)]">
              <LockOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Abrir caja</h2>
              <p className="text-xs text-white/40">Efectivo con el que inicia el día.</p>
            </div>
          </div>
          {ultimaCerrada && (
            <p className="text-xs text-white/40">
              Último cierre: {fmtHora(ultimaCerrada.fechaCierre)} — contado {formatMoney(ultimaCerrada.contado)}
              {ultimaCerrada.diferencia !== 0 && (
                <span className={ultimaCerrada.diferencia < 0 ? "text-red-400" : "text-amber-400"}>
                  {" "}· diferencia {formatMoney(ultimaCerrada.diferencia)}
                </span>
              )}
            </p>
          )}
          <form onSubmit={handleAbrir} className="space-y-4">
            <div>
              <label htmlFor="caja-monto-inicial" className={LABEL}>Monto inicial (Gs.)</label>
              <input
                id="caja-monto-inicial"
                type="text"
                inputMode="numeric"
                value={montoInicial}
                onChange={(e) => setMontoInicial(soloDigitos(e.target.value))}
                placeholder="0"
                autoComplete="off"
                className={`${INPUT} mt-1`}
              />
            </div>
            <button type="submit" disabled={guardando} className={BTN_PRIMARIO}>
              {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
              Abrir caja
            </button>
          </form>
        </div>
      ) : (
        <>
          <div className={`${CARD} space-y-4 p-5`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-none border border-[var(--accent)]/15 bg-[var(--accent)]/8 text-[var(--accent)]">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">Caja abierta</h2>
                  <p className="text-xs text-white/40">Apertura: {fmtHora(sesion.fechaApertura)}</p>
                </div>
              </div>
              {!mostrarCierre && (
                <button type="button" onClick={() => { setMostrarCierre(true); setError(null); }} className={BTN_SECUNDARIO}>
                  Cerrar caja
                </button>
              )}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className={THEAD_ROW}>
                  <th className="px-4 py-2 font-medium">Monto inicial</th>
                  <th className="px-4 py-2 font-medium">Ingresos</th>
                  <th className="px-4 py-2 font-medium">Egresos</th>
                  <th className="px-4 py-2 text-right font-medium">Efectivo esperado</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-white/10 last:border-0">
                  <td className="px-4 py-2 tabular-nums">{formatMoney(resumen.sesion.montoInicial)}</td>
                  <td className="px-4 py-2 tabular-nums text-[var(--accent)]">{formatMoney(resumen.ingresos)}</td>
                  <td className="px-4 py-2 tabular-nums text-red-400">{formatMoney(resumen.egresos)}</td>
                  <td className="px-4 py-2 text-right font-semibold tabular-nums text-white">{formatMoney(resumen.esperado)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {mostrarCierre && (
            <div className={`${CARD} max-w-md space-y-4 p-5`}>
              <h2 className="text-sm font-semibold text-white">Cerrar caja</h2>
              <form onSubmit={handleCerrar} className="space-y-4">
                <div>
                  <label htmlFor="caja-monto-contado" className={LABEL}>Efectivo contado (Gs.)</label>
                  <input
                    id="caja-monto-contado"
                    type="text"
                    inputMode="numeric"
                    value={montoContado}
                    onChange={(e) => setMontoContado(soloDigitos(e.target.value))}
                    placeholder="0"
                    autoFocus
                    autoComplete="off"
                    className={`${INPUT} mt-1`}
                  />
                  {esperadoDeCierre !== null && (
                    <p className={`mt-1 text-xs ${esperadoDeCierre === 0 ? "text-white/40" : esperadoDeCierre < 0 ? "text-red-400" : "text-amber-400"}`}>
                      {esperadoDeCierre === 0
                        ? "Coincide con lo esperado."
                        : `${esperadoDeCierre < 0 ? "Faltan" : "Sobran"} ${formatMoney(Math.abs(esperadoDeCierre))} respecto a lo esperado.`}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="caja-obs-cierre" className={LABEL}>Observaciones (opcional)</label>
                  <input
                    id="caja-obs-cierre"
                    type="text"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    maxLength={200}
                    placeholder="Ej: faltante justificado con vuelto entregado"
                    className={`${INPUT} mt-1`}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button type="submit" className={BTN_PRIMARIO}>
                    <Lock className="h-4 w-4" />
                    Confirmar cierre
                  </button>
                  <button type="button" onClick={() => setMostrarCierre(false)} className={BTN_SECUNDARIO}>
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
}
