import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, X, Eye, ArrowLeft } from "lucide-react";
import {
  getFacturasCompra,
  apiErrorMessage,
} from "../../../api/facturasCompraApi";
import { getProveedores } from "../../../api/proveedoresApi";

const money = (n) => {
  const v = Number(n);
  return Number.isFinite(v) ? `₲ ${v.toLocaleString("es-PY", { maximumFractionDigits: 0 })}` : "—";
};

const pageBtn = "px-2 py-1 rounded text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors text-sm";

const fmtFecha = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString("es-PY", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const fmtFechaHora = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString("es-PY", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const condicionPago = (c) => {
  const label = c === "CONTADO" ? "Contado" : c === "TRANSFERENCIA" ? "Transferencia" : c === "CREDITO" ? "Crédito" : (c || "—");
  const cls = c === "CONTADO"
    ? "bg-[#22c55e]/15 text-[#22c55e]"
    : c === "TRANSFERENCIA"
      ? "bg-sky-500/15 text-sky-400"
      : c === "CREDITO"
        ? "bg-amber-500/15 text-amber-400"
        : "bg-white/10 text-[#8b8b9e]";
  return <span className={`text-xs px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
};

export default function ListaFacturas() {
  const [todas, setTodas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [proveedores, setProveedores] = useState([]);
  const [idProveedor, setIdProveedor] = useState("");
  const [texto, setTexto] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [condicion, setCondicion] = useState("");
  const [seleccionada, setSeleccionada] = useState(null);

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
      setLoading(true);
      setError(null);
      try {
        const res = await getFacturasCompra({ page: 0, pageSize: 1000 });
        if (activo) setTodas(Array.isArray(res.content) ? res.content : []);
      } catch (err) {
        if (activo) setError(apiErrorMessage(err) || "Error al cargar facturas");
      } finally {
        if (activo) setLoading(false);
      }
    })();
    return () => { activo = false; };
  }, []);

  const filtradas = useMemo(() => {
    const q = texto.trim().toLowerCase();
    const d = (desde || "").trim();
    const h = (hasta || "").trim();
    return todas.filter((f) => {
      if (idProveedor && Number(f.idProveedor) !== Number(idProveedor)) return false;
      if (q) {
        const hito = String(f.numeroFactura || "").toLowerCase();
        if (!hito.includes(q)) return false;
      }
      if (condicion && String(f.condicionPago || "") !== condicion) return false;
      if (d || h) {
        const fecha = String(f.fechaEmision || "").slice(0, 10);
        if (d && fecha < d) return false;
        if (h && fecha > h) return false;
      }
      return true;
    });
  }, [todas, idProveedor, texto, condicion, desde, hasta]);

  const paginadas = useMemo(() => filtradas.slice(page * 10, page * 10 + 10), [filtradas, page]);

  useEffect(() => { setPage(0); }, [idProveedor, texto, condicion, desde, hasta]);
  useEffect(() => { setTotalPages(Math.max(1, Math.ceil(filtradas.length / 10))); }, [filtradas]);

  const columns = 8;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/compras/consultas" className="p-2 rounded-lg hover:bg-white/10 text-white/50 transition-colors" aria-label="Volver">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-[#f1f1f3] tracking-tight">Lista de Facturas Registradas</h1>
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
            placeholder="Buscar por N° factura"
            aria-label="Buscar por número de factura"
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-10 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#22c55e]/50 transition-colors"
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
          <label className="text-[0.625rem] font-medium uppercase tracking-[0.12em] text-[#5a5a6e]" htmlFor="filtro-desde">
            Desde
          </label>
          <input
            id="filtro-desde"
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#22c55e]/50 transition-colors"
          />
        </div>
        <div className="w-full sm:w-44">
          <label className="text-[0.625rem] font-medium uppercase tracking-[0.12em] text-[#5a5a6e]" htmlFor="filtro-hasta">
            Hasta
          </label>
          <input
            id="filtro-hasta"
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#22c55e]/50 transition-colors"
          />
        </div>
        <div className="w-full sm:w-44">
          <label className="text-[0.625rem] font-medium uppercase tracking-[0.12em] text-[#5a5a6e]" htmlFor="filtro-condicion">
            Condición de Pago
          </label>
          <select
            id="filtro-condicion"
            value={condicion}
            onChange={(e) => setCondicion(e.target.value)}
            className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#22c55e]/50 transition-colors"
          >
            <option value="">Todas</option>
            <option value="CONTADO">Contado</option>
            <option value="CREDITO">Crédito</option>
          </select>
        </div>
        <div className="w-full sm:w-64">
          <label className="text-[0.625rem] font-medium uppercase tracking-[0.12em] text-[#5a5a6e]" htmlFor="filtro-proveedor">
            Proveedor
          </label>
          <select
            id="filtro-proveedor"
            value={idProveedor}
            onChange={(e) => setIdProveedor(e.target.value)}
            className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#22c55e]/50 transition-colors"
          >
            <option value="">Todos los proveedores</option>
            {proveedores.map((p) => (
              <option key={p.id ?? p.idProveedor} value={p.id ?? p.idProveedor}>{p.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm px-4 py-3">{error}</div>
      )}

      {/* Tabla */}
      <div className="bg-[var(--bg-card)] border border-white/5 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-white/40 text-left whitespace-nowrap">
                <th className="px-4 py-3 font-medium">Fecha Emisión</th>
                <th className="px-4 py-3 font-medium">Fecha Registro</th>
                <th className="px-4 py-3 font-medium">Proveedor</th>
                <th className="px-4 py-3 font-medium">N° Factura</th>
                <th className="px-4 py-3 font-medium">N° Timbrado</th>
                <th className="px-4 py-3 font-medium">Condición</th>
                <th className="px-4 py-3 font-medium text-right">Monto Total</th>
                <th className="px-4 py-3 font-medium w-12" aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-white/5">
                  {Array.from({ length: columns }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-white/10 rounded animate-pulse w-3/4" /></td>
                  ))}
                </tr>
              ))}
              {!loading && paginadas.length === 0 && (
                <tr><td colSpan={columns} className="px-4 py-8 text-center text-white/30">
                  {texto.trim()
                    ? `No se encontraron facturas para "${texto.trim()}".`
                    : "No se encontraron facturas."}
                </td></tr>
              )}
              {!loading && paginadas.map((f) => {
                const cancelada = f.estado === "CANCELADA" || f.activo === false;
                return (
                  <tr key={f.idFactura} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${cancelada ? "opacity-60" : ""}`}>
                    <td className="px-4 py-3 text-white whitespace-nowrap">{fmtFecha(f.fechaEmision)}</td>
                    <td className="px-4 py-3 text-white/70 whitespace-nowrap">{fmtFechaHora(f.fechaCreacion)}</td>
                    <td className="px-4 py-3 text-white">{f.nombreProveedor || "—"}</td>
                    <td className="px-4 py-3 text-white/70 whitespace-nowrap">{f.numeroFactura || "—"}</td>
                    <td className="px-4 py-3 text-white/70 whitespace-nowrap">{f.numeroTimbrado || "—"}</td>
                    <td className="px-4 py-3">{condicionPago(f.condicionPago)}</td>
                    <td className="px-4 py-3 text-white font-medium text-right whitespace-nowrap">{money(f.totalGeneral)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSeleccionada(f)}
                        className="p-1.5 rounded text-white/40 hover:text-[var(--accent-green)] hover:bg-[var(--accent-green)]/10 transition-colors"
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
        <div className="flex items-center justify-center gap-1 text-sm select-none">
          <button disabled={page <= 0} onClick={() => setPage(0)} className={pageBtn} title="Primera página">
            &laquo;
          </button>
          <button disabled={page <= 0} onClick={() => setPage(page - 1)} className={pageBtn} title="Página anterior">
            &lsaquo;
          </button>
          <span className="px-3 text-white/50">Página {page + 1} de {totalPages}</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className={pageBtn} title="Página siguiente">
            &rsaquo;
          </button>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)} className={pageBtn} title="Última página">
            &raquo;
          </button>
        </div>
      )}

      {seleccionada && (
        <DetalleFactura factura={seleccionada} onClose={() => setSeleccionada(null)} />
      )}
    </div>
  );
}

function DetalleFactura({ factura, onClose }) {
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
            <div>{condicionPago(factura.condicionPago)}</div>
          </div>
          <div className="space-y-0.5">
            <p className="text-[0.625rem] font-medium uppercase tracking-[0.12em] text-[#5a5a6e]">Total</p>
            <p className="text-white font-semibold">{money(factura.totalGeneral)}</p>
          </div>
        </div>

        {/* Productos */}
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
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-white/30">Sin productos.</td></tr>
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

        {/* Totales + Desglose de IVA */}
        <div className="pt-3 border-t border-white/10 grid gap-4 sm:grid-cols-3 items-end">
          <div className="space-y-1.5">
            <p className="text-sm text-[#5a5a6e]">
              {detalles.length} ítem{detalles.length === 1 ? "" : "s"} en el
              comprobante
            </p>
            <div className="space-y-1 font-mono text-sm">
              <div className="flex items-center justify-between text-white/70">
                <span className="text-[#5a5a6e]">Exentas:</span>
                <span>{money(f.subtotalExento ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between text-white/70">
                <span className="text-[#5a5a6e]">IVA 5%:</span>
                <span>{money(factura.iva5)}</span>
              </div>
              <div className="flex items-center justify-between text-white/70">
                <span className="text-[#5a5a6e]">IVA 10%:</span>
                <span>{money(factura.iva10)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 font-mono text-sm">
            <div className="flex items-center justify-between text-white/90">
              <span className="text-[#5a5a6e]">Total IVA:</span>
              <span className="font-semibold">{money(factura.ivaTotal)}</span>
            </div>
            <div className="flex items-center justify-between text-white/90 border-t border-white/10 pt-1.5">
              <span className="text-[#5a5a6e]">Subtotal:</span>
              <span>{money(Number(factura.totalGeneral) - Number(factura.ivaTotal))}</span>
            </div>
          </div>

          <div className="flex flex-col items-end justify-end gap-3">
            <div className="text-right">
              <p className="text-xs text-[#5a5a6e] uppercase tracking-[0.12em]">
                Total factura
              </p>
              <p className="font-mono text-3xl font-bold tracking-tight text-[#22c55e]">
                {money(factura.totalGeneral)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}