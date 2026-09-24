import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { Plus, XCircle, PenLine, Trash2, X, Search, PackageCheck, ArrowLeft } from "lucide-react";
import {
  getPedidos,
  getPedido,
  getPedidoParaRecibir,
  crearPedido,
  modificarPedido,
  cancelarPedido,
  apiErrorMessage,
} from "../../../../api/comprasApi";
import { getProveedores } from "../../../../api/proveedoresApi";
import { getProductos } from "../../../../api/productosApi";
import RecepcionPedidoModal from "../recepcion/RecepcionPedidoModal";
import Pagination from "../../../../components/ui/Pagination";

const ESTADOS = ["solicitado", "recibido", "cancelado"];

/* ───────────── Helpers ───────────── */

const fmtFecha = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString("es-PY", { day: "2-digit", month: "2-digit", year: "numeric" });
};

function normEstado(e) {
  if (!e) return "solicitado";
  const v = String(e).toLowerCase();
  if (v === "recibida" || v === "recibido") return "recibido";
  if (v === "cancelado" || v === "cancelada") return "cancelado";
  return "solicitado";
}

// Clases completas para que Tailwind las detecte.
const ESTADO_STYLES = {
  solicitado: { label: "Solicitado", badge: "bg-amber-500/10 text-amber-300", dot: "bg-amber-400" },
  recibido: { label: "Recibido", badge: "bg-emerald-500/10 text-emerald-400", dot: "bg-emerald-400" },
  cancelado: { label: "Cancelado", badge: "bg-red-500/10 text-red-400", dot: "bg-red-400" },
};

function EstadoBadge({ estado }) {
  const s = ESTADO_STYLES[normEstado(estado)];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${s.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

const thClass =
  "px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300";

const actionBase = "flex h-8 w-8 items-center justify-center rounded-lg transition-colors";

const fieldClass =
  "w-full rounded-lg border border-[#2a2a32] bg-[#0d0d0f] px-3 py-2.5 text-sm text-[#f1f1f3] " +
  "placeholder:text-[#4a4a5a] outline-none transition focus:border-[#22c55e]/60 focus:ring-2 focus:ring-[#22c55e]/15";

/* ───────────── Página ───────────── */

export default function PedidosABM() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sinBackend, setSinBackend] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalPedidos, setTotalPedidos] = useState(0);

  const [modal, setModal] = useState(false);     // false | "crear" | "editar"
  const [pedidoSel, setPedidoSel] = useState(null);
  const [recibirSel, setRecibirSel] = useState(null);
  const [cancelarSel, setCancelarSel] = useState(null);
  const [cancelando, setCancelando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [proveedores, setProveedores] = useState([]);
  const [prodSearch, setProdSearch] = useState("");
  const [prodResults, setProdResults] = useState([]);
  const [prodPage, setProdPage] = useState(0);
  const [prodTotalPages, setProdTotalPages] = useState(0);
  const [prodTotalItems, setProdTotalItems] = useState(0);
  const [showProd, setShowProd] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPedidos({ estado: filtroEstado || undefined, page, pageSize: 15 });
      setPedidos(res.content);
      setTotalPages(res.totalPages);
      setTotalPedidos(typeof res.totalElements === "number" ? res.totalElements : 0);
      setSinBackend(false);
    } catch (err) {
      setError(apiErrorMessage(err) || "No se pudieron cargar los pedidos");
      setPedidos([]);
      setTotalPages(0);
      setTotalPedidos(0);
      setSinBackend(true);
    } finally {
      setLoading(false);
    }
  }, [filtroEstado, page]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    (async () => {
      try {
        const p = await getProveedores({ pageSize: 100 });
        const list = p?.content || p?.data?.content || p || [];
        setProveedores(list.filter((x) => x.activo !== false));
      } catch {
        setProveedores([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!showProd) { setProdResults([]); return; }
    setProdTotalPages(0);
    setProdTotalItems(0);
    const t = setTimeout(async () => {
      try {
        const res = await getProductos({ search: prodSearch || undefined, page: prodPage, pageSize: 8 });
        setProdResults(res.content || []);
        setProdTotalPages(res.totalPages ?? 0);
        setProdTotalItems(typeof res.totalElements === "number" ? res.totalElements : 0);
      } catch { setProdResults([]); }
    }, prodSearch.length > 0 ? 350 : 0);
    return () => clearTimeout(t);
  }, [prodSearch, showProd, prodPage]);

  function abrirCrear() {
    setPedidoSel(null);
    setModal("crear");
    setError(null);
  }

  async function abrirEditar(id) {
    try {
      const data = await getPedido(id);
      setPedidoSel(data);
      setModal("editar");
      setError(null);
    } catch (err) {
      setError(apiErrorMessage(err) || "No se pudo cargar el pedido");
    }
  }

  async function confirmarCancelar() {
    if (!cancelarSel) return;
    setCancelando(true);
    setError(null);
    try {
      await cancelarPedido(cancelarSel.idPedido);
      setCancelarSel(null);
      await cargar();
    } catch (err) {
      setError(apiErrorMessage(err) || "No se pudo cancelar el pedido");
    } finally {
      setCancelando(false);
    }
  }

  async function abrirRecepcion(p) {
    setError(null);
    try {
      const data = await getPedidoParaRecibir(p.idPedido);
      setRecibirSel(data);
    } catch (err) {
      setError(apiErrorMessage(err) || "No se pudo cargar el pedido para recepcionar");
    }
  }

  const filas = loading ? [] : pedidos;

  return (
    <div className="space-y-5">

      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <Link to="/compras" className="rounded-lg p-2 text-white/50 transition-colors hover:bg-white/10" aria-label="Volver">
          <ArrowLeft size={18} />
        </Link>
        <div className="space-y-0.5">
          <h1 className="text-2xl font-semibold tracking-tight text-[#f1f1f3]">Pedidos</h1>
          <p className="text-sm text-[#5a5a6e]">Seguimiento de pedidos a proveedores</p>
        </div>
      </div>

      {error && !sinBackend && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      {/* Barra superior: filtro de estado + acción principal */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por estado">
          {[{ value: "", label: "Todos" }, ...ESTADOS.map((e) => ({ value: e, label: ESTADO_STYLES[e].label }))].map((opt) => {
            const activo = filtroEstado === opt.value;
            return (
              <button
                key={opt.value || "todos"}
                type="button"
                aria-pressed={activo}
                onClick={() => { setFiltroEstado(opt.value); setPage(0); }}
                className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                  activo
                    ? "border-[#22c55e]/40 bg-[#22c55e]/10 font-medium text-[#22c55e]"
                    : "border-[#2a2a32] bg-[#111114] text-white/60 hover:border-[#3a3a44] hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={abrirCrear}
          className="flex items-center gap-2 whitespace-nowrap rounded-lg bg-[#22c55e] px-4 py-2.5 text-sm font-semibold text-black transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]/50"
        >
          <Plus className="h-4 w-4" />
          Generar pedido
        </button>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden border border-[#1e1e24] bg-[#111114] shadow-lg shadow-black/20">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-emerald-500/10">
                <th className={`${thClass} w-24`}>N°</th>
                <th className={thClass}>Proveedor</th>
                <th className={`${thClass} w-36`}>Emisión</th>
                <th className={`${thClass} w-40`}>Estado</th>
                <th className={thClass}>Observación</th>
                <th className={`${thClass} w-40 text-right`}>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {loading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#1e1e24] last:border-0">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
                      </td>
                    ))}
                  </tr>
                ))}

              {!loading && filas.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    {sinBackend ? (
                      <>
                        <p className="text-white/60">No se pudieron cargar los pedidos.</p>
                        <p className="mt-1 text-xs text-white/30">{error}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-white/60">
                          No hay pedidos{filtroEstado ? ` con estado "${ESTADO_STYLES[filtroEstado].label.toLowerCase()}"` : ""}.
                        </p>
                        <p className="mt-1 text-xs text-white/30">
                          {filtroEstado
                            ? "Probá con otro estado o mirá todos los pedidos."
                            : "Creá el primero con “Generar pedido”."}
                        </p>
                      </>
                    )}
                  </td>
                </tr>
              )}

              {filas.map((p) => {
                const e = normEstado(p.estado);
                const editable = p.puedeEditarse ?? (e === "solicitado");
                const cancelable = p.puedeCancelarse ?? (e === "solicitado");
                const recibible = p.puedeRecibirse ?? (e === "solicitado");
                const sinAcciones = !recibible && !editable;

                return (
                  <tr
                    key={p.idPedido}
                    className={`border-b border-[#1e1e24] transition-colors last:border-0 hover:bg-white/[0.04] ${
                      e === "cancelado" ? "opacity-60" : ""
                    }`}
                  >
                    <td className="px-4 py-4 font-mono text-xs text-white/50">#{p.idPedido}</td>
                    <td className="px-4 py-4 font-medium text-white">{p.nombreProveedor || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-white/60">{fmtFecha(p.fechaCreacion)}</td>
                    <td className="px-4 py-4">
                      <EstadoBadge estado={p.estado} />
                    </td>
                    <td
                      className="max-w-[220px] truncate px-4 py-4 text-xs text-white/50"
                      title={p.observaciones || undefined}
                    >
                      {p.observaciones || "—"}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {recibible && (
                          <button
                            type="button"
                            onClick={() => abrirRecepcion(p)}
                            title="Recepcionar pedido"
                            aria-label="Recepcionar pedido"
                            className={`${actionBase} bg-[#22c55e]/10 text-[#22c55e] hover:bg-[#22c55e]/20`}
                          >
                            <PackageCheck className="h-4 w-4" />
                          </button>
                        )}
                        {editable && (
                          <button
                            type="button"
                            onClick={() => abrirEditar(p.idPedido)}
                            title="Editar pedido"
                            aria-label="Editar pedido"
                            className={`${actionBase} text-white/40 hover:bg-sky-500/10 hover:text-sky-400`}
                          >
                            <PenLine className="h-4 w-4" />
                          </button>
                        )}
                        {editable && cancelable && (
                          <button
                            type="button"
                            onClick={() => setCancelarSel(p)}
                            title="Cancelar pedido"
                            aria-label="Cancelar pedido"
                            className={`${actionBase} text-white/40 hover:bg-red-500/10 hover:text-red-400`}
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                        {sinAcciones && <span className="pr-2 text-xs text-[#5a5a6e]">—</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {!sinBackend && pedidos.length > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          pageSize={15}
          totalItems={totalPedidos}
        />
      )}

      {modal && (
        <PedidoModal
          modo={modal}
          pedido={pedidoSel}
          proveedores={proveedores}
          prodSearch={prodSearch}
          setProdSearch={setProdSearch}
          prodResults={prodResults}
          prodPage={prodPage}
          setProdPage={setProdPage}
          prodTotalPages={prodTotalPages}
          prodTotalItems={prodTotalItems}
          showProd={showProd}
          setShowProd={setShowProd}
          guardando={guardando}
          error={error}
          sinBackend={sinBackend}
          onGuardar={async (body) => {
            setGuardando(true);
            setError(null);
            try {
              if (modal === "editar") {
                await modificarPedido(pedidoSel.idPedido, body);
              } else {
                await crearPedido(body);
              }
              setModal(false);
              await cargar();
            } catch (err) {
              setError(apiErrorMessage(err) || "Error al guardar el pedido");
            } finally {
              setGuardando(false);
            }
          }}
          onCerrar={() => setModal(false)}
        />
      )}

      {recibirSel && (
        <RecepcionPedidoModal
          pedido={recibirSel}
          onClose={() => setRecibirSel(null)}
          onCambio={() => cargar()}
        />
      )}

      {cancelarSel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm space-y-4 rounded-xl border border-[#1e1e24] bg-[#111114] p-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-red-500/10 p-2 text-red-400">
                <XCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Cancelar pedido</h3>
                <p className="text-sm text-[#7a7a8c]">
                  {cancelarSel.nombreProveedor || `Pedido #${cancelarSel.idPedido}`}
                </p>
              </div>
            </div>
            <p className="text-sm text-white/70">
              ¿Cancelar el pedido a {cancelarSel.nombreProveedor || `#${cancelarSel.idPedido}`}?
              No se modificará el stock.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setCancelarSel(null)} disabled={cancelando}
                className="rounded-lg border border-[#2a2a32] bg-[#0d0d0f] px-4 py-2 text-sm text-[#9a9aac] transition-colors hover:text-white disabled:opacity-40">
                No
              </button>
              <button type="button" onClick={confirmarCancelar} disabled={cancelando}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-400 disabled:opacity-40">
                {cancelando ? "Cancelando…" : "Sí, cancelar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────── Modal de pedido ───────────── */

function PedidoModal({
  modo, pedido, proveedores, prodSearch, setProdSearch, prodResults, prodPage, setProdPage, prodTotalPages,
  prodTotalItems, showProd, setShowProd, guardando, error, sinBackend, onGuardar, onCerrar,
}) {
  const esEditar = modo === "editar";
  const prodRef = useRef(null);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      if (prodRef.current && !prodRef.current.contains(e.target)) setShowProd(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [setShowProd]);

  const [form, setForm] = useState({
    idProveedor: pedido?.idProveedor ?? "",
    observaciones: pedido?.observaciones ?? "",
  });

  const [lineas, setLineas] = useState(() => {
    if (pedido?.detalles?.length) {
      return pedido.detalles.map((it) => ({
        idProducto: it.idProducto,
        nombre: it.nombreProducto || "",
        unidadMedida: it.nombreUnidadMedida || "",
        cantidad: Number(it.cantidad) || 1,
      }));
    }
    return [];
  });

  const agregarLinea = (prod) => {
    const existente = lineas.find((l) => l.idProducto === prod.id);
    if (existente) {
      setLineas((prev) => prev.map((l) => l.idProducto === prod.id ? { ...l, cantidad: l.cantidad + 1 } : l));
    } else {
      setLineas((prev) => [...prev, {
        idProducto: prod.id,
        nombre: prod.name || prod.nombre || "",
        unidadMedida: prod.unitAbbreviation || prod.unidadMedida || "",
        cantidad: 1,
      }]);
    }
    setFormError(null);
    setProdSearch("");
    setShowProd(false);
  };

  const actualizarCantidad = (id, val) => {
    const n = parseFloat(String(val).replace(",", "."));
    setLineas((prev) => prev.map((l) => l.idProducto === id ? { ...l, cantidad: Number.isFinite(n) && n > 0 ? n : 1 } : l));
  };

  const eliminarLinea = (id) => setLineas((prev) => prev.filter((l) => l.idProducto !== id));

  const handleSubmit = () => {
    setFormError(null);
    if (!form.idProveedor) return setFormError("Seleccioná un proveedor.");
    if (lineas.length === 0) return setFormError("Agregá al menos un producto.");
    for (const l of lineas) {
      if (l.cantidad <= 0) return setFormError(`La cantidad de "${l.nombre}" debe ser mayor a cero.`);
    }
    onGuardar({
      idProveedor: Number(form.idProveedor),
      observaciones: form.observaciones.trim() || null,
      detalles: lineas.map((l) => ({ idProducto: l.idProducto, cantidad: l.cantidad })),
    });
  };

  const mensajeError = formError || error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-[#1e1e24] bg-[#111114] shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1e1e24] px-5 py-3">
          <h2 className="text-sm font-semibold text-[#f1f1f3]">
            {esEditar ? `Editar pedido #${pedido?.idPedido}` : "Generar pedido"}
          </h2>
          <button type="button" onClick={onCerrar} aria-label="Cerrar"
            className="rounded p-1 text-[#5a5a6e] transition-colors hover:bg-white/5 hover:text-[#e1e1eb]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {mensajeError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
              {mensajeError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs text-[#7a7a8c]">
                Proveedor <span className="text-rose-400">*</span>
              </span>
              <select
                value={form.idProveedor}
                onChange={(e) => { setForm({ ...form, idProveedor: e.target.value }); setFormError(null); }}
                className={`${fieldClass} cursor-pointer`}
              >
                <option value="" className="bg-[#111114]">Seleccionar proveedor</option>
                {(esEditar && pedido?.idProveedor && !proveedores.some((x) => String(x.id ?? x.idProveedor) === String(pedido.idProveedor))) && (
                  <option value={pedido.idProveedor} className="bg-[#111114]">
                    {pedido.nombreProveedor || `Proveedor #${pedido.idProveedor}`} (inactivo)
                  </option>
                )}
                {proveedores.map((p) => (
                  <option key={p.id ?? p.idProveedor} value={p.id ?? p.idProveedor} className="bg-[#111114]">{p.nombre}</option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-xs text-[#7a7a8c]">Observación</span>
              <input
                value={form.observaciones}
                onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                placeholder="Opcional"
                className={fieldClass}
              />
            </label>
          </div>

          {/* Buscador de productos */}
          <div className="space-y-1">
            <span className="text-xs text-[#7a7a8c]">Productos</span>
            <div ref={prodRef} className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#5a5a6e]">
                <Search className="h-4 w-4" />
              </span>
              <input
                value={prodSearch}
                onChange={(e) => { setProdSearch(e.target.value); setProdPage(0); setShowProd(true); }}
                onFocus={() => { setProdPage(0); setShowProd(true); }}
                placeholder="Buscar producto por nombre..."
                className={`${fieldClass} pl-10`}
              />
              {showProd && (
                <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-[#2a2a32] bg-[#111114] shadow-xl shadow-black/40">
                  {prodResults.length === 0 ? (
                    <p className="px-3 py-3 text-sm text-[#5a5a6e]">No se encontraron productos.</p>
                  ) : prodResults.map((p) => {
                    const um = p.unitAbbreviation || p.unidadMedida;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => agregarLinea(p)}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-white transition-colors hover:bg-white/5"
                      >
                        <span className="truncate">{p.name || p.nombre}</span>
                        {um && (
                          <span className="shrink-0 rounded-full border border-[#2a2a32] px-2 py-0.5 text-[11px] text-[#7a7a8c]">
                            {um}
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {prodTotalPages > 1 && (
                    <Pagination
                      page={prodPage}
                      totalPages={prodTotalPages}
                      onPageChange={setProdPage}
                      pageSize={8}
                      totalItems={prodTotalItems}
                      className="border-t border-[#1e1e24] px-3 py-1.5"
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Líneas del pedido */}
          {lineas.length > 0 ? (
            <div className="overflow-hidden border border-[#1e1e24]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-emerald-500/10 text-left">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300">Producto</th>
                    <th className="w-24 px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300">U.M.</th>
                    <th className="w-32 px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300">Cantidad</th>
                    <th className="w-12 px-2 py-2.5" aria-label="Quitar" />
                  </tr>
                </thead>
                <tbody>
                  {lineas.map((l) => (
                    <tr key={l.idProducto} className="border-b border-[#1e1e24] last:border-0 hover:bg-white/[0.03]">
                      <td className="px-4 py-2.5 font-medium text-white">{l.nombre || `Producto #${l.idProducto}`}</td>
                      <td className="px-3 py-2.5 text-center text-white/50">{l.unidadMedida || "—"}</td>
                      <td className="px-3 py-2.5">
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          value={l.cantidad}
                          onChange={(e) => actualizarCantidad(l.idProducto, e.target.value)}
                          className="w-full rounded-md border border-[#2a2a32] bg-[#0d0d0f] px-2 py-1.5 text-right text-sm tabular-nums text-white outline-none transition focus:border-[#22c55e]/60 focus:ring-2 focus:ring-[#22c55e]/15"
                        />
                      </td>
                      <td className="px-2 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => eliminarLinea(l.idProducto)}
                          title="Quitar producto"
                          aria-label="Quitar producto"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#5a5a6e] transition-colors hover:bg-red-500/10 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-[#2a2a32] px-4 py-8 text-center">
              <p className="text-sm text-white/60">Todavía no agregaste productos a este pedido.</p>
              <p className="mt-1 text-xs text-[#5a5a6e]">Buscá un producto arriba para sumarlo.</p>
            </div>
          )}

          {/* Pie */}
          <div className="flex items-center justify-between gap-3 border-t border-[#1e1e24] pt-4">
            <span className="text-sm text-[#5a5a6e]">
              {lineas.length > 0
                ? `${lineas.length} producto${lineas.length !== 1 ? "s" : ""}`
                : "Ningún producto seleccionado"}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onCerrar}
                className="rounded-lg border border-[#2a2a32] bg-[#0d0d0f] px-4 py-2.5 text-sm text-[#9a9aac] transition-colors hover:text-[#e1e1eb]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={guardando || sinBackend}
                className="flex items-center gap-2 rounded-lg bg-[#22c55e] px-6 py-2.5 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-[#1b2e23] disabled:text-[#6bd695]/40"
              >
                {guardando ? "Guardando..." : esEditar ? "Guardar cambios" : "Crear pedido"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}