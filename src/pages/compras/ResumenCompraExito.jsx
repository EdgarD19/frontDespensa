import { Check } from "lucide-react";
import { THEAD_ROW, TABLE_SHELL } from "../../components/ui/styles";

const money = (n) => Math.round(Number(n) || 0).toLocaleString("es-PY", { maximumFractionDigits: 0 });

/**
 * Resumen post-registro de una compra — ÚNICO para el módulo:
 * lo muestran "Nueva compra" (compra espontánea) y "Recepción de pedido"
 * después de registrar la factura, con la misma estructura visual.
 *
 * Props:
 *  - titulo / subtitulo  : encabezado (Check verde + textos)
 *  - datos               : [{ label, value }] dl del comprobante (proveedor, n°, pedido…)
 *  - filasIva            : [{ etiqueta, subtotal, iva|null }] — solo las tasas con líneas
 *  - ivaTotal / total    : tfoot de la tabla y total destacado
 *  - children            : botonera de acciones (Nueva compra / Volver a pedidos…)
 */
export default function ResumenCompraExito({
  titulo = "Factura registrada correctamente",
  subtitulo,
  datos = [],
  filasIva = [],
  ivaTotal = 0,
  total = 0,
  children,
}) {
  return (
    <div className="border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-6 sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 shrink-0 bg-[var(--accent)]/10 flex items-center justify-center">
            <Check className="w-7 h-7 text-[var(--accent)]" />
          </div>
          <div>
            <p className="text-xl font-semibold text-white">{titulo}</p>
            {subtitulo && <p className="text-sm text-white/60">{subtitulo}</p>}
          </div>
        </div>

        <div className="flex flex-col items-start gap-1 sm:items-end">
          <div className="flex items-center gap-3">
            <span className="text-base font-medium text-white/70">Total</span>
            <span className="text-3xl font-bold tracking-tight text-[var(--accent)] tabular-nums">
              {money(total)}
            </span>
          </div>
          {children && <div className="mt-2 flex flex-wrap gap-3">{children}</div>}
        </div>
      </div>

      {/* Datos del comprobante */}
      {datos.length > 0 && (
        <dl className="mx-auto mt-6 max-w-2xl grid grid-cols-1 gap-x-6 gap-y-4 border-y border-white/10 py-5 sm:grid-cols-2">
          {datos.map((d) => (
            <div key={d.label}>
              <dt className="text-xs font-medium uppercase tracking-wide text-white/50">{d.label}</dt>
              <dd className="mt-1 text-sm font-medium text-white tabular-nums">{d.value || "—"}</dd>
            </div>
          ))}
        </dl>
      )}

      {/* Liquidación de IVA + Detalle fiscal (dos tablas, formato fiscal) */}
      {(() => {
        // Liquidación: solo tasas con IVA REALMENTE cobrado (si todo es exento,
        // la tabla no aparece en vano).
        const liqRows = filasIva
          .filter((r) => Number(r.iva) > 0)
          .map((r) => ({ etiqueta: `IVA ${r.tasa}%`, valor: r.iva }));
        // Detalle fiscal: SIEMPRE los tres conceptos (Exentas / Gravadas 5% / 10%),
        // con Gs. 0 cuando la compra no tiene de esa tasa.
        const fiscalRows = filasIva.map((r) => ({
          etiqueta: r.tasa === 0 ? "Total Exentas" : `Total Gravadas ${r.tasa}%`,
          valor: r.subtotal,
        }));
        return (
          <div className="mx-auto mt-6 grid max-w-2xl gap-4">
            {liqRows.length > 0 && (
              <div className={TABLE_SHELL}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className={THEAD_ROW}>
                      <th scope="col" className="px-4 py-3 text-left font-medium">Liquidación de IVA</th>
                      <th scope="col" className="px-4 py-3 text-right font-medium">IVA</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums text-white/80">
                    {liqRows.map((r) => (
                      <tr key={r.etiqueta} className="border-b border-white/10 last:border-0 transition hover:bg-white/[0.04]">
                        <td className="px-4 py-3">{r.etiqueta}</td>
                        <td className="px-4 py-3 text-right">{money(r.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-white/10 font-medium tabular-nums text-white">
                      <td className="px-4 py-3">Total IVA</td>
                      <td className="px-4 py-3 text-right">{money(ivaTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {fiscalRows.length > 0 && (
              <div className={TABLE_SHELL}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className={THEAD_ROW}>
                      <th scope="col" className="px-4 py-3 text-left font-medium">Detalle fiscal</th>
                      <th scope="col" className="px-4 py-3 text-right font-medium">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums text-white/80">
                    {fiscalRows.map((r) => (
                      <tr key={r.etiqueta} className="border-b border-white/10 last:border-0 transition hover:bg-white/[0.04]">
                        <td className="px-4 py-3">{r.etiqueta}</td>
                        <td className="px-4 py-3 text-right">{money(r.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-white/10 font-medium tabular-nums text-white">
                      <td className="px-4 py-3">Total</td>
                      <td className="px-4 py-3 text-right">{money(total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
