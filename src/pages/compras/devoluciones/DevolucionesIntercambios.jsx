import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { Search, X, Save, FileText, AlertTriangle, CheckCircle, RotateCcw, ArrowLeftRight, Plus } from "lucide-react";
import { getFacturasCompra, getFacturaCompraById, apiErrorMessage } from "../../../api/facturasCompraApi";
import { getProductos } from "../../../api/productosApi";
import { addOperacion } from "./operacionesStore";

let filaRecibirId = 0;
const nuevaFilaRecibir = () => ({ id: ++filaRecibirId, idProducto: "", cantidad: 1 });

function fmtMoneda(n) {
  return new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", minimumFractionDigits: 0 }).format(n ?? 0);
}

function fmtFecha(valor) {
  if (!valor) return "—";
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? String(valor) : d.toLocaleDateString("es-PY");
}

function EstadoBadge({ estado }) {
  const e = String(estado || "").toUpperCase();
  const styles = e === "CANCELADA"
    ? "bg-red-500/15 text-red-400 border-red-500/30"
    : e === "VIGENTE" || e === "RECIBIDA"
      ? "bg-green-500/15 text-green-400 border-green-500/30"
      : "bg-white/10 text-white/70 border-white/10";
  return <span className={`inline-block px-2 py-0.5 text-xs rounded border ${styles}`}>{estado || "—"}</span>;
}

function SelectorProducto({ productos, value, onChange, excludeIds = [], cargando = false, ariaLabel = "Producto" }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const seleccionado = productos.find(p => String(p.id) === String(value));
  const excluidos = excludeIds.map(String);
  const q = query.trim().toLowerCase();
  const opciones = productos
    .filter(p => !excluidos.includes(String(p.id)))
    .filter(p => !q || String(p.nombre || "").toLowerCase().includes(q))
    .slice(0, 50);

  if (seleccionado && !open) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-white truncate">{seleccionado.nombre}</span>
        <button type="button" onClick={() => { onChange(""); setQuery(""); }} className="text-white/40 hover:text-red-400 shrink-0" aria-label="Quitar producto">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <input
        type="text"
        value={query}
        disabled={cargando}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={cargando ? "Cargando productos..." : "Buscar producto..."}
        aria-label={ariaLabel}
        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#22c55e]/50 disabled:opacity-50"
      />
      {open && !cargando && (
        <div className="mt-1 max-h-40 overflow-y-auto bg-[#22222a] border border-white/10 rounded">
          {opciones.length === 0 ? (
            <p className="px-3 py-2 text-xs text-white/40">Sin resultados</p>
          ) : opciones.map(p => (
            <button
              type="button"
              key={p.id}
              onMouseDown={(e) => { e.preventDefault(); onChange(String(p.id)); setOpen(false); setQuery(""); }}
              className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10"
            >
              {p.nombre}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DevolucionesIntercambios() {
  const [tipoOperacion, setTipoOperacion] = useState("DEVOLUCION");
  const [facturas, setFacturas] = useState([]);
  const [loadingFacturas, setLoadingFacturas] = useState(false);
  const [filtroNumero, setFiltroNumero] = useState("");
  const [filtroProveedor, setFiltroProveedor] = useState("");
  const [filtroFechaDesde, setFiltroFechaDesde] = useState("");
  const [filtroFechaHasta, setFiltroFechaHasta] = useState("");
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);
  const [facturaDetalle, setFacturaDetalle] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  const [productosDevueltos, setProductosDevueltos] = useState({});
  const [productosEntregar, setProductosEntregar] = useState({});
  const [productosRecibir, setProductosRecibir] = useState(() => [nuevaFilaRecibir()]);

  const [productos, setProductos] = useState([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [productosCargados, setProductosCargados] = useState(false);

  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const cargarFacturas = useCallback(async () => {
    setLoadingFacturas(true);
    setError(null);
    try {
      const res = await getFacturasCompra({ page: 0, pageSize: 1000 });
      setFacturas(Array.isArray(res.content) ? res.content : []);
    } catch (err) {
      console.error("Error al cargar facturas:", err);
      setError(apiErrorMessage(err) || "No se pudieron cargar las facturas.");
    } finally {
      setLoadingFacturas(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(cargarFacturas, 400);
    return () => clearTimeout(timer);
  }, [cargarFacturas]);

  const cargarProductos = useCallback(async () => {
    if (productosCargados) return;
    setLoadingProductos(true);
    try {
      const res = await getProductos({ page: 0, pageSize: 500 });
      setProductos(Array.isArray(res.content) ? res.content : []);
      setProductosCargados(true);
    } catch (err) {
      console.error("Error al cargar productos:", err);
    } finally {
      setLoadingProductos(false);
    }
  }, [productosCargados]);

  useEffect(() => {
    if (tipoOperacion === "INTERCAMBIO") cargarProductos();
  }, [tipoOperacion, cargarProductos]);

  useEffect(() => {
    if (!showModal) return;
    const onKey = (e) => { if (e.key === "Escape") setShowModal(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showModal]);

  const hayFiltros = Boolean(filtroNumero || filtroProveedor || filtroFechaDesde || filtroFechaHasta);

  const limpiarFiltros = () => {
    setFiltroNumero("");
    setFiltroProveedor("");
    setFiltroFechaDesde("");
    setFiltroFechaHasta("");
  };

  const facturasFiltradas = useMemo(() => {
    const numero = filtroNumero.trim().toLowerCase();
    const proveedor = filtroProveedor.trim().toLowerCase();
    return facturas
      .filter((f) => f.activo !== false && String(f.estado || "").toUpperCase() !== "CANCELADA")
      .filter((f) => !numero || String(f.numeroFactura || "").toLowerCase().includes(numero))
      .filter((f) => !proveedor || String(f.nombreProveedor || "").toLowerCase().includes(proveedor))
      .filter((f) => {
        const fecha = String(f.fechaEmision || "").slice(0, 10);
        if (filtroFechaDesde && fecha < filtroFechaDesde) return false;
        if (filtroFechaHasta && fecha > filtroFechaHasta) return false;
        return true;
      });
  }, [facturas, filtroNumero, filtroProveedor, filtroFechaDesde, filtroFechaHasta]);

  const limpiarFormulario = () => {
    setProductosDevueltos({});
    setProductosEntregar({});
    setProductosRecibir([nuevaFilaRecibir()]);
    setFacturaSeleccionada(null);
    setFacturaDetalle(null);
    setShowModal(false);
  };

  const cerrarModal = () => {
    setShowModal(false);
  };

  const handleSeleccionarFactura = async (factura) => {
    setFacturaSeleccionada(factura);
    setProductosDevueltos({});
    setProductosEntregar({});
    setProductosRecibir([nuevaFilaRecibir()]);
    setFacturaDetalle(null);
    setAviso(null);
    setError(null);
    setShowModal(true);
    setCargandoDetalle(true);
    try {
      const res = await getFacturaCompraById(factura.idFactura);
      setFacturaDetalle(res);
    } catch (err) {
      console.error("Error al cargar detalle:", err);
      setError("No se pudo cargar el detalle de la factura.");
      setShowModal(false);
    } finally {
      setCargandoDetalle(false);
    }
  };

  const handleCambiarCantidad = (idProducto, cantidad) => {
    const max = Number(facturaDetalle?.detalles?.find(d => d.idProducto === idProducto)?.cantidad) || 0;
    const val = Math.max(0, Math.min(Number(cantidad) || 0, max));
    if (tipoOperacion === "DEVOLUCION") {
      setProductosDevueltos(prev => ({ ...prev, [idProducto]: val }));
    } else {
      setProductosEntregar(prev => ({ ...prev, [idProducto]: val }));
    }
  };

  const handleCambiarRecibir = (index, field, value) => {
    setProductosRecibir(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const handleAgregarRecibir = () => {
    setProductosRecibir(prev => [...prev, nuevaFilaRecibir()]);
  };

  const totalOperacion = facturaDetalle?.detalles?.reduce((sum, d) => {
    const cant = (tipoOperacion === "DEVOLUCION" ? productosDevueltos : productosEntregar)[d.idProducto] || 0;
    return sum + (cant * (d.precioUnitario || 0));
  }, 0) || 0;

  const tieneProductos = Object.values(tipoOperacion === "DEVOLUCION" ? productosDevueltos : productosEntregar).some(v => Number(v) > 0);
  const tieneRecibir = productosRecibir.some(p => p.idProducto && Number(p.cantidad) > 0);
  const puedeGuardar = tipoOperacion === "DEVOLUCION" ? tieneProductos : (tieneProductos && tieneRecibir);

  const nombreProducto = (idProducto) => {
    const detalle = facturaDetalle?.detalles?.find(d => String(d.idProducto) === String(idProducto));
    if (detalle) return detalle.nombreProducto;
    const prod = productos.find(p => String(p.id) === String(idProducto));
    return prod?.nombre || `Producto ${idProducto}`;
  };

  const handleGuardar = async () => {
    if (!puedeGuardar) return;
    setGuardando(true);
    setError(null);
    try {
      const base = {
        fecha: new Date().toISOString(),
        facturaNumero: facturaDetalle.numeroFactura,
        proveedor: facturaDetalle.nombreProveedor,
        proveedorId: facturaDetalle.idProveedor ?? null,
        total: totalOperacion,
        motivo: "",
        documentoTipo: "",
        documentoNumero: "",
        observaciones: "",
      };

      if (tipoOperacion === "DEVOLUCION") {
        const items = facturaDetalle.detalles
          .filter(d => (productosDevueltos[d.idProducto] || 0) > 0)
          .map(d => ({
            producto: d.nombreProducto,
            cantidad: Number(productosDevueltos[d.idProducto]),
            precioUnitario: d.precioUnitario,
            tipo: "devolver",
          }));
        addOperacion({ ...base, tipo: "DEVOLUCION", estado: "PROCESADA", items });
        setAviso("Devolución registrada.");
      } else {
        const itemsEntregar = facturaDetalle.detalles
          .filter(d => (productosEntregar[d.idProducto] || 0) > 0)
          .map(d => ({
            producto: d.nombreProducto,
            cantidad: Number(productosEntregar[d.idProducto]),
            precioUnitario: d.precioUnitario,
            tipo: "entregar",
          }));
        const itemsRecibir = productosRecibir
          .filter(p => p.idProducto && Number(p.cantidad) > 0)
          .map(p => ({
            producto: nombreProducto(p.idProducto),
            cantidad: Number(p.cantidad),
            precioUnitario: 0,
            tipo: "recibir",
          }));
        addOperacion({
          ...base,
          tipo: "INTERCAMBIO",
          estado: "PENDIENTE",
          fechaRecepcion: null,
          items: [...itemsEntregar, ...itemsRecibir],
        });
        setAviso("Intercambio registrado.");
      }
      limpiarFormulario();
    } catch (err) {
      console.error("Error al guardar:", err);
      setError(`No se pudo registrar la ${tipoOperacion === "DEVOLUCION" ? "devolución" : "intercambio"}.`);
    } finally {
      setGuardando(false);
    }
  };

  const handleCambiarTipo = (nuevoTipo) => {
    setTipoOperacion(nuevoTipo);
    setAviso(null);
    setError(null);
    limpiarFormulario();
  };

  const contenidoSeleccion = () => (
    <div className="p-6 space-y-4">
      {tipoOperacion === "DEVOLUCION" && (
        <div className="bg-white/3 border border-white/5 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-white">Productos a Devolver</h3>
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
                <thead><tr className="border-b border-white/10 text-white/40 text-left"><th className="px-4 py-3 font-medium">Producto</th><th className="px-2 py-3 font-medium text-center">Comprado</th><th className="px-2 py-3 font-medium text-center">Devolver</th><th className="px-2 py-3 font-medium text-right">Subtotal</th></tr></thead>
                <tbody>
                  {facturaDetalle.detalles?.map((d) => {
                    const devuelto = productosDevueltos[d.idProducto] || 0;
                    const max = Number(d.cantidad) || 0;
                    return (
                      <tr key={d.idProducto} className="border-b border-white/5 hover:bg-white/5">
                        <td className="px-4 py-3 text-white">{d.nombreProducto}</td>
                        <td className="px-2 py-3 text-center text-white/70 font-mono">{d.cantidad}</td>
                        <td className="px-2 py-3 text-center">
                          <input type="number" min="0" max={max} step="any" value={devuelto} onChange={(e) => handleCambiarCantidad(d.idProducto, e.target.value)} aria-label={`Cantidad a devolver de ${d.nombreProducto}`} className="w-24 bg-white/5 border border-white/10 rounded px-2 py-1 text-right text-sm font-mono text-white outline-none focus:border-[#22c55e]/50" />
                        </td>
                        <td className="px-2 py-3 text-right text-white font-mono">{fmtMoneda(devuelto * (d.precioUnitario || 0))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tipoOperacion === "INTERCAMBIO" && (
        <>
          <div className="bg-white/3 border border-white/5 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 text-red-400"><ArrowLeftRight className="w-4 h-4" /> Productos a ENTREGAR (de la factura)</h3>
            <div className="max-h-60 overflow-y-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-white/10 text-white/40 text-left"><th className="px-4 py-3 font-medium">Producto</th><th className="px-2 py-3 font-medium text-center">Comprado</th><th className="px-2 py-3 font-medium text-center">A Entregar</th><th className="px-2 py-3 font-medium text-right">Subtotal</th></tr></thead>
                <tbody>
                  {facturaDetalle.detalles?.map((d) => {
                    const entregar = productosEntregar[d.idProducto] || 0;
                    const max = Number(d.cantidad) || 0;
                    return (
                      <tr key={d.idProducto} className="border-b border-white/5 hover:bg-white/5">
                        <td className="px-4 py-3 text-white">{d.nombreProducto}</td>
                        <td className="px-2 py-3 text-center text-white/70 font-mono">{d.cantidad}</td>
                        <td className="px-2 py-3 text-center">
                          <input type="number" min="0" max={max} step="any" value={entregar} onChange={(e) => handleCambiarCantidad(d.idProducto, e.target.value)} aria-label={`Cantidad a entregar de ${d.nombreProducto}`} className="w-24 bg-white/5 border border-white/10 rounded px-2 py-1 text-right text-sm font-mono text-white outline-none focus:border-[#22c55e]/50" />
                        </td>
                        <td className="px-2 py-3 text-right text-white font-mono">{fmtMoneda(entregar * (d.precioUnitario || 0))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white/3 border border-white/5 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 text-green-400"><ArrowLeftRight className="w-4 h-4" /> Productos a RECIBIR (reemplazo)</h3>
              <button type="button" onClick={handleAgregarRecibir} className="p-1.5 text-green-400 hover:bg-green-500/10 rounded transition-colors" aria-label="Agregar producto a recibir"><Plus className="w-4 h-4" /></button>
            </div>
            <div className="max-h-60 overflow-y-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-white/10 text-white/40 text-left"><th className="px-4 py-3 font-medium">Producto</th><th className="px-4 py-3 font-medium text-center">Cantidad</th></tr></thead>
                <tbody>
                  {productosRecibir.map((item, index) => (
                    <tr key={item.id} className="border-b border-white/5">
                      <td className="px-4 py-3">
                        <SelectorProducto
                          productos={productos}
                          value={item.idProducto}
                          onChange={(id) => handleCambiarRecibir(index, "idProducto", id)}
                          excludeIds={productosRecibir.filter((_, i) => i !== index).map(p => p.idProducto).filter(Boolean)}
                          cargando={loadingProductos}
                          ariaLabel={`Producto a recibir fila ${index + 1}`}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">{item.idProducto ? <input type="number" min="0.001" step="any" value={item.cantidad} onChange={(e) => handleCambiarRecibir(index, "cantidad", Number(e.target.value))} aria-label={`Cantidad a recibir fila ${index + 1}`} className="w-24 bg-white/5 border border-white/10 rounded px-2 py-1 text-right text-sm font-mono text-white outline-none focus:border-[#22c55e]/50" /> : null}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <div className="text-right pt-2 border-t border-white/5">
        <p className="text-sm font-mono text-white">Total {tipoOperacion === "DEVOLUCION" ? "a devolver" : "a entregar"}: <span className="text-[#22c55e]">{fmtMoneda(totalOperacion)}</span></p>
      </div>
    </div>
  );

  const renderModal = () => createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={cerrarModal}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="devoluciones-modal-title"
        className="bg-[#1a1a20] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div>
            <h2 id="devoluciones-modal-title" className="text-lg font-semibold text-white">
              {tipoOperacion === "DEVOLUCION" ? "Registrar Devolución" : "Registrar Intercambio"}
            </h2>
            <p className="text-xs text-[#7a7a8c] mt-0.5">Indica las cantidades de los productos</p>
          </div>
          <button onClick={cerrarModal} className="p-1 text-white/40 hover:text-white transition-colors" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {cargandoDetalle || !facturaDetalle ? (
            <div className="p-6 space-y-3">
              <div className="animate-pulse bg-white/5 border border-white/5 rounded-lg h-20" />
              <div className="animate-pulse bg-white/5 border border-white/5 rounded-lg h-40" />
            </div>
          ) : (
            contenidoSeleccion()
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-white/5">
          <div className="text-xs text-white/40">
            {!tieneProductos
              ? (tipoOperacion === "DEVOLUCION" ? "Selecciona al menos un producto a devolver" : "Selecciona al menos un producto a entregar")
              : (tipoOperacion === "INTERCAMBIO" && !tieneRecibir ? "Agrega al menos un producto a recibir" : "")}
          </div>
          <div className="flex gap-3">
            <button onClick={cerrarModal} className="px-6 py-2.5 bg-white/5 border border-white/10 text-white/70 rounded-lg hover:bg-white/10 transition-colors">Cancelar</button>
            <button onClick={handleGuardar} disabled={!puedeGuardar || guardando} className="px-6 py-2.5 bg-[#22c55e] hover:bg-green-400 text-black font-medium rounded-lg transition-colors disabled:opacity-40 disabled:pointer-events-none flex items-center gap-2">
              <Save className="w-4 h-4" />
              {guardando ? "Guardando..." : `Registrar ${tipoOperacion === "DEVOLUCION" ? "Devolución" : "Intercambio"}`}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-[#f1f1f3] tracking-tight">
          {tipoOperacion === "DEVOLUCION" ? "Registrar Devolución a Proveedor" : "Registrar Intercambio con Proveedor"}
        </h1>
        <p className="text-sm text-[#5a5a6e]">Selecciona una factura de compra y registra la operación</p>
      </div>

      <div className="flex gap-3 mb-4">
        <button onClick={() => handleCambiarTipo("DEVOLUCION")} aria-pressed={tipoOperacion === "DEVOLUCION"} className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${tipoOperacion === "DEVOLUCION" ? "bg-[#22c55e] text-black" : "bg-white/5 border border-white/10 text-white/70 hover:bg-white/10"}`}>
          <RotateCcw className="inline w-4 h-4 mr-1" /> Devolución
        </button>
        <button onClick={() => handleCambiarTipo("INTERCAMBIO")} aria-pressed={tipoOperacion === "INTERCAMBIO"} className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${tipoOperacion === "INTERCAMBIO" ? "bg-[#22c55e] text-black" : "bg-white/5 border border-white/10 text-white/70 hover:bg-white/10"}`}>
          <ArrowLeftRight className="inline w-4 h-4 mr-1" /> Intercambio
        </button>
      </div>

      {error && <div className="px-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg py-3 flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> {error}</div>}
      {aviso && <div className="px-4 bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg py-3 flex items-center gap-2"><CheckCircle className="w-5 h-5" /> {aviso}</div>}

      <div className="bg-[var(--bg-card)] border border-white/5 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2"><FileText className="w-5 h-5" /> Seleccionar Factura de Compra</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label htmlFor="filtro-numero" className="block text-xs font-medium text-white/50 mb-1">N° Factura</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 w-4 h-4" />
              <input id="filtro-numero" type="text" value={filtroNumero} onChange={(e) => setFiltroNumero(e.target.value)} placeholder="N° de factura" className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#22c55e]/50" />
            </div>
          </div>
          <div>
            <label htmlFor="filtro-proveedor" className="block text-xs font-medium text-white/50 mb-1">Proveedor</label>
            <input id="filtro-proveedor" type="text" value={filtroProveedor} onChange={(e) => setFiltroProveedor(e.target.value)} placeholder="Nombre del proveedor" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#22c55e]/50" />
          </div>
          <div>
            <label htmlFor="filtro-desde" className="block text-xs font-medium text-white/50 mb-1">Fecha desde</label>
            <input id="filtro-desde" type="date" value={filtroFechaDesde} onChange={(e) => setFiltroFechaDesde(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#22c55e]/50 [color-scheme:dark]" />
          </div>
          <div>
            <label htmlFor="filtro-hasta" className="block text-xs font-medium text-white/50 mb-1">Fecha hasta</label>
            <input id="filtro-hasta" type="date" value={filtroFechaHasta} onChange={(e) => setFiltroFechaHasta(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#22c55e]/50 [color-scheme:dark]" />
          </div>
        </div>
        {hayFiltros && (
          <div className="flex justify-end">
            <button type="button" onClick={limpiarFiltros} className="text-xs text-[#22c55e] hover:underline flex items-center gap-1"><X className="w-3.5 h-3.5" /> Limpiar filtros</button>
          </div>
        )}
        {loadingFacturas ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="animate-pulse bg-white/5 border border-white/5 rounded-lg p-4"><div className="h-4 bg-white/10 rounded w-1/4" /></div>)}</div>
        ) : facturasFiltradas.length === 0 ? (
          <p className="text-center text-white/30 py-8">No se encontraron facturas</p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/10 text-white/40 text-left"><th className="px-4 py-3 font-medium">N° Factura</th><th className="px-4 py-3 font-medium">Fecha</th><th className="px-4 py-3 font-medium">Proveedor</th><th className="px-4 py-3 font-medium text-right">Total</th><th className="px-4 py-3 font-medium">Estado</th></tr></thead>
              <tbody>
                {facturasFiltradas.map((f) => (
                  <tr
                    key={f.idFactura}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSeleccionarFactura(f)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSeleccionarFactura(f); } }}
                    className={`border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors focus:outline-none focus:bg-white/5 ${facturaSeleccionada?.idFactura === f.idFactura ? "bg-green-500/5" : ""}`}
                  >
                    <td className="px-4 py-3 text-white font-mono">{f.numeroFactura}</td>
                    <td className="px-4 py-3 text-white/70">{fmtFecha(f.fechaEmision)}</td>
                    <td className="px-4 py-3 text-white/70">{f.nombreProveedor}</td>
                    <td className="px-4 py-3 text-right text-white font-mono">{fmtMoneda(f.totalGeneral)}</td>
                    <td className="px-4 py-3"><EstadoBadge estado={f.estado} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && renderModal()}
    </div>
  );
}