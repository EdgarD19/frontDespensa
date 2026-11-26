import { useMemo, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Loader2 } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import {
  CARD, LABEL, BTN_PRIMARIO, BTN_PELIGROSO, THEAD_ROW, TABLE_SHELL,
} from "../../components/ui/styles";
import { formatMoney, soloDigitos } from "../ventas/registro-venta/utils";
import {
  getSesion, resumenSesion, agregarMovimiento,
} from "./mock";

const INPUT =
  "h-11 w-full rounded-none border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50";

function TipoBadge({ tipo }) {
  const ingreso = tipo === "INGRESO";
  const s = ingreso
    ? "bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20"
    : "bg-red-500/10 text-red-400 border-red-500/20";
  const Icon = ingreso ? ArrowUpCircle : ArrowDownCircle;
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${s}`}>
      <Icon className="h-3 w-3" aria-hidden />
      {ingreso ? "Ingreso" : "Egreso"}
    </span>
  );
}

// MOCK: pantalla de demostración mientras el back no exponga la API de caja.
export default function IngresosEgresos() {
  const sesion = getSesion();
  const resumen = resumenSesion();

  const [tipo, setTipo] = useState("INGRESO");
  const [motivo, setMotivo] = useState("");
  const [monto, setMonto] = useState("");
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const movimientos = useMemo(() => resumen?.movimientos ?? [], [resumen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!sesion) {
      setError("Abrí la caja para registrar movimientos.");
      return;
    }
    const valor = Number(soloDigitos(monto) || 0);
    if (!motivo.trim()) {
      setError("Ingresá el motivo del movimiento.");
      return;
    }
    if (monto.trim() === "" || !Number.isFinite(valor) || valor <= 0) {
      setError("Ingresá un monto mayor a cero.");
      return;
    }
    setGuardando(true);
    try {
      agregarMovimiento({ tipo, motivo, monto: valor });
      setMotivo("");
      setMonto("");
      setError(null);
    } finally {
      setGuardando(false);
    }
  };

  const fmtHora = (iso) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("es-PY", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <PageHeader backTo="/caja" title="Ingresos y egresos de caja" />

      {error && (
        <p className="rounded-none border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-300">{error}</p>
      )}

      <div className={`${CARD} space-y-4 p-5`}>
        <h2 className="text-sm font-semibold text-white">Nuevo movimiento</h2>
        {!sesion ? (
          <p className="text-sm text-white/40">
            La caja está cerrada. Abrila en <span className="text-white/70">Apertura y Cierre</span> para registrar ingresos y egresos.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 lg:flex-row lg:items-end">
            {/* Tipo: segmented control */}
            <div className="lg:w-52">
              <span className={LABEL}>Tipo</span>
              <div className="mt-1 grid grid-cols-2">
                {["INGRESO", "EGRESO"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTipo(t)}
                    aria-pressed={tipo === t}
                    className={`rounded-none border px-3 py-2.5 text-sm transition-colors ${
                      tipo === t
                        ? t === "INGRESO"
                          ? "border-[var(--accent)] bg-[var(--accent)]/10 font-medium text-[var(--accent)]"
                          : "border-red-500/60 bg-red-500/10 font-medium text-red-400"
                        : "border-white/10 bg-white/[0.03] text-white/50 hover:text-white"
                    }`}
                  >
                    {t === "INGRESO" ? "Ingreso" : "Egreso"}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1">
              <label htmlFor="caja-motivo" className={LABEL}>Motivo</label>
              <input
                id="caja-motivo"
                type="text"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                maxLength={200}
                placeholder={tipo === "INGRESO" ? "Ej: vuelto ingresado a caja" : "Ej: pago de envío, retiro para gastos"}
                disabled={!sesion}
                className={`${INPUT} mt-1`}
              />
            </div>
            <div className="lg:w-44">
              <label htmlFor="caja-monto" className={LABEL}>Monto (Gs.)</label>
              <input
                id="caja-monto"
                type="text"
                inputMode="numeric"
                value={monto}
                onChange={(e) => setMonto(soloDigitos(e.target.value))}
                placeholder="0"
                disabled={!sesion}
                autoComplete="off"
                className={`${INPUT} mt-1`}
              />
            </div>
            <button
              type="submit"
              disabled={guardando || !sesion}
              className={tipo === "INGRESO" ? BTN_PRIMARIO : BTN_PELIGROSO}
            >
              {guardando
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : tipo === "INGRESO" ? <ArrowUpCircle className="h-4 w-4" /> : <ArrowDownCircle className="h-4 w-4" />}
              Registrar
            </button>
          </form>
        )}
      </div>

      <div className={TABLE_SHELL}>
        <table className="w-full text-sm">
          <thead>
            <tr className={THEAD_ROW}>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Motivo</th>
              <th className="px-4 py-3 text-right font-medium">Monto</th>
            </tr>
          </thead>
          <tbody>
            {movimientos.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-white/40">
                  {sesion ? "Sin movimientos en el día de hoy." : "La caja está cerrada: no hay movimientos que mostrar."}
                </td>
              </tr>
            ) : (
              movimientos.map((m) => (
                <tr key={m.id} className="border-b border-white/10 last:border-0 transition-colors hover:bg-white/[0.02]">
                  <td className="px-4 py-3 tabular-nums text-white/60">{fmtHora(m.fechaCreacion)}</td>
                  <td className="px-4 py-3"><TipoBadge tipo={m.tipo} /></td>
                  <td className="px-4 py-3 text-white">{m.motivo}</td>
                  <td className={`px-4 py-3 text-right font-medium tabular-nums ${m.tipo === "INGRESO" ? "text-[var(--accent)]" : "text-red-400"}`}>
                    {m.tipo === "INGRESO" ? "+" : "−"} {formatMoney(m.monto)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {movimientos.length > 0 && (
            <tfoot>
              <tr className="border-t border-white/10 bg-white/[0.03]">
                <td colSpan={3} className="px-4 py-3 text-xs uppercase tracking-wider text-white/50">Efectivo esperado en caja</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums text-white">{formatMoney(resumen.esperado)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
