import { useState, useEffect, useCallback } from "react";
import { Plus, XCircle, Eye, Trash2, ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  getPedidos,
  getPedido,
  crearPedido,
  modificarPedido,
  cancelarPedido,
  getEmpleados,
  apiErrorMessage,
} from "../../../../api/comprasApi";
import { getProveedores } from "../../../../api/proveedoresApi";
import { getProductos } from "../../../../api/productosApi";

const ESTADOS = ["", "pendiente", "enviada", "recibida", "cancelado"];
const DEBOUNCE_MS = 350;

export default function PedidosABM() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [modal, setModal] = useState(false);     // false | "crear" | "editar" | "ver"
  const [pedidoSel, setPedidoSel] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const [proveedores, setProveedores] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [prodSearch, setProdSearch] = useState("");
  const [prodResults, setProdResults] = useState([]);
  const [showProd, setShowProd] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPedidos({ estado: filtroEstado || undefined, page, pageSize: 15 });
      setPedidos(res.content);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(apiErrorMessage(err) || "No se pudieron cargar los pedidos");
    } finally {
      setLoading(false);
    }
  }, [filtroEstado, page]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    (async () => {
      try {
        const [p, e] = await Promise.all([getProveedores({ pageSize: 100 }), getEmpleados()]);
        setProveedores(p?.data?.content || p || []);
        setEmpleados(e || []);
      } catch {
        setProveedores([]);
        setEmpleados([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (prodSearch.length < 1) { setProdResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await getProductos({ search: prodSearch, pageSize: 8 });
        setProdResults(res.content || []);
      } catch { setProdResults([]); }
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [prodSearch]);

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

  async function abrirVer(id) {
    try {
      const data = await getPedido(id);
      setPedidoSel(data);
      setModal("ver");
      setError(null);
    } catch (err) {
      setError(apiErrorMessage(err) || "No se pudo cargar el pedido");
    }
  }

  async function handleCancelar(p) {
    const nombre = p.proveedor || `Pedido #${p.id}`;
    if (!window.confirm(`¿Cancelar el pedido a ${nombre}? No se modificará stock.`)) return;
    setError(null);
    try {
      await cancelarPedido(p.id);
      await cargar();
    } catch (err) {
      setError(apiErrorMessage(err) || "No se pudo cancelar el pedido");
    }
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-[#f1f1f3] tracking-tight">Pedidos / Órdenes de Compra</h1>
          <p className="text-sm text-[#5a5a6e]">Crear, modificar o cancelar órdenes pendientes</p>
        </div>
        <button onClick={abrirCrear}
          className="flex items-center gap-2 px-4 py-2 bg-[#22c55e] text-black text-sm font-medium rounded-lg hover:bg-green-400 transition-colors">
          <Plus className="w-4 h-4" />
          Nuevo pedido
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      <div className="flex items-center gap-3">
        <label className="text-xs text-[#5a5a6e] uppercase tracking-wider">Estado:</label>
        <select value={filtroEstado} onChange={(e) => { setFiltroEstado(e.target.value); setPage(0); }}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#22c55e]/50">
          <option value="" className="bg-[#111114]">Todos</option>
          {ESTADOS.filter(Boolean).map((e) => (
            <option key={e} value={e} className="bg-[#111114]">{e.charAt(0).toUpperCase() + e.slice(1)}</option>
          ))}
        </select>
      </div>

      {loading && <p className="text-sm text-[#5a5a6e]">Cargando...</p>}

      {!loading && pedidos.length === 0 && (
        <p className="text-sm text-[#5a5a6e]">No hay pedidos{filtroEstado ? ` con estado "${filtroEstado}"` : ""}.</p>
      )}

      {pedidos.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-[#5a5a6e] uppercase tracking-wider border-b border-white/10">
                  <th className="text-left py-2 pr-2">N°</th>
                  <th className="text-left py-2 px-2">Proveedor</th>
                  <th className="text-left py-2 px-2">Empleado</th>
                  <th className="text-left py-2 px-2">Emisión</th>
                  <th className="text-left py-2 px-2">Estado</th>
                  <th className="text-left py-2 px-2">Observaciones</th>
                  <th className="py-2 pl-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map((p) => {
                  const esPendiente = p.estado === "pendiente";
                  const badge = esPendiente
                    ? "bg-yellow-500/10 text-yellow-400"
                    : p.estado === "cancelado"
                      ? "bg-red-500/10 text-red-400"
                      : "bg-[#22c55e]/10 text-[#22c55e]";
                  return (
                    <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="py-2.5 pr-2 text-white font-medium">#{p.id}</td>
                      <td className="py-2.5 px-2 text-white/90">{p.proveedor || "—"}</td>
                      <td className="py-2.5 px-2 text-white/70">{p.empleado || "—"}</td>
                      <td className="py-2.5 px-2 text-white/60">{p.fechaEmision || "—"}</td>
                      <td className="py-2.5 px-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${badge}`}>{p.estado}</span>
                      </td>
                      <td className="py-2.5 px-2 text-white/50 text-xs max-w-[200px] truncate">{p.observaciones || "—"}</td>
                      <td className="py-2.5 pl-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => abrirVer(p.id)} title="Ver detalle"
                            className="p-1.5 text-white/40 hover:text-[#22c55e] transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                          {esPendiente && (
                            <>
                              <button onClick={() => abrirEditar(p.id)} title="Editar"
                                className="p-1.5 text-white/40 hover:text-yellow-400 transition-colors">
                                ✎
                              </button>
                              <button onClick={() => handleCancelar(p)} title="Cancelar pedido"
                                className="p-1.5 text-white/40 hover:text-red-400 transition-colors">
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-xs text-[#5a5a6e]">
            <span>Página {page + 1} de {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(p - 1, 0))} disabled={page === 0}
                className="px-3 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-40 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage((p) => Math.min(p + 1, totalPages - 1))} disabled={page >= totalPages - 1}
                className="px-3 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-40 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {modal && (
        <PedidoModal
          modo={modal}
          pedido={pedidoSel}
          proveedores={proveedores}
          empleados={empleados}
          prodSearch={prodSearch}
          setProdSearch={setProdSearch}
          prodResults={prodResults}
          showProd={showProd}
          setShowProd={setShowProd}
          guardando={guardando}
          error={error}
          onGuardar={async (body) => {
            setGuardando(true);
            setError(null);
            try {
              if (modal === "editar") {
                await modificarPedido(pedidoSel.id, body);
              } else {
                await crearPedido(body);
              }
              setModal(false);
              await cargar();
            } catch (err) {
              const det = apiErrorMessage(err);
              setError(det || "Error al guardar el pedido");
            } finally {
              setGuardando(false);
            }
          }}
          onCerrar={() => setModal(false)}
        />
      )}
    </div>
  );
}

function PedidoModal({
  modo, pedido, proveedores, empleados, prodSearch, setProdSearch, prodResults, showProd, setShowProd,
  guardando, error, onGuardar, onCerrar,
}) {
  const esVer = modo === "ver";
  const esEditar = modo === "editar";
  const esCrear = modo === "crear";

  const [form, setForm] = useState({
    idProveedor: pedido?.idProveedor ?? pedido?.proveedor ?? "",
    idEmpleado: pedido?.idEmpleado ?? pedido?.empleado ?? "",
    observaciones: pedido?.observaciones ?? "",
  });

  const [lineas, setLineas] = useState(() => {
    if (pedido?.items?.length) {
      return pedido.items.map((it) => ({
        idDetalle: it.idDetalle,
        idProducto: it.idProducto,
        nombre: it.nombre || "",
        cantidad: Number(it.cantidad) || 1,
        precioUnitario: Number(it.precioUnitario) || 0,
      }));
    }
    return [];
  });

  const agregarLinea = (prod) => {
    const existente = lineas.find((l) => l.idProducto === prod.id);
    if (existente) {
      setLineas((prev) => prev.map((l) => l.idProducto === prod.id ? { ...l, cantidad: l.cantidad + 1 } : l));
    } else {
      const precio = parseFloat(String(prod.precioVenta || "0").replace(",", ".")) || 0;
      setLineas((prev) => [...prev, { idDetalle: null, idProducto: prod.id, nombre: prod.name || prod.nombre || "", cantidad: 1, precioUnitario: precio }]);
    }
    setProdSearch("");
    setShowProd(false);
  };

  const actualizarCantidad = (id, val) => {
    const n = parseFloat(val.replace(",", "."));
    setLineas((prev) => prev.map((l) => l.idProducto === id ? { ...l, cantidad: Number.isFinite(n) && n > 0 ? n : 1 } : l));
  };

  const eliminarLinea = (id) => setLineas((prev) => prev.filter((l) => l.idProducto !== id));

  const total = lineas.reduce((s, l) => s + l.cantidad * l.precioUnitario, 0);

  const handleSubmit = () => {
    if (!form.idProveedor) return alert("Seleccioná un proveedor");
    if (!form.idEmpleado) return alert("Seleccioná un empleado");
    if (lineas.length === 0) return alert("Agregá al menos un producto");
    onGuardar({
      idProveedor: Number(form.idProveedor),
      idEmpleado: Number(form.idEmpleado),
      observaciones: form.observaciones || null,
      lineas: lineas.map((l) => ({
        idDetalle: l.idDetalle || null,
        idProducto: l.idProducto,
        cantidad: l.cantidad,
        precioUnitario: l.precioUnitario,
      })),
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1a1a20] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="text-lg font-semibold text-white">
            {esCrear ? "Nuevo Pedido" : esEditar ? `Editar Pedido #${pedido?.id}` : `Pedido #${pedido?.id}`}
          </h2>
          <button onClick={onCerrar} className="p-1 text-white/40 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#5a5a6e] mb-1.5 uppercase tracking-wider">Proveedor *</label>
              <select value={form.idProveedor} onChange={(e) => setForm({ ...form, idProveedor: e.target.value })} disabled={esVer}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#22c55e]/50 disabled:opacity-60">
                <option value="" className="bg-[#111114]">Seleccionar proveedor</option>
                {proveedores.map((p) => (
                  <option key={p.id ?? p.idProveedor} value={p.id ?? p.idProveedor} className="bg-[#111114]">{p.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5a5a6e] mb-1.5 uppercase tracking-wider">Empleado *</label>
              <select value={form.idEmpleado} onChange={(e) => setForm({ ...form, idEmpleado: e.target.value })} disabled={esVer}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#22c55e]/50 disabled:opacity-60">
                <option value="" className="bg-[#111114]">Seleccionar empleado</option>
                {empleados.map((e) => (
                  <option key={e.id} value={e.id} className="bg-[#111114]">{e.nombreCompleto}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5a5a6e] mb-1.5 uppercase tracking-wider">Observaciones</label>
            <input value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} disabled={esVer}
              placeholder="Opcional"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#22c55e]/50 disabled:opacity-60" />
          </div>

          {!esVer && (
            <div>
              <label className="block text-xs font-medium text-[#5a5a6e] mb-1.5 uppercase tracking-wider">Agregar producto</label>
              <input value={prodSearch} onChange={(e) => { setProdSearch(e.target.value); setShowProd(true); }}
                onFocus={() => setShowProd(true)} placeholder="Buscar producto..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#22c55e]/50" />
              {showProd && prodResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-white/10 bg-[#1a1a20] shadow-xl max-h-48 overflow-y-auto">
                  {prodResults.map((p) => (
                    <button key={p.id} type="button" onClick={() => agregarLinea(p)}
                      className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5 transition-colors">
                      {p.name || p.nombre}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {lineas.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-[#5a5a6e] uppercase tracking-wider border-b border-white/10">
                    <th className="text-left py-2 pr-2">Producto</th>
                    <th className="text-right py-2 px-2 w-24">Cantidad</th>
                    <th className="text-right py-2 px-2 w-28">Precio unit.</th>
                    <th className="text-right py-2 px-2 w-28">Subtotal</th>
                    {!esVer && <th className="py-2 pl-2 w-10"></th>}
                  </tr>
                </thead>
                <tbody>
                  {lineas.map((l) => (
                    <tr key={l.idProducto} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="py-2 pr-2 text-white">{l.nombre || `Producto #${l.idProducto}`}</td>
                      <td className="py-2 px-2">
                        <input type="number" min="0.01" step="any" value={l.cantidad}
                          onChange={(e) => actualizarCantidad(l.idProducto, e.target.value)} disabled={esVer}
                          className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white text-right focus:outline-none focus:border-[#22c55e]/50 disabled:opacity-60" />
                      </td>
                      <td className="py-2 px-2">
                        <input type="number" min="0" step="any" value={l.precioUnitario} disabled
                          className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white/60 text-right" />
                      </td>
                      <td className="py-2 px-2 text-right text-white font-medium">${(l.cantidad * l.precioUnitario).toFixed(2)}</td>
                      {!esVer && (
                        <td className="py-2 pl-2">
                          <button onClick={() => eliminarLinea(l.idProducto)}
                            className="p-1 text-[#5a5a6e] hover:text-red-400 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <span className="text-lg font-bold text-white">Total: ${total.toFixed(2)}</span>
            {!esVer && (
              <button onClick={handleSubmit} disabled={guardando}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#22c55e] hover:bg-green-400 disabled:opacity-50 text-black font-medium rounded-lg transition-colors">
                {guardando ? "Guardando..." : esEditar ? "Guardar cambios" : "Crear pedido"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
