import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, AlertTriangle, TrendingUp, Loader2, PackageOpen, BarChart3,
} from "lucide-react";
import { getProductos } from "../../api/productosApi";
import { getStockMinimoMap } from "../../api/stockMinimoApi";
import { getFacturasVenta } from "../../api/facturasVentaApi";
import { apiErrorMessage } from "../../api/errors";

const MINIMO_GLOBAL = 10;

const CARD = "rounded-none border border-white/10 bg-white/[0.02]";
const LABEL = "text-[11px] font-medium uppercase tracking-[0.14em] text-white/50";
const MONO = { fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" };

function fmtMoneda(n) {
  return new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", minimumFractionDigits: 0 }).format(n ?? 0);
}

export default function DashboardVentas() {
  const [stockBajo, setStockBajo] = useState(null);
  const [masVendidos, setMasVendidos] = useState(null); // [{ id, nombre, unidades, importe }]
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [resProd, resVentas] = await Promise.all([
        getProductos({ page: 0, pageSize: 500, sortDir: "asc" }),
        getFacturasVenta({ page: 0, pageSize: 500, sortDir: "DESC" }),
      ]);

      // Stock bajo calculado en el front: umbral por producto (localStorage,
      // campo "Stock mínimo" del ABM) con default global de 10.
      const minimos = getStockMinimoMap();
      const bajos = (Array.isArray(resProd.content) ? resProd.content : [])
        .filter((p) => p.activo !== false)
        .filter((p) => {
          const stock = Number(p.stockActual) || 0;
          const umbral = Number(minimos[String(p.id)]);
          return stock <= (Number.isFinite(umbral) && umbral >= 0 ? umbral : MINIMO_GLOBAL);
        })
        .map((p) => {
          const umbral = Number(minimos[String(p.id)]);
          return {
            ...p,
            umbral: Number.isFinite(umbral) && umbral >= 0 ? umbral : MINIMO_GLOBAL,
          };
        })
        .sort((a, b) => (Number(a.stockActual) || 0) - (Number(b.stockActual) || 0));
      setStockBajo(bajos);

      // Top de más vendidos: el back no tiene endpoint de reporte, así que se
      // agregan los detalles de las facturas de venta del lado del front.
      const ventas = Array.isArray(resVentas.content) ? resVentas.content : [];
      const porProducto = new Map();
      for (const f of ventas) {
        if (String(f.estado || "").toUpperCase() === "ANULADA") continue;
        for (const d of Array.isArray(f.detalles) ? f.detalles : []) {
          const key = d.idProducto;
          const prev = porProducto.get(key) || { id: key, nombre: d.nombreProducto || `Producto #${key}`, unidades: 0, importe: 0 };
          prev.unidades += Number(d.cantidad) || 0;
          prev.importe += (Number(d.cantidad) || 0) * (Number(d.precioUnitario) || 0);
          porProducto.set(key, prev);
        }
      }
      setMasVendidos([...porProducto.values()].sort((a, b) => b.unidades - a.unidades).slice(0, 8));
    } catch (e) {
      setError(apiErrorMessage(e) || "No se pudo cargar el dashboard.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const maxUnidades = masVendidos?.[0]?.unidades || 1;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/ventas" aria-label="Volver"
          className="rounded-none p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white">
          <ArrowLeft size={18} />
        </Link>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-white tracking-tight">Dashboard</h1>
          <p className="text-sm text-white/40">Alertas de stock y productos más vendidos.</p>
        </div>
      </div>

      {error && (
        <div className={`${CARD} flex items-center gap-2 border-red-500/30 bg-red-500/[0.06] p-3 text-sm text-red-400`}>
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}

      {cargando ? (
        <div className={`${CARD} flex items-center justify-center gap-2 px-6 py-20 text-sm text-white/50`}>
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando dashboard…
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* ── Alerta de stock mínimo ── */}
          <section className={`${CARD} flex flex-col`}>
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
                <AlertTriangle className={`h-4 w-4 ${(stockBajo?.length ?? 0) > 0 ? "text-amber-400" : "text-white/40"}`} />
                Stock mínimo
              </h2>
              <span className={`${LABEL}`}>{stockBajo?.length ?? 0} producto(s)</span>
            </div>

            {(stockBajo?.length ?? 0) === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-14 text-center">
                <PackageOpen className="h-8 w-8 text-white/15" />
                <p className="text-sm text-white/50">Ningún producto por debajo de su stock mínimo.</p>
              </div>
            ) : (
              <div className="overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-emerald-500/10 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
                      <th className="px-4 py-3 font-medium">Producto</th>
                      <th className="px-4 py-3 text-right font-medium">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockBajo.map((p) => {
                      const critico = Number(p.stockActual) <= 0;
                      return (
                        <tr key={p.id} className="border-b border-white/10 last:border-0 transition hover:bg-white/[0.04]">
                          <td className="max-w-0 px-4 py-3">
                            <span className="block truncate text-white/80">{p.nombre}</span>
                            <span className="block truncate text-xs text-white/40">{p.codigoBarras || `#${p.id}`}</span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-none border px-2 py-0.5 text-xs font-semibold ${critico ? "border-red-500/40 bg-red-500/10 text-red-300" : "border-amber-400/30 bg-amber-400/10 text-amber-300"}`}
                              style={MONO}
                            >
                              {critico && <AlertTriangle className="h-3 w-3" />}
                              {p.stockActual} {p.unidadMedida === "Kilogramo" ? "kg" : "u."}
                            </span>
                            <span className="ml-2 text-[10px] text-white/35" style={MONO}>
                              mín {p.umbral}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ── Productos más vendidos ── */}
          <section className={`${CARD} flex flex-col`}>
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
                <TrendingUp className="h-4 w-4 text-[var(--accent)]" />
                Más vendidos
              </h2>
              <span className={`${LABEL}`}>{masVendidos?.length ?? 0} producto(s)</span>
            </div>

            {(masVendidos?.length ?? 0) === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-14 text-center">
                <BarChart3 className="h-8 w-8 text-white/15" />
                <p className="text-sm text-white/50">Todavía no hay ventas registradas.</p>
              </div>
            ) : (
              <div className="flex-1 space-y-3 px-5 py-4">
                {masVendidos.map((p, i) => (
                  <div key={p.id} className="space-y-1">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate text-white/80">
                        <span className="mr-1.5 tabular-nums text-white/40" style={MONO}>{i + 1}.</span>
                        {p.nombre}
                      </span>
                      <span className="shrink-0 tabular-nums text-white/60" style={MONO}>
                        {p.unidades} u. · {fmtMoneda(p.importe)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-[var(--accent)]"
                        style={{ width: `${Math.max(4, Math.round((p.unidades / maxUnidades) * 100))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
