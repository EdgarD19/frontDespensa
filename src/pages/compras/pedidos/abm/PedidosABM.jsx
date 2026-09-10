import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, XCircle, PenLine, Trash2, X, Search, PackageCheck } from "lucide-react";
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

const ESTADOS = ["solicitado", "recibido", "cancelado"];

const pageBtn =
  "flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/60 hover:border-white/30 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors text-sm";

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

function EstadoBadge({ estado }) {
  const e = normEstado(estado);
  const cls =
    e === "recibido"
      ? "bg-[#22c55e]/10 text-[#22c55e]"
      : e === "cancelado"
        ? "bg-red-500/10 text-red-400"
        : "bg-yellow-500/10 text-yellow-400";
  const label = e === "solicitado" ? "Solicitado" : e.charAt(0).toUpperCase() + e.slice(1);
  return <span className={`text-xs px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
}

export default function PedidosABM() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sinBackend, setSinBackend] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [modal, setModal] = useState(false);     // false | "crear" | "editar"
  const [pedidoSel, setPedidoSel] = useState(null);
  const [recibirSel, setRecibirSel] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const [proveedores, setProveedores] = useState([]);
  const [prodSearch, setProdSearch] = useState("");
  const [prodResults, setProdResults] = useState([]);
  const [prodPage, setProdPage] = useState(0);
  const [prodTotalPages, setProdTotalPages] = useState(0);
  const [showProd, setShowProd] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPedidos({ estado: filtroEstado || undefined, page, pageSize: 15 });
      setPedidos(res.content);
      setTotalPages(res.totalPages);
      setSinBackend(false);
    } catch (err) {
      setError(apiErrorMessage(err) || "No se pudieron cargar los pedidos");
      setPedidos([]);
      setTotalPages(0);
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
    const t = setTimeout(async () => {
      try {
        const res = await getProductos({ search: prodSearch || undefined, page: prodPage, pageSize: 8 });
        setProdResults(res.content || []);
        setProdTotalPages(res.totalPages ?? 0);
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

  async function handleCancelar(p) {
    const nombre = p.nombreProveedor || `Pedido #${p.idPedido}`;
    if (!window.confirm(`¿Cancelar el pedido a ${nombre}? No se modificará el stock.`)) return;
    setError(null);
    try {
      await cancelarPedido(p.idPedido);
      await cargar();
    } catch (err) {
      setError(apiErrorMessage(err) || "No se pudo cancelar el pedido");
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

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-[#f1f1f3] tracking-tight">Pedidos</h1>
          <p className="text-sm text-[#5a5a6e]">Seguimiento de pedidos a proveedores</p>
        </div>
        <button onClick={abrirCrear}
          className="flex items-center gap-2 px-4 py-2 bg-[#22c55e] text-black text-sm font-medium rounded-lg hover:bg-green-400 transition-colors">
          <Plus className="w-4 h-4" />
          Generar pedido
        </button>
      </div>

      {error && !sinBackend && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      <div className="flex items-center gap-3">
        <label className="text-xs text-[#5a5a6e] uppercase tracking-wider">Estado:</label>
        <select value={filtroEstado} onChange={(e) => { setFiltroEstado(e.target.value); setPage(0); }}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#22c55e]/50">
          <option value="" className="bg-[#111114]">Todos</option>
          {ESTADOS.map((e) => (
            <option key={e} value={e} className="bg-[#111114]">{e.charAt(0).toUpperCase() + e.slice(1)}</option>
          ))}
        </select>
      </div>

      {loading && <p className="text-sm text-[#5a5a6e]">Cargando...</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-[#5a5a6e] uppercase tracking-wider border-b border-white/10">
              <th className="text-left py-2 pr-2">N°</th>
              <th className="text-left py-2 px-2">Proveedor</th>
              <th className="text-left py-2 px-2">Emisión</th>
              <th className="text-left py-2 px-2">Estado</th>
              <th className="text-left py-2 px-2">Observación</th>
              <th className="py-2 pl-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.map((p) => {
              const e = normEstado(p.estado);
              const editable = p.puedeEditarse ?? (e === "solicitado");
              const cancelable = p.puedeCancelarse ?? (e === "solicitado");
              const recibible = p.puedeRecibirse ?? (e === "solicitado");
              return (
                <tr key={p.idPedido} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="py-2.5 pr-2 text-white font-medium">#{p.idPedido}</td>
                  <td className="py-2.5 px-2 text-white/90">{p.nombreProveedor || "—"}</td>
                  <td className="py-2.5 px-2 text-white/60 whitespace-nowrap">{fmtFecha(p.fechaCreacion)}</td>
                  <td className="py-2.5 px-2">
                    <EstadoBadge estado={p.estado} />
                  </td>
                  <td className="py-2.5 px-2 text-white/50 text-xs max-w-[220px] truncate">{p.observaciones || "—"}</td>
                  <td className="py-2.5 pl-2 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {recibible && (
                        <button onClick={() => abrirRecepcion(p)} title="Recepcionar pedido"
                          className="p-1.5 text-white/40 hover:text-[#22c55e] transition-colors">
                          <PackageCheck className="w-4 h-4" />
                        </button>
                      )}
                      {(editable || recibible) ? (
                        <>
                          {editable && (
                            <>
                              <button onClick={() => abrirEditar(p.idPedido)} title="Editar"
                                className="p-1.5 text-white/40 hover:text-yellow-400 transition-colors">
                                <PenLine className="w-4 h-4" />
                              </button>
                              {cancelable && (
                                <button onClick={() => handleCancelar(p)} title="Cancelar pedido"
                                  className="p-1.5 text-white/40 hover:text-red-400 transition-colors">
                                  <XCircle className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </>
                      ) : (
                        <span className="text-[#5a5a6e] text-xs">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {!loading && pedidos.length === 0 && (
          <div className="px-4 py-8 text-center text-sm">
            <p className="text-[#5a5a6e]">No hay pedidos{filtroEstado ? ` con estado "${filtroEstado}"` : ""}.</p>
          </div>
        )}
      </div>

      {!sinBackend && pedidos.length > 0 && (
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-0.5 rounded-xl border border-white/10 bg-white/[0.04] px-1.5 py-1.5 text-sm select-none shadow-sm">
            <button type="button" disabled={page <= 0} onClick={() => setPage(0)}
              className={pageBtn} title="Primera página">&laquo;</button>
            <button type="button" disabled={page <= 0} onClick={() => setPage((p) => p - 1)}
              className={pageBtn} title="Página anterior">&lsaquo;</button>
            <span className="px-2 font-medium text-white/75 tabular-nums">Página {page + 1} de {totalPages}</span>
            <button type="button" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}
              className={pageBtn} title="Página siguiente">&rsaquo;</button>
            <button type="button" disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)}
              className={pageBtn} title="Última página">&raquo;</button>
          </div>
        </div>
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
    </div>
  );
}

function PedidoModal({
  modo, pedido, proveedores, prodSearch, setProdSearch, prodResults, prodPage, setProdPage, prodTotalPages,
  showProd, setShowProd, guardando, error, sinBackend, onGuardar, onCerrar,
}) {
  const esEditar = modo === "editar";
  const prodRef = useRef(null);

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
    setProdSearch("");
    setShowProd(false);
  };

  const actualizarCantidad = (id, val) => {
    const n = parseFloat(String(val).replace(",", "."));
    setLineas((prev) => prev.map((l) => l.idProducto === id ? { ...l, cantidad: Number.isFinite(n) && n > 0 ? n : 1 } : l));
  };

  const eliminarLinea = (id) => setLineas((prev) => prev.filter((l) => l.idProducto !== id));

  const handleSubmit = () => {
    if (!form.idProveedor) return alert("Seleccioná un proveedor");
    if (lineas.length === 0) return alert("Agregá al menos un producto");
    for (const l of lineas) {
      if (l.cantidad <= 0) return alert(`La cantidad de "${l.nombre}" debe ser mayor a cero`);
    }
    onGuardar({
      idProveedor: Number(form.idProveedor),
      observaciones: form.observaciones.trim() || null,
      detalles: lineas.map((l) => ({ idProducto: l.idProducto, cantidad: l.cantidad })),
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1a1a20] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="text-lg font-semibold text-white">
            {esEditar ? `Editar Pedido #${pedido?.idPedido}` : "Generar Pedido"}
          </h2>
          <button onClick={onCerrar} className="p-1 text-white/40 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">{error}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#5a5a6e] mb-1.5 uppercase tracking-wider">Proveedor *</label>
              <select value={form.idProveedor} onChange={(e) => setForm({ ...form, idProveedor: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#22c55e]/50">
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
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5a5a6e] mb-1.5 uppercase tracking-wider">Observación</label>
              <input value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                placeholder="Opcional"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#22c55e]/50" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5a5a6e] mb-1.5 uppercase tracking-wider">Productos</label>
            <div ref={prodRef} className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#5a5a6e]">
                <Search className="w-4 h-4" />
              </span>
              <input value={prodSearch}
                onChange={(e) => { setProdSearch(e.target.value); setProdPage(0); setShowProd(true); }}
                onFocus={() => { setProdPage(0); setShowProd(true); }} placeholder="Buscar producto por nombre..."
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#22c55e]/50" />
              {showProd && (
                <div className="absolute z-20 mt-1 w-full rounded-lg border border-white/10 bg-[#1a1a20] shadow-xl max-h-48 overflow-y-auto">
                  {prodResults.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-[#5a5a6e]">No se encontraron productos.</p>
                  ) : prodResults.map((p) => (
                    <button key={p.id} type="button" onClick={() => agregarLinea(p)}
                      className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5 transition-colors">
                      <span>{p.name || p.nombre}</span>
                      {p.unitAbbreviation && <span className="text-xs text-[#5a5a6e] ml-2">{p.unitAbbreviation}</span>}
                    </button>
                  ))}

                  {prodTotalPages > 1 && (
                    <div className="flex items-center justify-center gap-1 px-3 py-1.5 border-t border-white/5 text-sm select-none">
                      <button type="button" disabled={prodPage <= 0} onClick={() => setProdPage(0)}
                        className="px-2 py-1 rounded text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors text-sm"
                        title="Primera página">&laquo;</button>
                      <button type="button" disabled={prodPage <= 0} onClick={() => setProdPage((p) => p - 1)}
                        className="px-2 py-1 rounded text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors text-sm"
                        title="Página anterior">&lsaquo;</button>
                      <span className="px-3 text-[#5a5a6e]">Página {prodPage + 1} de {prodTotalPages}</span>
                      <button type="button" disabled={prodPage >= prodTotalPages - 1} onClick={() => setProdPage((p) => p + 1)}
                        className="px-2 py-1 rounded text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors text-sm"
                        title="Página siguiente">&rsaquo;</button>
                      <button type="button" disabled={prodPage >= prodTotalPages - 1} onClick={() => setProdPage(prodTotalPages - 1)}
                        className="px-2 py-1 rounded text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors text-sm"
                        title="Última página">&raquo;</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {lineas.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-[#5a5a6e] uppercase tracking-wider border-b border-white/10">
                    <th className="text-left py-2 pr-2">Producto</th>
                    <th className="text-center py-2 px-2 w-20">U.M.</th>
                    <th className="text-right py-2 px-2 w-24">Cantidad</th>
                    <th className="py-2 pl-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {lineas.map((l) => (
                    <tr key={l.idProducto} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="py-2 pr-2 text-white">{l.nombre || `Producto #${l.idProducto}`}</td>
                      <td className="py-2 px-2 text-center text-white/50">{l.unidadMedida || "—"}</td>
<td className="py-2 px-2">
  <input type="number" min="0.01" step="any" value={l.cantidad}
                          onChange={(e) => actualizarCantidad(l.idProducto, e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white text-right focus:outline-none focus:border-[#22c55e]/50" />
                      </td>
                      <td className="py-2 pl-2 text-right">
                        <button onClick={() => eliminarLinea(l.idProducto)}
                          className="p-1 text-[#5a5a6e] hover:text-red-400 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {lineas.length === 0 && (
            <div className="rounded-lg border border-dashed border-white/10 px-4 py-6 text-center text-sm text-[#5a5a6e]">
              Todavía no agregaste productos a este pedido.
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <span className="text-sm text-[#5a5a6e]">
              {lineas.length > 0
                ? `${lineas.length} producto${lineas.length !== 1 ? "s" : ""}`
                : "Ningún producto seleccionado"}
            </span>
            <button onClick={handleSubmit} disabled={guardando || sinBackend}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#22c55e] hover:bg-green-400 disabled:bg-[#1b2e23] disabled:text-[#6bd695]/40 disabled:cursor-not-allowed text-black font-medium rounded-lg transition-colors">
              {guardando ? "Guardando..." : esEditar ? "Guardar cambios" : "Crear pedido"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}