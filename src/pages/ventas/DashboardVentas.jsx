import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, AlertTriangle, TrendingUp, PackageOpen, BarChart3, RefreshCw,
} from "lucide-react";
import { getProductos, getProductosStockBajo } from "../../api/productosApi";
import { getProductosMasVendidos } from "../../api/reportesVentasApi";
import { getFacturasVenta } from "../../api/facturasVentaApi";
import { apiErrorMessage } from "../../api/errors";

const MINIMO_GLOBAL = 10;
// Rango "todo el histórico" para el reporte de más vendidos
const DESDE_TODO = "2000-01-01";

const CARD = "rounded-none border border-white/10 bg-white/[0.02]";
const MONO = { fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" };
const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

function fmtMoneda(n) {
  return new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", minimumFractionDigits: 0 }).format(n ?? 0);
}

function fmtNumero(n) {
  return new Intl.NumberFormat("es-PY", { maximumFractionDigits: 2 }).format(n ?? 0);
}

const unidad = (p) => (p.unidadMedida === "Kilogramo" ? "kg" : "u.");
// Dado el NOMBRE de la unidad de medida del back ("Kilogramo", "Unidad"…), devuelve la abreviatura.
const unidadDe = (nombre) =>
  /kilo/i.test(String(nombre ?? "")) ? "kg" : "u.";

/* ───────── Piezas de UI ───────── */

function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-white/[0.06] ${className}`} />;
}

function SectionHeader({ icon: Icon, iconClass, title, hint }) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-5 py-3.5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
        <Icon className={`h-4 w-4 ${iconClass}`} aria-hidden="true" />
        {title}
      </h2>
      <span className="text-xs text-white/45">{hint}</span>
    </div>
  );
}

function EmptyState({ icon: Icon, title, text }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <Icon className="h-8 w-8 text-white/15" aria-hidden="true" />
      <p className="text-sm font-medium text-white/70">{title}</p>
      <p className="max-w-xs text-xs text-white/40">{text}</p>
    </div>
  );
}

function Kpi({ label, value, tone = "text-white", sub }) {
  return (
    <div className="px-5 py-4">
      <p className="text-xs text-white/50">{label}</p>
      <p className={`mt-1.5 truncate text-xl font-semibold tracking-tight sm:text-2xl ${tone}`} style={MONO}>
        {value}
      </p>
      {sub && <p className="mt-0.5 truncate text-xs text-white/35">{sub}</p>}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando dashboard…</span>
      <div className={`${CARD} grid grid-cols-2 divide-white/10 lg:grid-cols-4 lg:divide-x`}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-3 px-5 py-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-28" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className={`${CARD} space-y-5 p-5`}>
            <Skeleton className="h-4 w-32" />
            {[0, 1, 2, 3, 4].map((j) => (
              <div key={j} className="space-y-2">
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-1.5 w-full" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────── Página ───────── */

export default function DashboardVentas() {
  const [stockBajo, setStockBajo] = useState(null);
  const [masVendidos, setMasVendidos] = useState(null); // [{ id, nombre, unidades, importe }]
  const [resumen, setResumen] = useState({ tickets: 0, importe: 0 });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const hoy = (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      })();

      const [resBajo, resVentas, resRank, resProd] = await Promise.all([
        // El back compara contra COALESCE(stock_minimo, minimo) — mínimo por producto
        getProductosStockBajo({ minimo: MINIMO_GLOBAL, pageSize: 50, sortDir: "asc" }),
        // Facturas solo para los KPIs (total vendido / ticket promedio)
        getFacturasVenta({ page: 0, pageSize: 500, sortDir: "DESC" }),
        // Ranking oficial del back (excluye anuladas)
        getProductosMasVendidos({ desde: DESDE_TODO, hasta: hoy, top: 8 }),
        // Catálogo para saber la unidad de cada producto (kg/u.)
        getProductos({ page: 0, pageSize: 500, sortDir: "asc" }),
      ]);

      const bajos = (Array.isArray(resBajo.content) ? resBajo.content : [])
        .filter((p) => p.activo !== false)
        .map((p) => ({
          ...p,
          umbral: Number(p.stockMinimo) > 0 ? Number(p.stockMinimo) : MINIMO_GLOBAL,
        }));
      setStockBajo(bajos);

      // Unidad por producto (de la respuesta del ranking aún no viene): del catálogo
      const unidadPorId = new Map(
        (Array.isArray(resProd.content) ? resProd.content : []).map((p) => [p.id, unidadDe(p.unidadMedida)]),
      );

      setMasVendidos(resRank.map((r) => ({
        id: r.idProducto,
        nombre: r.nombreProducto,
        unidades: Number(r.unidadesVendidas) || 0,
        importe: Number(r.importeTotal) || 0,
        unidad: unidadPorId.get(r.idProducto) || "u.",
      })));

      // KPIs (total vendido / cantidad de ventas)
      let tickets = 0;
      let importeTotal = 0;
      for (const f of Array.isArray(resVentas.content) ? resVentas.content : []) {
        if (String(f.estado || "").toUpperCase() === "ANULADA") continue;
        tickets += 1;
        for (const d of Array.isArray(f.detalles) ? f.detalles : []) {
          importeTotal += (Number(d.cantidad) || 0) * (Number(d.precioUnitario) || 0);
        }
      }
      setResumen({ tickets, importe: importeTotal });
    } catch (e) {
      setError(apiErrorMessage(e) || "No se pudo cargar el dashboard.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const agotados = useMemo(
    () => (stockBajo ?? []).filter((p) => (Number(p.stockActual) || 0) <= 0).length,
    [stockBajo],
  );
  const ticketPromedio = resumen.tickets > 0 ? resumen.importe / resumen.tickets : 0;
  const hayDatos = !cargando && !error;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      {/* ── Encabezado ── */}
      <div className="flex items-center gap-3">
        <Link
          to="/ventas"
          aria-label="Volver a ventas"
          className={`rounded-none p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white ${FOCUS}`}
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Dashboard</h1>
          <p className="text-sm text-white/45">Qué reponer y qué se vende más.</p>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div
          role="alert"
          className={`${CARD} flex flex-wrap items-center gap-3 border-red-500/30 bg-red-500/[0.06] p-3 text-sm text-red-300`}
        >
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1">{error}</span>
          <button
            type="button"
            onClick={cargar}
            className={`rounded-none border border-red-400/40 px-3 py-1 text-xs font-medium text-red-200 transition-colors hover:bg-red-500/20 ${FOCUS}`}
          >
            Reintentar
          </button>
        </div>
      )}

      {cargando && <DashboardSkeleton />}

      {hayDatos && (
        <>
          {/* ── Resumen: una sola franja, no cuatro tarjetas ── */}
          <section
            aria-label="Resumen de ventas"
            className={`${CARD} grid grid-cols-2 divide-white/10 max-lg:divide-y lg:grid-cols-4 lg:divide-x`}
          >
            <Kpi label="Total vendido" value={fmtMoneda(resumen.importe)} sub={`${resumen.tickets} ventas`} />
            <Kpi label="Ticket promedio" value={fmtMoneda(Math.round(ticketPromedio))} />
            <Kpi
              label="Para reponer"
              value={stockBajo?.length ?? 0}
              tone={(stockBajo?.length ?? 0) > 0 ? "text-white" : "text-white/50"}
              sub="productos en o bajo su mínimo"
            />
            <Kpi
              label="Agotados"
              value={agotados}
              tone={agotados > 0 ? "text-red-300" : "text-white"}
              sub={agotados > 0 ? "sin stock" : "ninguno"}
            />
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* ── Stock mínimo ── */}
            <section className={`${CARD} flex flex-col`} aria-labelledby="h-stock">
              <SectionHeader
                icon={AlertTriangle}
                iconClass="text-white/40"
                title={<span id="h-stock">Stock bajo</span>}
                hint={`${stockBajo?.length ?? 0} producto(s)`}
              />

              {(stockBajo?.length ?? 0) === 0 ? (
                <EmptyState
                  icon={PackageOpen}
                  title="Todo el stock está al día"
                  text="Ningún producto llegó a su stock mínimo."
                />
              ) : (
                <ul className="max-h-[28rem] divide-y divide-white/10 overflow-y-auto">
                  {stockBajo.map((p) => {
                    const stock = Number(p.stockActual) || 0;
                    const critico = stock <= 0;
                    return (
                      <li key={p.id} className="px-5 py-3 transition-colors hover:bg-white/[0.03]">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm text-white/85">{p.nombre}</p>
                            <p className="truncate text-xs text-white/35">{p.codigoBarras || `#${p.id}`}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p
                              className={`inline-flex items-center gap-1 text-sm font-semibold ${critico ? "text-red-300" : "text-white"}`}
                              style={MONO}
                            >
                              {critico && <AlertTriangle className="h-3 w-3" aria-hidden="true" />}
                              {critico ? "Agotado" : `${fmtNumero(stock)} ${unidad(p)}`}
                            </p>
                            <p className="text-[11px] text-white/35" style={MONO}>
                              mínimo {fmtNumero(p.umbral)}
                            </p>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* ── Más vendidos ── */}
            <section className={`${CARD} flex flex-col`} aria-labelledby="h-top">
              <SectionHeader
                icon={TrendingUp}
                iconClass="text-white/40"
                title={<span id="h-top">Más vendidos</span>}
                hint="por unidades"
              />

              {(masVendidos?.length ?? 0) === 0 ? (
                <EmptyState
                  icon={BarChart3}
                  title="Todavía no hay ventas"
                  text="Cuando registres ventas, acá vas a ver los productos que más salen."
                />
              ) : (
                <ol className="flex-1 divide-y divide-white/10">
                  {masVendidos.map((p, i) => {
                    const primero = i === 0;
                    return (
                      <li key={p.id} className="px-5 py-3">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="flex min-w-0 items-baseline gap-2 text-sm">
                            <span
                              className={`w-4 shrink-0 text-xs ${primero ? "font-semibold text-white" : "text-white/35"}`}
                              style={MONO}
                            >
                              {i + 1}
                            </span>
                            <span className={`truncate ${primero ? "font-medium text-white" : "text-white/80"}`}>
                              {p.nombre}
                            </span>
                          </p>
                          <p className="shrink-0 text-sm text-white" style={MONO}>
                            {fmtNumero(p.unidades)} <span className="font-normal text-white/45">{p.unidad}</span>
                            {" · "}
                            <span className="font-medium">{fmtMoneda(p.importe)}</span>
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
