import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronDown, CalendarRange } from "lucide-react";
import { getFacturasCompra, apiErrorMessage } from "../../../api/facturasCompraApi";
import { getProveedores } from "../../../api/proveedoresApi";

const money = (n) => {
  const v = Number(n);
  return Number.isFinite(v) ? `₲ ${v.toLocaleString("es-PY", { maximumFractionDigits: 0 })}` : "—";
};

const hoyAsuncion = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "America/Asuncion", year: "numeric", month: "2-digit", day: "2-digit" });

function asuncionYMD(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Asuncion", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const get = (t) => parts.find((p) => p.type === t)?.value;
  return { y: Number(get("year")), m: Number(get("month")), d: Number(get("day")) };
}

const iso = (y, m, d) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

function mesActual() {
  const { y, m, d } = asuncionYMD();
  return { desde: iso(y, m, 1), hasta: iso(y, m, d) };
}

function hoy() {
  const { y, m, d } = asuncionYMD();
  return { desde: iso(y, m, d), hasta: iso(y, m, d) };
}

function inicioSemana() {
  const { y, m, d } = asuncionYMD();
  const dow = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; // 0 = lunes
  const sd = new Date(Date.UTC(y, m - 1, d - dow));
  const { y: sy, m: sm, d: sd_ } = asuncionYMD(sd);
  const hoyAs = asuncionYMD();
  return { desde: iso(sy, sm, sd_), hasta: iso(hoyAs.y, hoyAs.m, hoyAs.d) };
}

function mesAnterior() {
  const { y, m } = asuncionYMD();
  const prev = m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 };
  const ultimo = new Date(Date.UTC(prev.y, prev.m, 0)).getUTCDate();
  return { desde: iso(prev.y, prev.m, 1), hasta: iso(prev.y, prev.m, ultimo) };
}

const ATAJOS = [
  { label: "Hoy", rango: hoy },
  { label: "Esta semana", rango: inicioSemana },
  { label: "Mes actual", rango: mesActual },
  { label: "Mes anterior", rango: mesAnterior },
];

const pageBtn = "px-2 py-1 rounded text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors text-sm";

const S = {
  field:
    "w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-white " +
    "placeholder:text-white/30 outline-none transition-colors duration-150 focus:border-[#22c55e]/50",
  eyebrow: "text-[0.625rem] font-medium uppercase tracking-[0.12em] text-[#5a5a6e]",
};

const CHART_COLORS = ["#22c55e", "#38bdf8", "#f59e0b", "#a78bfa", "#f472b6", "#94a3b8"];

export default function ReportesCompras() {
  const [facturas, setFacturas] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [desde, setDesde] = useState(() => mesActual().desde);
  const [hasta, setHasta] = useState(() => mesActual().hasta);
  const [selProveedores, setSelProveedores] = useState(() => new Set());
  const [condicion, setCondicion] = useState("TODOS");
  const [abiertoProveedores, setAbiertoProveedores] = useState(false);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const prov = await getProveedores({ pageSize: 500, sortBy: "nombre", sortDir: "ASC" });
        if (activo) setProveedores(Array.isArray(prov.content) ? prov.content : []);
      } catch { /* sin proveedores */ }
    })();
    return () => { activo = false; };
  }, []);

  useEffect(() => {
    let activo = true;
    (async () => {
      setCargando(true);
      setError(null);
      try {
        const res = await getFacturasCompra({ page: 0, pageSize: 1000 });
        if (activo) setFacturas(Array.isArray(res.content) ? res.content : []);
      } catch (err) {
        if (activo) setError(apiErrorMessage(err) || "Error al cargar facturas");
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => { activo = false; };
  }, []);

  const aplicarAtajo = (rango) => {
    const r = rango();
    setDesde(r.desde);
    setHasta(r.hasta);
  };

  const toggleProveedor = (id) => {
    setSelProveedores((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const vigentes = useMemo(() => facturas.filter((f) => f.estado !== "CANCELADA" && f.activo !== false), [facturas]);

  const filtradas = useMemo(() => {
    return vigentes.filter((f) => {
      const fe = f.fechaEmision;
      if (fe && desde && String(fe) < String(desde)) return false;
      if (fe && hasta && String(fe) > String(hasta)) return false;
      if (selProveedores.size > 0 && !selProveedores.has(Number(f.idProveedor))) return false;
      if (condicion !== "TODOS" && f.condicionPago !== condicion) return false;
      return true;
    });
  }, [vigentes, desde, hasta, selProveedores, condicion]);

  const kpis = useMemo(() => {
    const montoTotal = filtradas.reduce((s, f) => s + Number(f.totalGeneral || 0), 0);
    const creditoFiscal = filtradas.reduce((s, f) => s + Number(f.ivaTotal || 0), 0);
    const volumen = filtradas.length;
    const promedio = volumen > 0 ? montoTotal / volumen : 0;
    return { montoTotal, creditoFiscal, volumen, promedio };
  }, [filtradas]);

  const resumenIva = useMemo(() => {
    const suma = (campo) => filtradas.reduce((s, f) => s + Number(f[campo] || 0), 0);
    const base10 = suma("subtotal10");
    const base5 = suma("subtotal5");
    const exenta = suma("subtotalExento");
    const iva10 = suma("iva10");
    const iva5 = suma("iva5");
    const filas = [
      { tasa: "IVA 10%", base: base10, iva: iva10, total: base10 + iva10 },
      { tasa: "IVA 5%", base: base5, iva: iva5, total: base5 + iva5 },
      { tasa: "Exenta (0%)", base: exenta, iva: 0, total: exenta },
    ];
    const totales = filas.reduce(
      (t, f) => ({ base: t.base + f.base, iva: t.iva + f.iva, total: t.total + f.total }),
      { base: 0, iva: 0, total: 0 }
    );
    return { filas, totales };
  }, [filtradas]);

  const evolucion = useMemo(() => {
    const porFecha = new Map();
    for (const f of filtradas) {
      const clave = String(f.fechaEmision || "").slice(0, 10);
      if (!clave) continue;
      porFecha.set(clave, (porFecha.get(clave) || 0) + Number(f.totalGeneral || 0));
    }
    return [...porFecha.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fecha, valor]) => ({ fecha, valor }));
  }, [filtradas]);

  const topProveedores = useMemo(() => {
    const porProv = new Map();
    for (const f of filtradas) {
      const nombre = f.nombreProveedor || "Sin proveedor";
      porProv.set(nombre, (porProv.get(nombre) || 0) + Number(f.totalGeneral || 0));
    }
    const ordenados = [...porProv.entries()].sort((a, b) => b[1] - a[1]);
    const top5 = ordenados.slice(0, 5);
    const resto = ordenados.slice(5).reduce((s, [, v]) => s + v, 0);
    const segmentos = top5.map(([nombre, valor]) => ({ nombre, valor }));
    if (resto > 0) segmentos.push({ nombre: "Otros", valor: resto, esOtros: true });
    const total = segmentos.reduce((s, x) => s + x.valor, 0);
    return segmentos.map((s) => ({ ...s, pct: total > 0 ? (s.valor / total) * 100 : 0 }));
  }, [filtradas]);

  useEffect(() => {
    const cerrar = () => setAbiertoProveedores(false);
    window.addEventListener("click", cerrar);
    return () => window.removeEventListener("click", cerrar);
  }, []);

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/compras/consultas" className="p-2 rounded-lg hover:bg-white/10 text-white/50 transition-colors" aria-label="Volver">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-[#f1f1f3] tracking-tight">Reportes de Compras</h1>
          <p className="text-sm text-[#5a5a6e]">Resumen de compras, IVA y análisis por proveedor</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-[var(--bg-card)] border border-white/5 rounded-xl p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div>
            <label className={S.eyebrow} htmlFor="desde">Desde</label>
            <input id="desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={`${S.field} mt-1`} />
          </div>
          <div>
            <label className={S.eyebrow} htmlFor="hasta">Hasta</label>
            <input id="hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={`${S.field} mt-1`} />
          </div>
          <div>
            <label className={S.eyebrow} htmlFor="condicion">Condición de Pago</label>
            <select id="condicion" value={condicion} onChange={(e) => setCondicion(e.target.value)} className={`${S.field} mt-1 appearance-none`}>
              <option value="TODOS">Todos</option>
              <option value="CONTADO">Contado</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="CREDITO">Crédito</option>
            </select>
          </div>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <label className={S.eyebrow} htmlFor="proveedores">Proveedores</label>
            <button
              type="button"
              id="proveedores"
              onClick={() => setAbiertoProveedores((v) => !v)}
              className={`${S.field} mt-1 flex items-center justify-between gap-2 text-left cursor-pointer`}
            >
              <span className="truncate">
                {selProveedores.size === 0
                  ? "Todos los proveedores"
                  : proveedores.filter((p) => selProveedores.has(Number(p.id ?? p.idProveedor))).map((p) => p.nombre).join(", ")}
              </span>
              <ChevronDown size={14} className="shrink-0 text-white/40" />
            </button>
            {abiertoProveedores && (
              <div className="absolute z-20 mt-1 w-full max-h-52 overflow-y-auto bg-[#17171b] border border-white/10 rounded-lg p-1.5 space-y-0.5 shadow-xl">
                <label className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-white hover:bg-white/5 cursor-pointer">
                  <input type="checkbox" checked={selProveedores.size === 0} onChange={() => setSelProveedores(new Set())} />
                  Todos los proveedores
                </label>
                {proveedores.map((p) => {
                  const id = Number(p.id ?? p.idProveedor);
                  return (
                    <label key={id} className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-white hover:bg-white/5 cursor-pointer">
                      <input type="checkbox" checked={selProveedores.has(id)} onChange={() => toggleProveedor(id)} />
                      {p.nombre}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
          <div>
            <label className={S.eyebrow} htmlFor="categoria">Categoría de Producto</label>
            <select
              id="categoria"
              value=""
              disabled
              className={`${S.field} mt-1 appearance-none opacity-50 cursor-not-allowed`}
            >
              <option value="">Próximamente</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CalendarRange size={14} className="text-white/40" />
          {ATAJOS.map(({ label, rango }) => (
            <button key={label} type="button" onClick={() => aplicarAtajo(rango)}
              className="px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 text-xs text-white/70 hover:bg-white/10 hover:text-white transition-colors">
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm px-4 py-3">{error}</div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Monto Total Comprado" value={money(kpis.montoTotal)} accent="#22c55e" />
        <KpiCard label="Crédito Fiscal Total (IVA)" value={money(kpis.creditoFiscal)} accent="#38bdf8" />
        <KpiCard label="Volumen de Facturas" value={String(kpis.volumen)} accent="#f59e0b" />
        <KpiCard label="Gasto Promedio por Compra" value={money(kpis.promedio)} accent="#a78bfa" />
      </div>

      {/* Desglose de IVA */}
      <div className="bg-[var(--bg-card)] border border-white/5 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10">
          <h2 className="text-sm font-semibold text-white">Desglose Fiscal de IVA</h2>
          <p className="text-xs text-[#5a5a6e]">Liquidación del período {desde} → {hasta}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-white/40 text-right">
                <th className="px-4 py-2.5 font-medium text-left">Tasa</th>
                <th className="px-4 py-2.5 font-medium">Base Imponible</th>
                <th className="px-4 py-2.5 font-medium">Liquidación IVA</th>
                <th className="px-4 py-2.5 font-medium">Total con IVA</th>
              </tr>
            </thead>
            <tbody>
              {resumenIva.filas.map((f) => (
                <tr key={f.tasa} className="border-b border-white/5">
                  <td className="px-4 py-2.5 text-white text-left">{f.tasa}</td>
                  <td className="px-4 py-2.5 text-white/70">{money(f.base)}</td>
                  <td className="px-4 py-2.5 text-white/70">{money(f.iva)}</td>
                  <td className="px-4 py-2.5 text-white">{money(f.total)}</td>
                </tr>
              ))}
              <tr className="bg-white/5">
                <td className="px-4 py-3 text-white font-semibold text-left">TOTALES</td>
                <td className="px-4 py-3 text-white font-semibold">{money(resumenIva.totales.base)}</td>
                <td className="px-4 py-3 text-[#22c55e] font-semibold">{money(resumenIva.totales.iva)}</td>
                <td className="px-4 py-3 text-white font-semibold">{money(resumenIva.totales.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {cargando ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-64 bg-white/5 border border-white/5 rounded-xl animate-pulse" />
          <div className="h-64 bg-white/5 border border-white/5 rounded-xl animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <GraficoEvolucion datos={evolucion} />
          <GraficoProveedores segmentos={topProveedores} />
        </div>
      )}

      {!cargando && filtradas.length === 0 && (
        <div className="text-center text-white/30 py-10">Sin facturas para los filtros seleccionados.</div>
      )}
    </div>
  );
}

function KpiCard({ label, value, accent }) {
  return (
    <div className="bg-[var(--bg-card)] border border-white/5 rounded-xl p-4 space-y-2">
      <p className="text-[0.625rem] font-medium uppercase tracking-[0.12em] text-[#5a5a6e]">{label}</p>
      <p className="text-xl font-semibold text-white truncate" style={{ color: accent }}>{value}</p>
    </div>
  );
}

function GraficoEvolucion({ datos }) {
  if (datos.length === 0) {
    return <PanelVacio titulo="Evolución del Gasto" />;
  }
  const max = Math.max(...datos.map((d) => d.valor), 1);
  const W = Math.max(300, datos.length * 42);
  const H = 200;
  const pad = 36;
  const bw = 26;
  const step = Math.ceil(datos.length / 12);

  return (
    <div className="bg-[var(--bg-card)] border border-white/5 rounded-xl p-4">
      <h2 className="text-sm font-semibold text-white mb-1">Evolución del Gasto</h2>
      <p className="text-xs text-[#5a5a6e] mb-3">Total comprado por día</p>
      <div className="overflow-x-auto">
        <svg width={W} height={H} className="min-w-full">
          {datos.map((d, i) => {
            const h = (d.valor / max) * (H - pad - 12);
            const x = i * 42 + 1;
            const y = H - pad - h;
            return (
              <g key={d.fecha}>
                <title>{`${d.fecha}: ${money(d.valor)}`}</title>
                <rect x={x} y={y} width={bw} height={h} rx="3" fill="#22c55e" opacity="0.85">
                  <animate attributeName="height" from="0" to={h} dur="0.35s" fill="freeze" />
                  <animate attributeName="y" from={H - pad} to={y} dur="0.35s" fill="freeze" />
                </rect>
                {i % step === 0 && (
                  <text x={x + bw / 2} y={H - 12} fontSize="9" fill="#8b8b9e" textAnchor="middle">
                    {d.fecha.slice(5)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function GraficoProveedores({ segmentos }) {
  const total = segmentos.reduce((s, x) => s + x.valor, 0);
  if (total === 0) {
    return <PanelVacio titulo="Top 5 Proveedores" />;
  }
  const r = 70;
  const c = 2 * Math.PI * r;
  let acum = 0;

  return (
    <div className="bg-[var(--bg-card)] border border-white/5 rounded-xl p-4">
      <h2 className="text-sm font-semibold text-white mb-1">Top 5 Proveedores</h2>
      <p className="text-xs text-[#5a5a6e] mb-3">% de compras acumulado por distribuidor</p>
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <svg width="180" height="180" viewBox="0 0 180 180" className="shrink-0">
          <g transform="rotate(-90 90 90)">
            <circle cx="90" cy="90" r={r} fill="none" stroke="#ffffff10" strokeWidth="26" />
            {segmentos.map((s, i) => {
              const frac = total > 0 ? s.valor / total : 0;
              const dash = frac * c;
              const el = (
                <circle
                  key={s.nombre}
                  cx="90" cy="90" r={r} fill="none"
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  strokeWidth="26"
                  strokeDasharray={`${dash} ${c - dash}`}
                  strokeDashoffset={-acum}
                />
              );
              acum += dash;
              return el;
            })}
          </g>
          <text x="90" y="86" fontSize="22" fontWeight="600" fill="#f1f1f3" textAnchor="middle">{total.toLocaleString("es-PY")}</text>
          <text x="90" y="104" fontSize="10" fill="#8b8b9e" textAnchor="middle">Total</text>
        </svg>
        <ul className="w-full space-y-1.5 text-sm min-w-0">
          {segmentos.map((s, i) => (
            <li key={s.nombre} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                <span className="text-white truncate">{s.nombre}</span>
              </span>
              <span className="text-white/60 whitespace-nowrap">{s.pct.toFixed(1)}% · {money(s.valor)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function PanelVacio({ titulo }) {
  return (
    <div className="bg-[var(--bg-card)] border border-white/5 rounded-xl p-4">
      <h2 className="text-sm font-semibold text-white mb-3">{titulo}</h2>
      <div className="h-36 flex items-center justify-center text-white/30 text-sm">Sin datos para el período</div>
    </div>
  );
}