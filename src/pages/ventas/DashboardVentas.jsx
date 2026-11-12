import { useEffect, useMemo, useState } from "react";
import { CARD } from "../../components/ui/styles";
import { Link } from "react-router-dom";
import {
  AlertTriangle, TrendingUp, PackageOpen, BarChart3, RefreshCw, SearchX,
} from "lucide-react";
import { getProductosStockBajo, getCatalogoLigero } from "../../api/productosApi";
import { getProductosMasVendidos } from "../../api/reportesVentasApi";
import { apiErrorMessage } from "../../api/errors";
import PageHeader from "../../components/ui/PageHeader";
import SearchField from "../../components/ui/SearchField";

const MINIMO_GLOBAL = 10;
// Rango "todo el histórico" para el reporte de más vendidos
const DESDE_TODO = "2000-01-01";

const MONO = { fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" };
const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

/* Períodos del ranking de más vendidos. `diasAtras` es cuántos días hacia
   atrás incluye el rango (0 = solo hoy, null = todo el histórico). */
const RANGOS = [
  { id: "hoy", label: "Hoy", diasAtras: 0 },
  { id: "7d", label: "7 días", diasAtras: 6 },
  { id: "30d", label: "30 días", diasAtras: 29 },
  { id: "todo", label: "Todo", diasAtras: null },
];
const RANGO_INICIAL = "30d";

function fechaISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function desdeDeRango(id) {
  const r = RANGOS.find((x) => x.id === id) ?? RANGOS[2];
  if (r.diasAtras === null) return DESDE_TODO;
  const d = new Date();
  d.setDate(d.getDate() - r.diasAtras);
  return fechaISO(d);
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
      <div className={`${CARD} grid grid-cols-2 divide-x divide-white/10`}>
        {[0, 1].map((i) => (
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
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [rango, setRango] = useState(RANGO_INICIAL);
  const [reintento, setReintento] = useState(0);
  // Buscadores independientes por sección (filtran solo por nombre).
  const [busquedaBajo, setBusquedaBajo] = useState("");
  const [busquedaVendidos, setBusquedaVendidos] = useState("");
  // Atajo de reposición: ver únicamente lo que no tiene stock.
  const [soloAgotados, setSoloAgotados] = useState(false);

  // Cambiar de período vuelve a pedir el ranking, pero no vacía la pantalla:
  // los datos previos quedan visibles mientras llega la respuesta.
  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError(null);

    (async () => {
      try {
        const [resBajo, resRank, resProd] = await Promise.all([
          // El back compara contra COALESCE(stock_minimo, minimo) — mínimo por producto
          getProductosStockBajo({ minimo: MINIMO_GLOBAL, pageSize: 50, sortDir: "asc" }),
          // Ranking oficial del back (excluye anuladas), acotado al período elegido.
          getProductosMasVendidos({ desde: desdeDeRango(rango), hasta: fechaISO(new Date()), top: 8 }),
          // Catálogo solo para la unidad de cada producto (kg/u.) — versión
          // ligera con cache de módulo (no espera mapas completos cada visita).
          getCatalogoLigero(),
        ]);
        if (!vigente) return;

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
      } catch (e) {
        if (!vigente) return;
        setError(apiErrorMessage(e) || "No se pudo cargar el dashboard.");
      } finally {
        if (vigente) setCargando(false);
      }
    })();

    return () => { vigente = false; };
  }, [rango, reintento]);

  const agotados = useMemo(
    () => (stockBajo ?? []).filter((p) => (Number(p.stockActual) || 0) <= 0).length,
    [stockBajo],
  );
  const hayDatos = stockBajo !== null || masVendidos !== null;
  const etiquetaRango = RANGOS.find((r) => r.id === rango)?.label ?? "";

  /* ── Filtro de los buscadores: solo por nombre, sin distinguir
        mayúsculas ni acentos. Cada sección tiene el suyo. ── */
  const normalizar = (s) =>
    String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const filtroBajo = useMemo(() => normalizar(busquedaBajo).trim(), [busquedaBajo]);
  const stockBajoFiltrado = useMemo(() => {
    let lista = stockBajo ?? [];
    if (soloAgotados) lista = lista.filter((p) => (Number(p.stockActual) || 0) <= 0);
    if (!filtroBajo) return lista;
    return lista.filter((p) => normalizar(p.nombre).includes(filtroBajo));
  }, [stockBajo, filtroBajo, soloAgotados]);

  const filtroVendidos = useMemo(() => normalizar(busquedaVendidos).trim(), [busquedaVendidos]);
  const masVendidosFiltrado = useMemo(() => {
    if (!filtroVendidos) return masVendidos ?? [];
    return (masVendidos ?? []).filter((p) => normalizar(p.nombre).includes(filtroVendidos));
  }, [masVendidos, filtroVendidos]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      {/* ── Encabezado ── */}
      <PageHeader
        backTo="/ventas"
        backLabel="Volver a ventas"
        title="Dashboard"
        subtitle="Qué reponer y qué se vende más."
      />

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
            onClick={() => setReintento((n) => n + 1)}
            className={`rounded-none border border-red-400/40 px-3 py-1 text-xs font-medium text-red-200 transition-colors hover:bg-red-500/20 ${FOCUS}`}
          >
            Reintentar
          </button>
        </div>
      )}

      {cargando && !hayDatos && <DashboardSkeleton />}

      {hayDatos && (
        <>
          {/* ── Resumen de stock: una sola franja con lo accionable ── */}
          <section
            aria-label="Resumen de stock"
            className={`${CARD} grid grid-cols-2 divide-x divide-white/10`}
          >
            <Kpi
              label="Para reponer"
              value={stockBajo?.length ?? 0}
              tone={(stockBajo?.length ?? 0) > 0 ? "text-orange-300" : "text-white/50"}
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
            {/* ── Stock bajo (sección coherente con "Stock de alerta" del ABM) ── */}
            <section className={`${CARD} flex flex-col`} aria-labelledby="h-stock">
              <SectionHeader
                icon={AlertTriangle}
                iconClass="text-orange-400"
                title={<span id="h-stock">Stock bajo</span>}
                hint={`${stockBajoFiltrado.length} producto(s)`}
              />

              <div className="flex items-center gap-2 px-4 pt-3">
                <SearchField
                  value={busquedaBajo}
                  onChange={setBusquedaBajo}
                  placeholder="Buscar por nombre…"
                  ariaLabel="Buscar producto en stock bajo"
                  className="h-9"
                />
                <button
                  type="button"
                  aria-pressed={soloAgotados}
                  onClick={() => setSoloAgotados((v) => !v)}
                  className={`h-9 shrink-0 border px-2.5 text-xs font-medium transition-colors ${FOCUS} ${
                    soloAgotados
                      ? "border-red-400/50 bg-red-500/15 text-red-200"
                      : "border-white/10 text-white/55 hover:bg-white/[0.04] hover:text-white"
                  }`}
                >
                  Solo agotados
                </button>
              </div>

              {stockBajoFiltrado.length === 0 ? (
                filtroBajo ? (
                  <EmptyState
                    icon={SearchX}
                    title="Sin resultados"
                    text={`Ningún producto coincide con "${busquedaBajo}".`}
                  />
                ) : soloAgotados ? (
                  <EmptyState
                    icon={PackageOpen}
                    title="Ningún producto agotado"
                    text="Todos los productos tienen stock disponible."
                  />
                ) : (
                  <EmptyState
                    icon={PackageOpen}
                    title="Todo el stock está al día"
                    text="Ningún producto bajó de su stock de alerta."
                  />
                )
              ) : (
                <ul className="max-h-[28rem] divide-y divide-white/10 overflow-y-auto">
                  {stockBajoFiltrado.map((p) => {
                    const stock = Number(p.stockActual) || 0;
                    const critico = stock <= 0;
                    return (
                      <li key={p.id} className="px-5 py-3 transition-colors hover:bg-white/[0.03]">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm text-white/85">{p.nombre}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p
                              className={`inline-flex items-center gap-1 text-sm font-semibold ${critico ? "text-red-300" : "text-white"}`}
                              style={MONO}
                            >
                              {critico && <AlertTriangle className="h-3 w-3" aria-hidden="true" />}
                              {critico ? "Agotado" : `${fmtNumero(stock)} ${unidad(p)}`}
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
            <section
              className={`${CARD} flex flex-col`}
              aria-labelledby="h-top"
              aria-busy={cargando}
            >
              <SectionHeader
                icon={TrendingUp}
                iconClass="text-cyan-400"
                title={<span id="h-top">Más vendidos</span>}
                hint={cargando ? "Actualizando…" : `${etiquetaRango} · unidades`}
              />

              <div className="space-y-2 px-4 pt-3">
                {/* Período del ranking: el back filtra con desde/hasta. */}
                <div
                  role="group"
                  aria-label="Período de más vendidos"
                  className="grid grid-cols-4 divide-x divide-white/10 border border-white/10"
                >
                  {RANGOS.map((r) => {
                    const activo = rango === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        aria-pressed={activo}
                        onClick={() => setRango(r.id)}
                        className={`px-1 py-1.5 text-xs font-medium transition-colors ${FOCUS} ${
                          activo
                            ? "bg-[var(--accent-dim)] text-[var(--accent)]"
                            : "text-white/55 hover:bg-white/[0.04] hover:text-white"
                        }`}
                      >
                        {r.label}
                      </button>
                    );
                  })}
                </div>

                <SearchField
                  value={busquedaVendidos}
                  onChange={setBusquedaVendidos}
                  placeholder="Buscar por nombre…"
                  ariaLabel="Buscar producto en más vendidos"
                  className="h-9"
                />
              </div>

              {masVendidosFiltrado.length === 0 ? (
                filtroVendidos ? (
                  <EmptyState
                    icon={SearchX}
                    title="Sin resultados"
                    text={`Ningún producto coincide con "${busquedaVendidos}".`}
                  />
                ) : (
                  <EmptyState
                    icon={BarChart3}
                    title={
                      rango === "todo"
                        ? "Todavía no hay ventas"
                        : rango === "hoy"
                          ? "Sin ventas hoy"
                          : `Sin ventas en ${etiquetaRango.toLowerCase()}`
                    }
                    text={
                      rango === "todo"
                        ? "Cuando registres ventas, acá vas a ver los productos que más salen."
                        : "Probá con un período más amplio para ver el ranking."
                    }
                  />
                )
              ) : (
                <ol
                  className={`flex-1 divide-y divide-white/10 transition-opacity ${cargando ? "opacity-50" : "opacity-100"}`}
                >
                  {masVendidosFiltrado.map((p, i) => {
                    const primero = i === 0;
                    return (
                      <li key={p.id} className="px-5 py-3">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="flex min-w-0 items-baseline gap-2 text-sm">
                            <span
                              className={`w-4 shrink-0 text-xs ${primero ? "font-semibold text-amber-400" : "text-white/35"}`}
                              style={MONO}
                            >
                              {i + 1}
                            </span>
                            <span className={`truncate ${primero ? "font-medium text-white" : "text-white/80"}`}>
                              {p.nombre}
                            </span>
                          </p>
                          <p className="shrink-0 text-sm text-emerald-400" style={MONO}>
                            {fmtNumero(p.unidades)} <span className="font-normal text-white/45">{p.unidad}</span>
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
