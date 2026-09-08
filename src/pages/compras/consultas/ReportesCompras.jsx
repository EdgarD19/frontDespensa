import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronDown, Eye, X } from "lucide-react";
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

const S = {
  field:
    "w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-white " +
    "placeholder:text-white/30 outline-none transition-colors duration-150 focus:border-[#22c55e]/50",
  eyebrow: "text-[0.625rem] font-medium uppercase tracking-[0.12em] text-[#5a5a6e]",
};

export default function ReportesCompras() {
  const [facturas, setFacturas] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [desde, setDesde] = useState(() => mesActual().desde);
  const [hasta, setHasta] = useState(() => mesActual().hasta);
  const [selProveedores, setSelProveedores] = useState(() => new Set());
  const [abiertoProveedores, setAbiertoProveedores] = useState(false);
  const [detalle, setDetalle] = useState(null);

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

  const limpiarFiltros = () => {
    const r = mesActual();
    setDesde(r.desde);
    setHasta(r.hasta);
    setSelProveedores(new Set());
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
      return true;
    });
  }, [vigentes, desde, hasta, selProveedores]);

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
            <label className={S.eyebrow} htmlFor="producto">Producto</label>
            <input
              id="producto"
              type="text"
              disabled
              placeholder="Filtrar por producto (no disponible)"
              className={`${S.field} mt-1 opacity-50 cursor-not-allowed`}
            />
          </div>
        </div>

        <div className="flex items-center justify-end">
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

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard label="Total de Compras" value={String(kpis.volumen)} accent="#22c55e" />
        <KpiCard label="Importe Total Comprado" value={money(kpis.montoTotal)} accent="#38bdf8" />
        <KpiCard label="Cantidad Total de Productos" value={String(totalUnidades)} accent="#f59e0b" />
      </div>

      {/* Listado de compras */}
      {cargando ? (
        <div className="bg-[var(--bg-card)] border border-white/5 rounded-xl p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 bg-white/10 rounded animate-pulse w-full" />
          ))}
        </div>
      ) : (
        <div className="bg-[var(--bg-card)] border border-white/5 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10">
            <h2 className="text-sm font-semibold text-white">Listado de Compras</h2>
            <p className="text-xs text-[#5a5a6e]">
              {filtradas.length} compra{filtradas.length !== 1 ? "s" : ""} según los filtros seleccionados
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/40 text-left whitespace-nowrap">
                  <th className="px-4 py-2.5 font-medium">Fecha</th>
                  <th className="px-4 py-2.5 font-medium">N° Factura</th>
                  <th className="px-4 py-2.5 font-medium">Proveedor</th>
                  <th className="px-4 py-2.5 font-medium text-right">Cant. Productos</th>
                  <th className="px-4 py-2.5 font-medium text-right">Importe Total</th>
                  <th className="px-4 py-2.5 font-medium w-12" aria-label="Acciones" />
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
                        onClick={() => setDetalle(f)}
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
            </table>
          </div>
        </div>
      )}

      {detalle && (
        <DetalleCompra factura={detalle} onClose={() => setDetalle(null)} />
      )}
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