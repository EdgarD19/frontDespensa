import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronDown, Eye, X, Receipt, Building2, Package, Percent } from "lucide-react";
import { getFacturasCompra, apiErrorMessage } from "../../../api/facturasCompraApi";
import { getProveedores } from "../../../api/proveedoresApi";

const money = (n) => {
  const v = Number(n);
  return Number.isFinite(v) ? `₲ ${v.toLocaleString("es-PY", { maximumFractionDigits: 0 })}` : "—";
};

const fmtFecha = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString("es-PY", { day: "2-digit", month: "2-digit", year: "numeric" });
};

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

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const fmtMes = (ym) => {
  const [y, m] = String(ym).split("-");
  const mi = Number(m) - 1;
  return `${MESES[mi] ?? m} ${y}`;
};

const S = {
  field:
    "w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-white " +
    "placeholder:text-white/30 outline-none transition-colors duration-150 focus:border-[#22c55e]/50",
  eyebrow: "text-[0.625rem] font-medium uppercase tracking-[0.12em] text-[#5a5a6e]",
};

const REPORTES = [
  { id: "periodo", label: "Compras por período", icon: Receipt },
  { id: "proveedor", label: "Por proveedor", icon: Building2 },
  { id: "producto", label: "Por producto", icon: Package },
  { id: "iva", label: "Resumen de IVA", icon: Percent },
];

export default function ReportesCompras() {
  const [todas, setTodas] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [desde, setDesde] = useState(() => mesActual().desde);
  const [hasta, setHasta] = useState(() => mesActual().hasta);
  const [selProveedores, setSelProveedores] = useState(() => new Set());
  const [selProductos, setSelProductos] = useState(() => new Set());
  const [abiertoProveedores, setAbiertoProveedores] = useState(false);
  const [abiertoProductos, setAbiertoProductos] = useState(false);
  const [reporte, setReporte] = useState("periodo");
  const [agrupFecha, setAgrupFecha] = useState("none");
  const [detalle, setDetalle] = useState(null);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const res = await getProveedores({ pageSize: 500, sortBy: "nombre", sortDir: "ASC" });
        if (activo) setProveedores(Array.isArray(res.content) ? res.content : []);
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
        if (activo) setTodas(Array.isArray(res.content) ? res.content : []);
      } catch (err) {
        if (activo) setError(apiErrorMessage(err) || "Error al cargar facturas");
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => { activo = false; };
  }, []);

  const nombresProveedor = useMemo(
    () => new Map(proveedores.map((p) => [Number(p.id ?? p.idProveedor), p.nombre])),
    [proveedores]
  );

  const productosDisponibles = useMemo(() => {
    const set = new Set();
    for (const f of todas) {
      for (const d of Array.isArray(f.detalles) ? f.detalles : []) {
        set.add(d.nombreProducto || `Producto #${d.idProducto}`);
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [todas]);

  const limpiarFiltros = () => {
    const r = mesActual();
    setDesde(r.desde);
    setHasta(r.hasta);
    setSelProveedores(new Set());
    setSelProductos(new Set());
  };

  const toggleProveedor = (id) => {
    setSelProveedores((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleProducto = (nombre) => {
    setSelProductos((prev) => {
      const next = new Set(prev);
      if (next.has(nombre)) next.delete(nombre);
      else next.add(nombre);
      return next;
    });
  };

  const vigentes = useMemo(() => todas.filter((f) => f.estado !== "CANCELADA" && f.activo !== false), [todas]);

  const filtradas = useMemo(() => {
    return vigentes.filter((f) => {
      const fe = f.fechaEmision;
      if (fe && desde && String(fe) < String(desde)) return false;
      if (fe && hasta && String(fe) > String(hasta)) return false;
      if (selProveedores.size > 0 && !selProveedores.has(Number(f.idProveedor))) return false;
      if (selProductos.size > 0) {
        const tiene = (Array.isArray(f.detalles) ? f.detalles : []).some(
          (d) => selProductos.has(d.nombreProducto || `Producto #${d.idProducto}`)
        );
        if (!tiene) return false;
      }
      return true;
    });
  }, [vigentes, desde, hasta, selProveedores, selProductos]);

  const kpis = useMemo(() => {
    const montoTotal = filtradas.reduce((s, f) => s + Number(f.totalGeneral || 0), 0);
    const volumen = filtradas.length;
    return { montoTotal, volumen };
  }, [filtradas]);

  const totalUnidades = useMemo(() => {
    return filtradas.reduce((s, f) => {
      const ds = Array.isArray(f.detalles) ? f.detalles : [];
      return s + ds.reduce((a, d) => a + Number(d.cantidad || 0), 0);
    }, 0);
  }, [filtradas]);

  const porProveedor = useMemo(() => {
    const map = new Map();
    for (const f of filtradas) {
      const key = f.idProveedor != null ? String(f.idProveedor) : "?";
      const row = map.get(key) || {
        idProveedor: f.idProveedor,
        nombre: f.nombreProveedor || "Sin proveedor",
        cantFacturas: 0,
        cantProductos: 0,
        importe: 0,
      };
      row.cantFacturas += 1;
      row.cantProductos += (Array.isArray(f.detalles) ? f.detalles : []).reduce(
        (s, d) => s + Number(d.cantidad || 0), 0
      );
      row.importe += Number(f.totalGeneral || 0);
      map.set(key, row);
    }
    return [...map.values()].sort((a, b) => b.importe - a.importe);
  }, [filtradas]);

  const porProducto = useMemo(() => {
    const map = new Map();
    for (const f of filtradas) {
      for (const d of Array.isArray(f.detalles) ? f.detalles : []) {
        const key = d.idProducto != null ? String(d.idProducto) : String(d.nombreProducto || "");
        const row = map.get(key) || {
          idProducto: d.idProducto,
          nombre: d.nombreProducto || `Producto #${d.idProducto}`,
          cantidad: 0,
          monto: 0,
        };
        row.cantidad += Number(d.cantidad || 0);
        row.monto += Number(d.subtotal || 0);
        map.set(key, row);
      }
    }
    return [...map.values()].sort((a, b) => b.monto - a.monto);
  }, [filtradas]);

  const montoProductos = useMemo(() => porProducto.reduce((s, r) => s + r.monto, 0), [porProducto]);

  const resumenIva = useMemo(() => {
    let exento = 0, s5 = 0, s10 = 0, ivaE = 0, iva5 = 0, iva10 = 0, ivaT = 0, tot = 0;
    for (const f of filtradas) {
      exento += Number(f.subtotalExento || 0);
      s5 += Number(f.subtotal5 || 0);
      s10 += Number(f.subtotal10 || 0);
      ivaE += Number(f.ivaExento || 0);
      iva5 += Number(f.iva5 || 0);
      iva10 += Number(f.iva10 || 0);
      ivaT += Number(f.ivaTotal || 0);
      tot += Number(f.totalGeneral || 0);
    }
    return { exento, s5, s10, ivaE, iva5, iva10, ivaT, tot, subtotal: exento + s5 + s10 };
  }, [filtradas]);

  const porFecha = useMemo(() => {
    const map = new Map();
    for (const f of filtradas) {
      const base = String(f.fechaEmision || "");
      if (!base) continue;
      const clave = agrupFecha === "dia" ? base.slice(0, 10) : base.slice(0, 7);
      const row = map.get(clave) || { fecha: clave, cant: 0, unidades: 0, importe: 0 };
      row.cant += 1;
      row.unidades += (Array.isArray(f.detalles) ? f.detalles : []).reduce(
        (s, d) => s + Number(d.cantidad || 0), 0
      );
      row.importe += Number(f.totalGeneral || 0);
      map.set(clave, row);
    }
    return [...map.values()].sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [filtradas, agrupFecha]);

  const paramsHeader = useMemo(() => {
    const fechas = desde || hasta
      ? `${fmtFecha(desde) || "inicio"} — ${fmtFecha(hasta) || "hoy"}`
      : "Todo el período";
    const provs = selProveedores.size === 0
      ? "Todos los proveedores"
      : proveedores.filter((p) => selProveedores.has(Number(p.id ?? p.idProveedor))).map((p) => p.nombre).join(", ") || "—";
    const prods = selProductos.size === 0
      ? "Todos los productos"
      : `${[...selProductos].slice(0, 3).join(", ")}${selProductos.size > 3 ? ` (+${selProductos.size - 3} más)` : ""}`;
    return { fechas, provs, prods };
  }, [desde, hasta, proveedores, selProveedores, selProductos]);

  useEffect(() => {
    const cerrar = () => { setAbiertoProveedores(false); setAbiertoProductos(false); };
    window.addEventListener("click", cerrar);
    return () => window.removeEventListener("click", cerrar);
  }, []);

  const th = "px-4 py-2.5 font-medium text-white/40 text-left whitespace-nowrap";
  const thR = "px-4 py-2.5 font-medium text-white/40 text-right whitespace-nowrap";

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/compras/consultas" className="p-2 rounded-lg hover:bg-white/10 text-white/50 transition-colors" aria-label="Volver">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-[#f1f1f3] tracking-tight">Reporte de Compras</h1>
          <p className="text-sm text-[#5a5a6e]">Consulta de compras por período, proveedor y producto</p>
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
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <label className={S.eyebrow} htmlFor="proveedores">Proveedor</label>
            <button
              type="button"
              id="proveedores"
              onClick={() => setAbiertoProveedores((v) => !v)}
              className={`${S.field} mt-1 flex items-center justify-between gap-2 text-left cursor-pointer`}
            >
              <span className="truncate">
                {selProveedores.size === 0
                  ? "Todos los proveedores"
                  : proveedores.filter((p) => selProveedores.has(Number(p.id ?? p.idProveedor))).map((p) => p.nombre).join(", ") || "—"}
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
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <label className={S.eyebrow} htmlFor="productos">Producto</label>
            <button
              type="button"
              id="productos"
              onClick={() => setAbiertoProductos((v) => !v)}
              className={`${S.field} mt-1 flex items-center justify-between gap-2 text-left cursor-pointer`}
            >
              <span className="truncate">
                {selProductos.size === 0
                  ? "Todos los productos"
                  : `${[...selProductos].slice(0, 3).join(", ")}${selProductos.size > 3 ? ` (+${selProductos.size - 3})` : ""}`}
              </span>
              <ChevronDown size={14} className="shrink-0 text-white/40" />
            </button>
            {abiertoProductos && (
              <div className="absolute z-20 mt-1 w-full max-h-52 overflow-y-auto bg-[#17171b] border border-white/10 rounded-lg p-1.5 space-y-0.5 shadow-xl">
                <label className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-white hover:bg-white/5 cursor-pointer">
                  <input type="checkbox" checked={selProductos.size === 0} onChange={() => setSelProductos(new Set())} />
                  Todos los productos
                </label>
                {productosDisponibles.map((nombre) => (
                  <label key={nombre} className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-white hover:bg-white/5 cursor-pointer">
                    <input type="checkbox" checked={selProductos.has(nombre)} onChange={() => toggleProducto(nombre)} />
                    {nombre}
                  </label>
                ))}
                <p className="px-2 pt-1.5 text-[11px] text-white/30">
                  Filtrar por categoría no disponible (requiere backend).
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-[#5a5a6e]">
            {filtradas.length} compra{filtradas.length !== 1 ? "s" : ""} según los filtros seleccionados
          </p>
          <button
            type="button"
            onClick={limpiarFiltros}
            title="Limpiar los filtros y realizar una nueva consulta"
            className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-xs text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm px-4 py-3">{error}</div>
      )}

      {/* Encabezado del reporte: nombre + rango + parámetros usados */}
      <div className="bg-[var(--bg-card)] border border-white/5 rounded-xl px-4 py-3 text-xs text-[#8b8b9e] flex flex-col sm:flex-row gap-1.5 sm:gap-6">
        <span>
          <span className="font-medium text-white/70">Reporte:</span> {REPORTES.find((r) => r.id === reporte)?.label}
        </span>
        <span>
          <span className="font-medium text-white/70">Rango:</span> {paramsHeader.fechas}
        </span>
        <span className="truncate">
          <span className="font-medium text-white/70">Proveedores:</span> {paramsHeader.provs}
        </span>
        <span className="truncate">
          <span className="font-medium text-white/70">Productos:</span> {paramsHeader.prods}
        </span>
      </div>

      {/* Catálogo de reportes */}
      <div className="flex flex-wrap gap-2">
        {REPORTES.map((r) => {
          const Icon = r.icon;
          const activo = reporte === r.id;
          return (
            <button
              key={r.id}
              type="button"
              disabled={r.disabled}
              onClick={() => setReporte(r.id)}
              title={r.motivo}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                r.disabled
                  ? "text-white/25 border-white/5 cursor-not-allowed"
                  : activo
                    ? "bg-[#22c55e]/15 border-[#22c55e]/40 text-[#22c55e]"
                    : "text-white/70 border-white/10 bg-white/5 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon size={16} aria-hidden />
              {r.label}
              {r.disabled && <span className="text-[10px] font-normal">(requiere pagos)</span>}
            </button>
          );
        })}
      </div>

      {/* Contenido del reporte */}
      {cargando ? (
        <div className="bg-[var(--bg-card)] border border-white/5 rounded-xl p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 bg-white/10 rounded animate-pulse w-full" />
          ))}
        </div>
      ) : reporte === "periodo" ? (
        <ReportePeriodo
          desde={desde}
          hasta={hasta}
          agrupFecha={agrupFecha}
          setAgrupFecha={setAgrupFecha}
          filtradas={filtradas}
          porFecha={porFecha}
          kpis={kpis}
          totalUnidades={totalUnidades}
          onVer={(f) => setDetalle(f)}
          th={th}
          thR={thR}
        />
      ) : reporte === "proveedor" ? (
        <div className="bg-[var(--bg-card)] border border-white/5 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10">
            <h2 className="text-sm font-semibold text-white">Compras por proveedor</h2>
            <p className="text-xs text-[#5a5a6e]">Totales por proveedor en el rango seleccionado</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className={th}>Proveedor</th>
                  <th className={thR}>Cant. Facturas</th>
                  <th className={thR}>Cant. Productos</th>
                  <th className={thR}>Importe Total</th>
                  <th className={thR}>Saldo Pendiente</th>
                </tr>
              </thead>
              <tbody>
                {porProveedor.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-white/30">No hay compras en el rango seleccionado.</td></tr>
                )}
                {porProveedor.map((r) => (
                  <tr key={r.idProveedor ?? r.nombre} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-2.5 text-white">{r.nombre}</td>
                    <td className="px-4 py-2.5 text-white/70 text-right tabular-nums">{r.cantFacturas}</td>
                    <td className="px-4 py-2.5 text-white/70 text-right tabular-nums">{r.cantProductos}</td>
                    <td className="px-4 py-2.5 text-white font-medium text-right tabular-nums">{money(r.importe)}</td>
                    <td className="px-4 py-2.5 text-white/30 text-right">—</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/10 bg-white/5">
                  <td className="px-4 py-2.5 font-semibold text-white">Totales</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-white tabular-nums">{kpis.volumen}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-white tabular-nums">{totalUnidades}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-[#22c55e] tabular-nums">{money(kpis.montoTotal)}</td>
                  <td className="px-4 py-2.5" />
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="px-4 py-2.5 text-[11px] text-white/30 border-t border-white/5">
            Saldo pendiente no disponible: requiere el módulo de pagos (no implementado en el backend).
          </p>
        </div>
      ) : reporte === "producto" ? (
        <div className="bg-[var(--bg-card)] border border-white/5 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10">
            <h2 className="text-sm font-semibold text-white">Compras por producto</h2>
            <p className="text-xs text-[#5a5a6e]">Cantidades y montos comprados en el rango seleccionado</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className={th}>Producto</th>
                  <th className={thR}>Cantidad</th>
                  <th className={thR}>Monto Comprado</th>
                </tr>
              </thead>
              <tbody>
                {porProducto.length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-white/30">No hay productos en el rango seleccionado.</td></tr>
                )}
                {porProducto.map((r) => (
                  <tr key={r.idProducto ?? r.nombre} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-2.5 text-white">{r.nombre}</td>
                    <td className="px-4 py-2.5 text-white/70 text-right tabular-nums">{Number(r.cantidad)}</td>
                    <td className="px-4 py-2.5 text-white font-medium text-right tabular-nums">{money(r.monto)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/10 bg-white/5">
                  <td className="px-4 py-2.5 font-semibold text-white">Totales</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-white tabular-nums">{totalUnidades}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-[#22c55e] tabular-nums">{money(montoProductos)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : reporte === "iva" ? (
        <div className="bg-[var(--bg-card)] border border-white/5 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10">
            <h2 className="text-sm font-semibold text-white">Resumen de impuestos (IVA)</h2>
            <p className="text-xs text-[#5a5a6e]">Desglose del IVA de las compras en el rango seleccionado</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className={th}>Concepto</th>
                  <th className={thR}>Base Imponible</th>
                  <th className={thR}>IVA</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-white/30">No hay compras en el rango seleccionado.</td></tr>
                )}
                {filtradas.length > 0 && (
                  <>
                    <tr className="border-b border-white/5">
                      <td className="px-4 py-2.5 text-white/80">Exentas</td>
                      <td className="px-4 py-2.5 text-right text-white/70 tabular-nums">{money(resumenIva.exento)}</td>
                      <td className="px-4 py-2.5 text-right text-white/70 tabular-nums">{money(resumenIva.ivaE)}</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="px-4 py-2.5 text-white/80">IVA 5%</td>
                      <td className="px-4 py-2.5 text-right text-white/70 tabular-nums">{money(resumenIva.s5)}</td>
                      <td className="px-4 py-2.5 text-right text-white/70 tabular-nums">{money(resumenIva.iva5)}</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="px-4 py-2.5 text-white/80">IVA 10%</td>
                      <td className="px-4 py-2.5 text-right text-white/70 tabular-nums">{money(resumenIva.s10)}</td>
                      <td className="px-4 py-2.5 text-right text-white/70 tabular-nums">{money(resumenIva.iva10)}</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="px-4 py-2.5 text-white/80">Subtotal general</td>
                      <td className="px-4 py-2.5 text-right text-white tabular-nums">{money(resumenIva.subtotal)}</td>
                      <td className="px-4 py-2.5 text-right text-white/70 tabular-nums">—</td>
                    </tr>
                  </>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/10 bg-white/5">
                  <td className="px-4 py-2.5 font-semibold text-white">Total IVA</td>
                  <td className="px-4 py-2.5" />
                  <td className="px-4 py-2.5 text-right font-semibold text-amber-400 tabular-nums">{money(resumenIva.ivaT)}</td>
                </tr>
                <tr className="bg-white/5">
                  <td className="px-4 py-2.5 font-semibold text-white">Total Compras</td>
                  <td className="px-4 py-2.5" />
                  <td className="px-4 py-2.5 text-right font-semibold text-[#22c55e] tabular-nums">{money(resumenIva.tot)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : null}

      {detalle && (
        <DetalleCompra factura={detalle} onClose={() => setDetalle(null)} />
      )}
    </div>
  );
}

function ReportePeriodo({ agrupFecha, setAgrupFecha, filtradas, porFecha, kpis, totalUnidades, onVer, th, thR }) {
  const agrupado = agrupFecha !== "none";

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard label="Total de Compras" value={String(kpis.volumen)} accent="#22c55e" />
        <KpiCard label="Importe Total Comprado" value={money(kpis.montoTotal)} accent="#38bdf8" />
        <KpiCard label="Cantidad Total de Productos" value={String(totalUnidades)} accent="#f59e0b" />
      </div>

      <div className="bg-[var(--bg-card)] border border-white/5 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold text-white">
              {agrupado ? "Compras agrupadas por fecha" : "Listado de Compras"}
            </h2>
            <p className="text-xs text-[#5a5a6e]">
              {filtradas.length} compra{filtradas.length !== 1 ? "s" : ""} según los filtros seleccionados
            </p>
          </div>
          <div className="w-full sm:w-52">
            <label className={S.eyebrow} htmlFor="agrup-fecha">Agrupar por fecha</label>
            <select
              id="agrup-fecha"
              value={agrupFecha}
              onChange={(e) => setAgrupFecha(e.target.value)}
              className={`${S.field} mt-1`}
            >
              <option value="none">Sin agrupar</option>
              <option value="dia">Día</option>
              <option value="mes">Mes</option>
            </select>
          </div>
        </div>

        {agrupado ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className={th}>{agrupFecha === "dia" ? "Fecha" : "Mes"}</th>
                  <th className={thR}>Cant. Facturas</th>
                  <th className={thR}>Cant. Productos</th>
                  <th className={thR}>Importe Total</th>
                </tr>
              </thead>
              <tbody>
                {porFecha.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-white/30">No hay compras en el rango seleccionado.</td></tr>
                )}
                {porFecha.map((r) => (
                  <tr key={r.fecha} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-2.5 text-white whitespace-nowrap">
                      {agrupFecha === "dia" ? fmtFecha(r.fecha) : fmtMes(r.fecha)}
                    </td>
                    <td className="px-4 py-2.5 text-white/70 text-right tabular-nums">{r.cant}</td>
                    <td className="px-4 py-2.5 text-white/70 text-right tabular-nums">{Number(r.unidades)}</td>
                    <td className="px-4 py-2.5 text-white font-medium text-right tabular-nums">{money(r.importe)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/10 bg-white/5">
                  <td className="px-4 py-2.5 font-semibold text-white">Totales</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-white tabular-nums">{kpis.volumen}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-white tabular-nums">{totalUnidades}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-[#22c55e] tabular-nums">{money(kpis.montoTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className={th}>Fecha</th>
                  <th className={th}>N° Factura</th>
                  <th className={th}>Proveedor</th>
                  <th className={thR}>Cant. Productos</th>
                  <th className={thR}>Importe Total</th>
                  <th className={`${th} w-12`} aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {filtradas.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-white/30">
                      No se encontraron compras que coincidan con los filtros seleccionados.
                    </td>
                  </tr>
                )}
                {filtradas.map((f) => (
                  <tr key={f.idFactura} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-2.5 text-white whitespace-nowrap">{fmtFecha(f.fechaEmision)}</td>
                    <td className="px-4 py-2.5 text-white/70 whitespace-nowrap">{f.numeroFactura || "—"}</td>
                    <td className="px-4 py-2.5 text-white">{f.nombreProveedor || "—"}</td>
                    <td className="px-4 py-2.5 text-white/70 text-right whitespace-nowrap">
                      {Number.isFinite(Number(f.cantidadProductos)) ? Number(f.cantidadProductos) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-white font-medium text-right whitespace-nowrap">{money(f.totalGeneral)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => onVer(f)}
                        title="Ver detalle de la compra"
                        aria-label="Ver detalle de la compra"
                        className="p-1.5 rounded text-white/40 hover:text-[var(--accent-green)] hover:bg-[var(--accent-green)]/10 transition-colors"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/10 bg-white/5">
                  <td colSpan={3} className="px-4 py-2.5 font-semibold text-white">Totales</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-white tabular-nums">{totalUnidades}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-[#22c55e] tabular-nums">{money(kpis.montoTotal)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function DetalleCompra({ factura, onClose }) {
  const detalles = Array.isArray(factura.detalles) ? factura.detalles : [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-3xl my-4 bg-[#17171b] border border-white/10 rounded-2xl p-6 space-y-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-white">Factura {factura.numeroFactura || "—"}</h2>
            <p className="text-sm text-[#5a5a6e]">{factura.nombreProveedor || "Proveedor desconocido"}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-white/50 transition-colors" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div className="space-y-0.5">
            <p className="text-[0.625rem] font-medium uppercase tracking-[0.12em] text-[#5a5a6e]">Fecha emisión</p>
            <p className="text-white">{fmtFecha(factura.fechaEmision)}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[0.625rem] font-medium uppercase tracking-[0.12em] text-[#5a5a6e]">N° Timbrado</p>
            <p className="text-white">{factura.numeroTimbrado || "—"}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[0.625rem] font-medium uppercase tracking-[0.12em] text-[#5a5a6e]">Condición</p>
            <p className="text-white">{factura.condicionPago || "—"}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[0.625rem] font-medium uppercase tracking-[0.12em] text-[#5a5a6e]">Proveedor</p>
            <p className="text-white">{factura.nombreProveedor || "—"}</p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/40 text-left">
                  <th className="px-4 py-2.5 font-medium">Producto</th>
                  <th className="px-4 py-2.5 font-medium text-right">Cantidad</th>
                  <th className="px-4 py-2.5 font-medium text-right">Precio Costo Unit.</th>
                  <th className="px-4 py-2.5 font-medium text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {detalles.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-white/30">Sin productos.</td>
                  </tr>
                )}
                {detalles.map((d) => (
                  <tr key={d.idDetalle ?? `${d.idProducto}-${d.nombreProducto}`} className="border-b border-white/5">
                    <td className="px-4 py-2.5 text-white">{d.nombreProducto || `Producto #${d.idProducto}`}</td>
                    <td className="px-4 py-2.5 text-white/70 text-right whitespace-nowrap">{Number(d.cantidad)}</td>
                    <td className="px-4 py-2.5 text-white/70 text-right whitespace-nowrap">{money(d.precioUnitario)}</td>
                    <td className="px-4 py-2.5 text-white text-right whitespace-nowrap">{money(d.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="pt-3 border-t border-white/10 flex items-end justify-between gap-3 flex-wrap">
          <div className="max-w-xs w-full space-y-1 font-mono text-sm">
            <div className="flex items-center justify-between text-white/70">
              <span className="text-[#5a5a6e]">Cant. Productos</span>
              <span>{Number(detalles.length)}</span>
            </div>
            <div className="flex items-center justify-between text-white/70">
              <span className="text-[#5a5a6e]">Total IVA</span>
              <span>{money(factura.ivaTotal)}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#5a5a6e] uppercase tracking-[0.12em]">Importe total de la compra</p>
            <p className="font-mono text-3xl font-bold tracking-tight text-[#22c55e]">{money(factura.totalGeneral)}</p>
          </div>
        </div>
      </div>
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