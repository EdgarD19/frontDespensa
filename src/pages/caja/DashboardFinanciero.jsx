import { Wallet, ArrowUpCircle, ArrowDownCircle, Inbox } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import { CARD, THEAD_ROW, TABLE_SHELL } from "../../components/ui/styles";
import { formatMoney } from "../ventas/registro-venta/utils";
import { getSesion, resumenSesion, getHistorialCierres } from "./mock";

function KpiCard({ icon: Icon, label, value, tone = "" }) {
  return (
    <div className={`${CARD} p-4`}>
      <div className="flex items-center gap-2 text-white/50">
        <Icon className="h-4 w-4" aria-hidden />
        <span className="text-[11px] font-medium uppercase tracking-[0.14em]">{label}</span>
      </div>
      <p className={`mt-2 text-xl font-semibold tabular-nums ${tone || "text-white"}`}>{value}</p>
    </div>
  );
}

// MOCK: pantalla de demostración mientras el back no exponga la API de caja.
export default function DashboardFinanciero() {
  const sesion = getSesion();
  const resumen = resumenSesion();
  // Lectura directa de localStorage: es barata y el historial cambia al cerrar caja.
  const historial = getHistorialCierres();

  const fmtFecha = (iso) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("es-PY");
  };
  const fmtHora = (iso) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("es-PY", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <PageHeader backTo="/caja" title="Dashboard financiero" />

      {sesion && resumen ? (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard icon={Wallet} label="Efectivo esperado" value={formatMoney(resumen.esperado)} />
            <KpiCard icon={Wallet} label="Monto inicial" value={formatMoney(resumen.sesion.montoInicial)} />
            <KpiCard icon={ArrowUpCircle} label="Ingresos del día" value={formatMoney(resumen.ingresos)} tone="text-[var(--accent)]" />
            <KpiCard icon={ArrowDownCircle} label="Egresos del día" value={formatMoney(resumen.egresos)} tone="text-red-400" />
          </div>

          <div className={`${CARD} space-y-1 p-4 text-xs text-white/40`}>
            Caja abierta el {fmtHora(resumen.sesion.fechaApertura)} · {resumen.movimientos.length} movimiento{resumen.movimientos.length === 1 ? "" : "s"} registrado{resumen.movimientos.length === 1 ? "" : "s"}.
          </div>
        </>
      ) : (
        <div className={`${CARD} flex flex-col items-center gap-2 p-8 text-center`}>
          <Inbox className="h-8 w-8 text-white/30" aria-hidden />
          <p className="text-sm text-white/60">No hay caja abierta.</p>
          <p className="text-xs text-white/40">
            Abrí la caja en <span className="text-white/70">Apertura y Cierre</span> para ver el resumen financiero del día.
          </p>
        </div>
      )}

      <div className={TABLE_SHELL}>
        <table className="w-full text-sm">
          <thead>
            <tr className={THEAD_ROW}>
              <th className="px-4 py-3 font-medium">Cierre</th>
              <th className="px-4 py-3 text-right font-medium">Inicial</th>
              <th className="px-4 py-3 text-right font-medium">Ingresos</th>
              <th className="px-4 py-3 text-right font-medium">Egresos</th>
              <th className="px-4 py-3 text-right font-medium">Esperado</th>
              <th className="px-4 py-3 text-right font-medium">Contado</th>
              <th className="px-4 py-3 text-right font-medium">Diferencia</th>
            </tr>
          </thead>
          <tbody>
            {historial.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-white/40">
                  Sin cierres registrados todavía.
                </td>
              </tr>
            ) : (
              historial.map((h, idx) => (
                <tr key={`${h.fechaCierre}-${idx}`} className="border-b border-white/10 last:border-0 transition-colors hover:bg-white/[0.02]">
                  <td className="px-4 py-3 tabular-nums text-white/60">{fmtFecha(h.fecha)} · {fmtHora(h.fechaCierre)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatMoney(h.montoInicial)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-[var(--accent)]">{formatMoney(h.ingresos)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-red-400">{formatMoney(h.egresos)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatMoney(h.esperado)}</td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums text-white">{formatMoney(h.contado)}</td>
                  <td className={`px-4 py-3 text-right font-medium tabular-nums ${h.diferencia === 0 ? "text-white/50" : h.diferencia < 0 ? "text-red-400" : "text-amber-400"}`}>
                    {h.diferencia === 0 ? "—" : formatMoney(h.diferencia)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
