import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { Search, X, Eye, ArrowLeft } from "lucide-react";
import {
  getFacturasVenta,
  getFacturaVentaById,
  apiErrorMessage,
} from "../../../api/facturasVentaApi";
import { getClientes } from "../../../api/clientesApi";
import Pagination from "../../../components/ui/Pagination";

const money = (n) => {
  const v = Number(n);
  return Number.isFinite(v) ? `₲ ${v.toLocaleString("es-PY", { maximumFractionDigits: 0 })}` : "—";
};

// Total que paga el cliente: el back es dueño del totalGeneral (precio de venta CON IVA incluido).
// Si no viniera, se recalcula desde los detalles (cantidad × precioUnitario).
const totalFactura = (f) => {
  if (f?.totalGeneral != null && Number(f.totalGeneral) > 0) return Number(f.totalGeneral);
  if (Array.isArray(f?.detalles) && f.detalles.length > 0) {
    return f.detalles.reduce(
      (s, d) => s + Math.round((Number(d.cantidad) || 0) * (Number(d.precioUnitario) || 0)),
      0
    );
  }
  return 0;
};

// IVA de una línea = bruto − base (precio CON IVA → base + IVA), mismo criterio que el back.
const ivaLineaDetalle = (d) => {
  const t = Number(d.tasaIva);
  if (!t) return 0;
  const bruto = Math.round((Number(d.cantidad) || 0) * (Number(d.precioUnitario) || 0));
  return Math.round(bruto - bruto / (1 + t / 100));
};

const fmtFecha = (iso) => {
  if (!iso) return "—";
  const s = String(iso);
  // Fecha sin hora (yyyy-MM-dd): interpretarla como LOCAL para no correr el día
  // (new Date("2026-10-11") es UTC y en America/Asuncion muestra 10/10/2026).
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00`) : new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("es-PY", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const esAnulada = (f) => {
  const raw = String(f?.estado || "").toUpperCase();
  return raw === "ANULADO" || raw === "ANULADA" || raw === "CANCELADA" || f?.activo === false;
};

const estadoVenta = (f) => {
  if (esAnulada(f)) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap bg-rose-500/15 text-rose-400">
        Anulada
      </span>
    );
  }
  const raw = String(f?.estado || "").toUpperCase();
  return (
    <span className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap bg-emerald-500/15 text-emerald-400">
      {raw ? raw.charAt(0) + raw.slice(1).toLowerCase() : "Vigente"}
    </span>
  );
};

export default function HistorialVentas() {
  const [todas, setTodas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [clientes, setClientes] = useState([]);
  const [idCliente, setIdCliente] = useState("");
  const [texto, setTexto] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [estado, setEstado] = useState("");
  const [seleccionada, setSeleccionada] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const res = await getClientes({ pageSize: 500, sortBy: "firstName", sortDir: "ASC" });
        if (activo) setClientes(Array.isArray(res?.data?.content) ? res.data.content : (Array.isArray(res?.data) ? res.data : []));
      } catch { /* sin clientes */ }
    })();
    return () => { activo = false; };
  }, []);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getFacturasVenta({ page: 0, pageSize: 1000, sortDir: "DESC" });
      setTodas(Array.isArray(res.content) ? res.content : []);
    } catch (err) {
      setError(apiErrorMessage(err) || "Error al cargar las facturas de venta");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const filtradas = useMemo(() => {
    const q = texto.trim().toLowerCase();
    const d = (desde || "").trim();
    const h = (hasta || "").trim();
    return todas
      .filter((f) => {
        if (estado === "VIGENTES" && esAnulada(f)) return false;
        if (estado === "ANULADAS" && !esAnulada(f)) return false;
        if (idCliente && Number(f.idCliente) !== Number(idCliente)) return false;
        if (q) {
          const hito = `${f.numeroFactura || ""} ${f.numeroTimbrado || ""} ${f.nombreCliente || ""}`.toLowerCase();
          if (!hito.includes(q)) return false;
        }
        if (d || h) {
          const fecha = String(f.fechaEmision || f.fechaCreacion || "").slice(0, 10);
          if (d && fecha < d) return false;
          if (h && fecha > h) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const fa = String(a.fechaEmision || a.fechaCreacion || "");
        const fb = String(b.fechaEmision || b.fechaCreacion || "");
        if (fa !== fb) return fa < fb ? 1 : -1;
        return String(b.numeroFactura || "").localeCompare(String(a.numeroFactura || ""));
      });
  }, [todas, idCliente, texto, desde, hasta, estado]);

  const paginadas = useMemo(() => filtradas.slice(page * 10, page * 10 + 10), [filtradas, page]);

  useEffect(() => { setPage(0); }, [idCliente, texto, desde, hasta, estado]);
  useEffect(() => { setTotalPages(Math.max(1, Math.ceil(filtradas.length / 10))); }, [filtradas]);

  async function verDetalle(f) {
    setSeleccionada(f);
    setCargandoDetalle(true);
    try {
      const res = await getFacturaVentaById(f.idFacturaVenta);
      const detalle = res?.data ?? res;
      if (detalle?.idFacturaVenta) setSeleccionada(detalle);
    } catch {
      /* si falla, se mantiene la fila del listado (ya trae detalles) */
    } finally {
      setCargandoDetalle(false);
    }
  }

  const columns = 6;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/ventas" className="p-2 rounded-none hover:bg-white/10 text-white/50 transition-colors" aria-label="Volver">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Historial de Ventas</h1>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row md:flex-wrap md:items-end gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
          <input
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Buscar por N° factura, timbrado o cliente"
            aria-label="Buscar por número de factura, timbrado o cliente"
            className="w-full bg-white/5 border border-white/10 rounded-none pl-9 pr-10 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
          {texto && (
            <button
              type="button"
              onClick={() => setTexto("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              title="Limpiar búsqueda"
              aria-label="Limpiar búsqueda"
            >
              <X size={15} />
            </button>
          )}
        </div>
        <div className="w-full sm:w-44">
          <label className="text-[0.625rem] font-medium uppercase tracking-[0.12em] text-white/40" htmlFor="filtro-desde">
            Desde
          </label>
          <input
            id="filtro-desde"
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="w-full mt-1 bg-white/5 border border-white/10 rounded-none px-3 py-2 text-sm text-white outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>
        <div className="w-full sm:w-44">
          <label className="text-[0.625rem] font-medium uppercase tracking-[0.12em] text-white/40" htmlFor="filtro-hasta">
            Hasta
          </label>
          <input
            id="filtro-hasta"
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="w-full mt-1 bg-white/5 border border-white/10 rounded-none px-3 py-2 text-sm text-white outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>
        <div className="w-full sm:w-44">
          <label className="text-[0.625rem] font-medium uppercase tracking-[0.12em] text-white/40" htmlFor="filtro-estado">
            Estado
          </label>
          <select
            id="filtro-estado"
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className="w-full mt-1 bg-white/5 border border-white/10 rounded-none px-3 py-2 text-sm text-white outline-none focus:border-[var(--accent)] transition-colors"
          >
            <option value="">Todos</option>
            <option value="VIGENTES">Vigentes</option>
            <option value="ANULADAS">Anuladas</option>
          </select>
        </div>
        <div className="w-full sm:w-64">
          <label className="text-[0.625rem] font-medium uppercase tracking-[0.12em] text-white/40" htmlFor="filtro-cliente">
            Cliente
          </label>
          <select
            id="filtro-cliente"
            value={idCliente}
            onChange={(e) => setIdCliente(e.target.value)}
            className="w-full mt-1 bg-white/5 border border-white/10 rounded-none px-3 py-2 text-sm text-white outline-none focus:border-[var(--accent)] transition-colors"
          >
            <option value="">Todos los clientes</option>
            {clientes.map((c) => (
              <option key={c.idCliente ?? c.id} value={c.idCliente ?? c.id}>
                {[c.nombre, c.apellido].filter(Boolean).join(" ")}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-none border border-red-500/30 bg-red-500/10 text-red-400 text-sm px-4 py-3">{error}</div>
      )}

      {/* Tabla */}
      <div className="overflow-hidden border border-white/10 bg-[#0c0c0e]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-emerald-500/10 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300 whitespace-nowrap">
                <th className="px-4 py-3 font-medium">Fecha Emisión</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">N° Factura</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium text-right">Monto Total</th>
                <th className="px-4 py-3 font-medium w-12" aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-white/10 last:border-0 transition hover:bg-white/[0.04]">
                  {Array.from({ length: columns }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-white/10 rounded animate-pulse w-3/4" /></td>
                  ))}
                </tr>
              ))}
              {!loading && paginadas.length === 0 && (
                <tr><td colSpan={columns} className="px-4 py-8 text-center text-white/30">
                  {texto.trim() || idCliente || desde || hasta || estado
                    ? "No se encontraron ventas con los filtros aplicados."
                    : "Aún no hay ventas registradas."}
                </td></tr>
              )}
              {!loading && paginadas.map((f) => {
                const anulada = esAnulada(f);
                return (
                  <tr key={f.idFacturaVenta} className={`border-b border-white/10 last:border-0 hover:bg-white/[0.04] transition-colors ${anulada ? "opacity-60" : ""}`}>
                    <td className="px-4 py-3 text-white/70 whitespace-nowrap">{fmtFecha(f.fechaEmision || f.fechaCreacion)}</td>
                    <td className="px-4 py-3 text-white">{f.nombreCliente || "Sin Nombre"}</td>
                    <td className="px-4 py-3 text-white/70 whitespace-nowrap">{f.numeroFactura || "—"}</td>
                    <td className="px-4 py-3">{estadoVenta(f)}</td>
                    <td className="px-4 py-3 text-white font-medium text-right whitespace-nowrap">{money(totalFactura(f))}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => verDetalle(f)}
                        className="p-1.5 rounded text-white/40 hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors"
                        title="Ver detalle" aria-label="Ver detalle"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {!loading && paginadas.length > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          pageSize={10}
          totalItems={filtradas.length}
        />
      )}

      {seleccionada && (
        <DetalleFacturaVenta factura={seleccionada} cargando={cargandoDetalle} onClose={() => setSeleccionada(null)} />
      )}
    </div>
  );
}

const TH = "sticky top-0 z-10 bg-[#0c0c0e] border-b border-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-300";

function Dato({ titulo, children }) {
  return (
    <div>
      <dt className="text-xs text-white/50">{titulo}</dt>
      <dd className="mt-1 text-sm font-medium text-white">{children}</dd>
    </div>
  );
}

function TasaBadge({ tasa }) {
  const t = Number(tasa) || 0;
  return (
    <span
      className={`inline-flex min-w-14 justify-center rounded-none px-2 py-0.5 text-xs font-medium ${
        t ? "bg-white/10 text-white/90" : "border border-white/20 text-white/70"
      }`}
    >
      {t ? `${t}%` : "Exenta"}
    </span>
  );
}

function DetalleFacturaVenta({ factura, cargando = false, onClose }) {
  const detalles = Array.isArray(factura.detalles) ? factura.detalles : [];

  // Desglose calculado por tasa; el back manda iva5/iva10/ivaTotal/totalGeneral como fuente autoritativa.
  const desglose = detalles.reduce(
    (acc, d) => {
      const t = Number(d.tasaIva);
      const bruto = Math.round(Number(d.cantidad || 0) * Number(d.precioUnitario || 0));
      const ivaLinea = t > 0 ? Math.round(bruto - bruto / (1 + t / 100)) : 0;
      (acc[t] || (acc[t] = { subtotal: 0, iva: 0 })).subtotal += bruto - ivaLinea;
      if (t > 0) acc[t].iva += ivaLinea;
      acc.totales.total += bruto;
      acc.totales.iva += ivaLinea;
      return acc;
    },
    { 0: { subtotal: 0, iva: 0 }, 5: { subtotal: 0, iva: 0 }, 10: { subtotal: 0, iva: 0 }, totales: { total: 0, iva: 0 } },
  );

  const iva5 = factura.iva5 != null ? Number(factura.iva5) : desglose[5].iva;
  const iva10 = factura.iva10 != null ? Number(factura.iva10) : desglose[10].iva;
  const ivaTotal = factura.ivaTotal != null ? Number(factura.ivaTotal) : desglose.totales.iva;

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    const overflowPrevio = document.body.style.overflow;
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflowPrevio;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="factura-venta-detalle-titulo"
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden border border-white/10 bg-[#0c0c0e] shadow-2xl"
      >
        {/* Cabecera */}
        <header className="flex items-start justify-between gap-4 px-6 pt-6">
          <h2 id="factura-venta-detalle-titulo" className="text-lg font-semibold text-white">
            Factura {factura.numeroFactura || "—"}
          </h2>
          <div className="flex items-center gap-3">
            <p className="rounded-none border border-white/15 bg-white/5 px-2.5 py-1 text-sm font-medium text-white/80">
              {factura.nombreCliente || "Sin Nombre"}
            </p>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="-mr-2 -mt-1 rounded-none p-2 text-white/50 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]/60"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        <dl className="grid grid-cols-2 gap-4 px-6 py-5 sm:grid-cols-3">
          <Dato titulo="Fecha de emisión">{fmtFecha(factura.fechaEmision)}</Dato>
          <Dato titulo="N° de timbrado">{factura.numeroTimbrado || "—"}</Dato>
          <Dato titulo="Estado">{estadoVenta(factura)}</Dato>
        </dl>

        {/* Ítems: solo esta zona scrollea, cabecera y pie quedan fijos */}
        <section className="flex min-h-0 flex-1 flex-col px-6 pb-5">
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="text-sm font-medium text-white">Productos ({detalles.length})</h3>
            <p className="text-xs text-white/50">Montos con IVA incluido</p>
          </div>

          <div className="min-h-0 flex-1 overflow-auto border border-white/10 bg-[#0c0c0e]">
            <table className="w-full min-w-[34rem] text-sm">
              <thead>
                <tr>
                  <th scope="col" className={`${TH} text-left`}>Producto</th>
                  <th scope="col" className={`${TH} text-right`}>Cant.</th>
                  <th scope="col" className={`${TH} text-right`}>Precio venta unit.</th>
                  <th scope="col" className={`${TH} text-center`}>Tasa</th>
                  <th scope="col" className={`${TH} text-right`}>IVA</th>
                  <th scope="col" className={`${TH} text-right`}>Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {cargando && detalles.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-white/30">
                      <span className="inline-block h-4 w-16 bg-white/10 rounded animate-pulse align-middle mr-2" />
                      Cargando productos…
                    </td>
                  </tr>
                )}
                {!cargando && detalles.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-white/30">Sin productos.</td></tr>
                )}
                {detalles.map((d) => (
                  <tr key={d.idDetalle ?? `${d.idProducto}-${d.nombreProducto}`} className="border-b border-white/10 last:border-0 transition hover:bg-white/[0.04]">
                    <td className="px-4 py-3 font-medium text-white">{d.nombreProducto || `Producto #${d.idProducto}`}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-white/80">{Number(d.cantidad)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-white/80">{money(d.precioUnitario)}</td>
                    <td className="px-4 py-3 text-center">
                      <TasaBadge tasa={Number(d.tasaIva)} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-white/80">
                      {Number(d.tasaIva) ? money(ivaLineaDetalle(d)) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums text-white">
                      {money(Math.round(Number(d.cantidad) * Number(d.precioUnitario)))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Liquidación de IVA + Total factura */}
        <footer className="border-t border-white/10 bg-white/[0.02] px-6 py-4">
          <div className="flex items-center justify-between gap-6">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-sm">
              <span className="border border-white/15 bg-white/5 px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-white/80">Liquidación IVA</span>
              {iva5 > 0 && (
                <span className="text-white/70">
                  <span className="text-white/40">5%: </span>{money(iva5)}
                </span>
              )}
              {iva10 > 0 && (
                <span className="text-white/70">
                  <span className="text-white/40">10%: </span>{money(iva10)}
                </span>
              )}
              <span className="text-white/90 font-semibold">
                <span className="text-white/40">Total IVA: </span>{money(ivaTotal)}
              </span>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-[0.625rem] font-medium uppercase tracking-[0.12em] text-white/50">Total factura</p>
              <p className="text-xl font-semibold tabular-nums text-[var(--accent)]">{money(totalFactura(factura))}</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}