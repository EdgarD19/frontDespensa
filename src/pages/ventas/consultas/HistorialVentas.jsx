import { useState, useEffect, useMemo, useCallback } from "react";
import { TABLE_SHELL,THEAD_ROW } from "../../../components/ui/styles";
import { Link } from "react-router-dom";
import { Search, X, Eye } from "lucide-react";
import PageHeader from "../../../components/ui/PageHeader";
import {
  getFacturasVenta,
  buscarFacturasVenta,
  getFacturasVentaPorCliente,
  getFacturaVentaById,
  apiErrorMessage,
} from "../../../api/facturasVentaApi";
import { getClientes } from "../../../api/clientesApi";
import { esAnulada, fmtFecha, fmtMoneda, diaISO } from "../common";
import SearchField from "../../../components/ui/SearchField";
import Pagination from "../../../components/ui/Pagination";

const PAGE_SIZE = 10;

// IVA de una línea = bruto − base (precio CON IVA → base + IVA), mismo criterio que el back.
const ivaLineaDetalle = (d) => {
  const t = Number(d.tasaIva);
  if (!t) return 0;
  const bruto = Math.round((Number(d.cantidad) || 0) * (Number(d.precioUnitario) || 0));
  return Math.round(bruto - bruto / (1 + t / 100));
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

const estadoVenta = (f) => {
  if (esAnulada(f)) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap bg-red-500/15 text-red-400">
        Anulada
      </span>
    );
  }
  // El estado del back es "EMITIDA" para toda factura no anulada; en el historial
  // se muestra "Vigente" para que coincida con el filtro (Vigentes / Anuladas).
  return (
    <span className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap bg-[var(--accent-dim)] text-[var(--accent)]">
      Vigente
    </span>
  );
};

export default function HistorialVentas() {
  const [filas, setFilas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Paginación REAL: la lleva el back (page/pageSize/totalPages).
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  const [clientes, setClientes] = useState([]);
  const [idCliente, setIdCliente] = useState("");
  const [texto, setTexto] = useState("");
  // El texto se busca en el back (debounce); fechas y estado se filtran acá
  // porque el back todavía no los soporta en el listado.
  const [textoQuery, setTextoQuery] = useState("");
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

  // Debounce del texto (la búsqueda es server-side).
  useEffect(() => {
    const t = setTimeout(() => setTextoQuery(texto), 300);
    return () => clearTimeout(t);
  }, [texto]);

  // Reinicia a la primera página cuando cambian los filtros server-side.
  useEffect(() => { setPage(0); }, [textoQuery, idCliente]);

  // Endpoint server-side según filtros: texto → /buscar; cliente → /cliente/{id};
  // sin filtros → listado paginado. (Back: GET paginado con page/pageSize.
  // OJO: el back espera "pageSize"; un "size" suelto se ignora.)
  // ⚠️ BUG CONOCIDO DEL BACK: /buscar matchea solo por cliente — las facturas
  // "Sin Nombre" no aparecen por N° (JOIN implícito a cliente en el repositorio).
  // El arreglo correcto está en FacturaVentaRepository (informe al equipo del back).
  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const base = { page, pageSize: PAGE_SIZE, sortDir: "DESC" };
      const q = textoQuery.trim();
      const res = q
        ? await buscarFacturasVenta(q, base)
        : idCliente
          ? await getFacturasVentaPorCliente(idCliente, base)
          : await getFacturasVenta(base);
      setFilas(Array.isArray(res.content) ? res.content : []);
      setTotalPages(Math.max(1, res.totalPages ?? 1));
      setTotalElements(Number(res.totalElements ?? res.content?.length ?? 0));
    } catch (err) {
      setError(apiErrorMessage(err) || "Error al cargar las facturas de venta");
    } finally {
      setLoading(false);
    }
  }, [page, textoQuery, idCliente]);

  useEffect(() => { cargar(); }, [cargar]);

  // Filtros del back NO disponibles (fecha y estado): se refina la página actual.
  const filtradas = useMemo(() => {
    const d = (desde || "").trim();
    const h = (hasta || "").trim();
    return filas.filter((f) => {
      if (estado === "VIGENTES" && esAnulada(f)) return false;
      if (estado === "ANULADAS" && !esAnulada(f)) return false;
      if (d || h) {
        const fecha = diaISO(f.fechaEmision || f.fechaCreacion);
        if (d && fecha < d) return false;
        if (h && fecha > h) return false;
      }
      return true;
    });
  }, [filas, estado, desde, hasta]);

  // Cuando activan filtros locales escondí filas de la página: el "Mostrando"
  // del paginado deja de ser exacto → solo se informa si no hay filtro local.
  const hayFiltroLocal = !!(estado || desde || hasta);
  const paginadas = filtradas;

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
      <PageHeader
        backTo="/ventas"
        backLabel="Volver a ventas"
        title="Historial de ventas"
      />

      {/* Filtros */}
      <div className="flex flex-col md:flex-row md:flex-wrap md:items-end gap-3">
        <SearchField
          value={texto}
          onChange={setTexto}
          placeholder="Buscar por N° de factura o cliente"
          ariaLabel="Buscar por número de factura, timbrado o cliente"
          wrapperClass="relative flex-1 min-w-[200px]"
        />
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
      <div className={TABLE_SHELL}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={THEAD_ROW + " whitespace-nowrap"}>
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
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-white/10 rounded-none animate-pulse w-3/4" /></td>
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
                    <td className="px-4 py-3 text-white font-medium text-right whitespace-nowrap">{fmtMoneda(totalFactura(f))}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => verDetalle(f)}
                        className="p-1.5 rounded-none text-white/40 hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors"
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
          pageSize={PAGE_SIZE}
          // Con filtro de fecha/estado (refinado local) el total del back ya no
          // describe lo que se ve: se oculta el rango "Mostrando x–y de z".
          totalItems={hayFiltroLocal ? undefined : totalElements}
        />
      )}
      {hayFiltroLocal && paginadas.length === 0 && !loading && (
        <p className="text-xs text-white/40 text-center">
          Los filtros de fecha y estado se aplican sobre la página actual (el back
          todavía no los soporta en el listado). Probá limpiarlos si no ves resultados.
        </p>
      )}

      {seleccionada && (
        <DetalleFacturaVenta factura={seleccionada} cargando={cargandoDetalle} onClose={() => setSeleccionada(null)} />
      )}
    </div>
  );
}

const TH = "sticky top-0 z-10 bg-[#0c0c0e] border-b border-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]";

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
              className="-mr-2 -mt-1 rounded-none p-2 text-white/50 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/60"
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
                      <span className="inline-block h-4 w-16 bg-white/10 rounded-none animate-pulse align-middle mr-2" />
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
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-white/80">{fmtMoneda(d.precioUnitario)}</td>
                    <td className="px-4 py-3 text-center">
                      <TasaBadge tasa={Number(d.tasaIva)} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-white/80">
                      {Number(d.tasaIva) ? fmtMoneda(ivaLineaDetalle(d)) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums text-white">
                      {fmtMoneda(Math.round(Number(d.cantidad) * Number(d.precioUnitario)))}
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
                  <span className="text-white/40">5%: </span>{fmtMoneda(iva5)}
                </span>
              )}
              {iva10 > 0 && (
                <span className="text-white/70">
                  <span className="text-white/40">10%: </span>{fmtMoneda(iva10)}
                </span>
              )}
              <span className="text-white/90 font-semibold">
                <span className="text-white/40">Total IVA: </span>{fmtMoneda(ivaTotal)}
              </span>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-[0.625rem] font-medium uppercase tracking-[0.12em] text-white/50">Total factura</p>
              <p className="text-xl font-semibold tabular-nums text-[var(--accent)]">{fmtMoneda(totalFactura(factura))}</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}