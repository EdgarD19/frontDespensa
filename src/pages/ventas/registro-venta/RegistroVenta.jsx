import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Search, ShoppingCart, User, Trash2, Scale,
  Banknote, Landmark, AlertTriangle, RotateCcw, Check,
  Keyboard, UserPlus,
} from "lucide-react";
import { getProductos, getProductoByCodigo } from "../../../api/productosApi";
import { registrarVentaFactura } from "../../../api/ventasApi";
import { apiErrorMessage } from "../../../api/errors";
import ComprobanteImpresion from "./ComprobanteImpresion";
import ClienteOpcional from "./ClienteOpcional";
import {
  parsePrecioVenta, parseStockDisponible, esProductoPesable, formatMoney,
  labelCliente, labelFormaPago, numeroFacturaPreview, hoyISO,
  FORMA_PAGO_EFECTIVO, FORMA_PAGO_TRANSFERENCIA,
  parseBarcodeInput,
} from "./utils";

const QUICK_AMOUNTS = [5000, 10000, 20000, 50000, 100000];

function construirLineaCarrito(producto) {
  return {
    productoId: producto.id,
    nombre: producto.nombre || "—",
    codigoBarras: producto.codigoBarras || "",
    precioUnitario: parsePrecioVenta(producto),
    cantidad: esProductoPesable(producto) ? 1.0 : 1,
    stockDisponible: parseStockDisponible(producto),
    productoPesable: producto.productoPesable,
  };
}

export default function RegistroVenta() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [carrito, setCarrito] = useState([]);
  const [cliente, setCliente] = useState(null);
  const [montoPagado, setMontoPagado] = useState("");
  const [formaPago, setFormaPago] = useState(FORMA_PAGO_EFECTIVO);
  const [errorGlobal, setErrorGlobal] = useState(null);
  const [confirmando, setConfirmando] = useState(false);
  const [editandoCantidad, setEditandoCantidad] = useState(null);
  const [numeroPreview] = useState(() => numeroFacturaPreview());
  const [datosImpresion, setDatosImpresion] = useState(null);
  const [modalCliente, setModalCliente] = useState(false);

  const searchRef = useRef(null);
  const qtyInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const confirmarRef = useRef(null);
  const carritoRef = useRef(null);
  const totalRef = useRef(null);
  const searchStringRef = useRef(null);
  const editandoRef = useRef(null);

  const focusSearch = useCallback(() => {
    setTimeout(() => searchRef.current?.focus(), 0);
  }, []);

  const cargarProductos = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getProductos({ pageSize: 500 });
      setProductos(res.content || []);
    } catch {
      setProductos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargarProductos(); }, [cargarProductos]);
  useEffect(() => {
    if (!datosImpresion?.idComprobante) return;
    setTimeout(() => window.print(), 300);
  }, [datosImpresion?.idComprobante]);
  useEffect(() => {
    if (editandoCantidad !== null) {
      setTimeout(() => { qtyInputRef.current?.focus(); qtyInputRef.current?.select(); }, 0);
    }
  }, [editandoCantidad]);

  const isBarcode = useMemo(() => /^\d{8,14}$/.test(search.trim()), [search]);

  const productosFiltrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || isBarcode) return [];
    return productos
      .filter((p) => (p.nombre || "").toLowerCase().includes(q))
      .slice(0, 8);
  }, [productos, search, isBarcode]);

  const { subtotal, iva, totalConIva } = useMemo(() => {
    const sub = carrito.reduce((a, l) => a + l.precioUnitario * l.cantidad, 0);
    const iv = Math.round(sub * 0.1);
    return { subtotal: sub, iva: iv, totalConIva: sub + iv };
  }, [carrito]);

  carritoRef.current = carrito;
  totalRef.current = totalConIva;
  searchStringRef.current = search;
  editandoRef.current = editandoCantidad;

  const esEfectivo = formaPago === FORMA_PAGO_EFECTIVO;
  const montoIngresado = parseFloat(String(montoPagado).replace(",", "."));
  const montoNum = esEfectivo ? montoIngresado : totalConIva;
  const montoOk = esEfectivo ? Number.isFinite(montoIngresado) && montoIngresado >= 0 : true;
  const cambio = esEfectivo && montoOk ? Math.max(0, montoIngresado - totalConIva) : 0;

  const puedeConfirmar = carrito.length > 0 && totalConIva > 0 &&
    (esEfectivo ? montoOk && montoIngresado >= totalConIva : true);

  const agregarProducto = useCallback((producto, cantidad) => {
    const stock = parseStockDisponible(producto);
    const precio = parsePrecioVenta(producto);
    if (stock <= 0) { setErrorGlobal("Sin stock disponible."); return; }
    const pesable = esProductoPesable(producto);
    const q = pesable
      ? Math.min(Math.max(0.001, parseFloat(String(cantidad).replace(",", "."))), stock)
      : Math.min(Math.max(1, Math.trunc(Number(cantidad) || 1)), stock);
    if (!Number.isFinite(q) || q <= 0) return;
    setErrorGlobal(null);
    setCarrito((prev) => {
      const idx = prev.findIndex((l) => l.productoId === producto.id);
      if (idx === -1) {
        const line = construirLineaCarrito(producto);
        line.cantidad = q;
        return [...prev, line];
      }
      const line = prev[idx];
      const nc = Math.min(line.cantidad + q, stock);
      if (nc === line.cantidad) return prev;
      const next = [...prev];
      next[idx] = { ...line, cantidad: nc, precioUnitario: precio, stockDisponible: stock };
      return next;
    });
  }, []);

  const handleCambiarCantidad = useCallback((productoId, raw) => {
    setCarrito((prev) => prev.map((line) => {
      if (line.productoId !== productoId) return line;
      const pesable = esProductoPesable(line);
      const v = pesable ? parseFloat(String(raw).replace(",", ".")) : Math.trunc(Number(raw));
      const min = pesable ? 0.001 : 1;
      const q = Math.min(Math.max(min, v), line.stockDisponible);
      return { ...line, cantidad: Number.isFinite(q) ? q : line.cantidad };
    }));
  }, []);

  const handleEliminar = useCallback((productoId) => {
    setCarrito((prev) => prev.filter((l) => l.productoId !== productoId));
    setEditandoCantidad(null);
  }, []);

  const handleCancelarTodo = useCallback(() => {
    setCarrito([]);
    setCliente(null);
    setMontoPagado("");
    setErrorGlobal(null);
    setEditandoCantidad(null);
    focusSearch();
  }, [focusSearch]);

  const handleSearchKeyDown = useCallback(async (e) => {
    if (e.key !== "Enter") return;
    const t = search.trim();
    if (!t) return;
    e.preventDefault();
    setErrorGlobal(null);

    const parsed = parseBarcodeInput(t);
    if (parsed) {
      try {
        const p = await getProductoByCodigo(parsed.barcode);
        if (p) { agregarProducto(p, parsed.quantity); setSearch(""); focusSearch(); }
        else { setErrorGlobal(`No se encontró producto con código "${parsed.barcode}".`); }
      } catch (err) { setErrorGlobal(apiErrorMessage(err) || "Error al buscar por código."); }
      return;
    }

    if (productosFiltrados.length === 1) {
      agregarProducto(productosFiltrados[0], 1);
      setSearch("");
      focusSearch();
    }
  }, [search, productosFiltrados, agregarProducto, focusSearch]);

  const handleGlobalKeyDown = useCallback((e) => {
    const isInput = e.target?.tagName === "INPUT" || e.target?.tagName === "TEXTAREA" || e.target?.tagName === "SELECT";
    const key = e.key;

    if (key === "F2") {
      e.preventDefault();
      const c = carritoRef.current;
      if (c.length > 0) setEditandoCantidad(c[c.length - 1].productoId);
      return;
    }
    if (key === "F6") {
      e.preventDefault();
      const c = carritoRef.current;
      const t = totalRef.current;
      if (c.length > 0 && t > 0) {
        setFormaPago(FORMA_PAGO_EFECTIVO);
        setMontoPagado(String(t));
      }
      return;
    }
    if (key === "F7") { e.preventDefault(); setFormaPago(FORMA_PAGO_EFECTIVO); return; }
    if (key === "F8") { e.preventDefault(); setFormaPago(FORMA_PAGO_TRANSFERENCIA); return; }
    if (key === "F9") {
      e.preventDefault();
      if (puedeConfirmar && !confirmando) confirmarRef.current?.();
      return;
    }
    if (key === "F4") {
      e.preventDefault();
      setModalCliente(true);
      return;
    }
    if (key === "Delete" && !isInput) {
      e.preventDefault();
      const c = carritoRef.current;
      if (c.length > 0) handleEliminar(c[c.length - 1].productoId);
      return;
    }
    if (key === "Escape") {
      if (editandoRef.current !== null) { setEditandoCantidad(null); return; }
      if (searchStringRef.current) { setSearch(""); return; }
      if (carritoRef.current.length > 0) { handleCancelarTodo(); return; }
    }
  }, [puedeConfirmar, confirmando, handleEliminar, handleCancelarTodo]);

  useEffect(() => {
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [handleGlobalKeyDown]);

  const handleConfirmar = useCallback(async () => {
    if (!puedeConfirmar) return;
    setConfirmando(true);
    setErrorGlobal(null);
    const payload = {
      fechaFactura: hoyISO(), tipoFactura: "CONTADO", estado: "PENDIENTE",
      idCliente: cliente?.idCliente ?? cliente?.id ?? null,
      etiquetaCliente: cliente ? labelCliente(cliente) : "Sin nombre",
      lineas: carrito.map((l) => ({ idProducto: l.productoId, cantidad: l.cantidad, precioUnitario: l.precioUnitario, subtotal: l.precioUnitario * l.cantidad })),
      total: subtotal, montoPagado: montoNum, cambio, formaPago,
    };
    try {
      const data = await registrarVentaFactura(payload);
      const numFactura = data?.numeroFactura ?? data?.numero_factura ?? numeroPreview;
      const snap = carrito.map((l) => ({ ...l }));
      const cliSnap = cliente;
      setCarrito([]); setMontoPagado(""); setCliente(null); setEditandoCantidad(null);
      await cargarProductos();
      setDatosImpresion({
        idComprobante: `${Date.now()}-${numFactura}`, fecha: hoyISO(), numero: numFactura,
        cliente: cliSnap, lineas: snap, total: totalConIva, montoPagado: montoNum,
        cambio, tipo: "CONTADO", formaPago, formaPagoLabel: labelFormaPago(formaPago),
      });
      focusSearch();
    } catch (err) {
      setErrorGlobal(apiErrorMessage(err) || "No se pudo registrar la venta.");
    } finally { setConfirmando(false); }
  }, [puedeConfirmar, cliente, carrito, subtotal, montoNum, cambio, formaPago, totalConIva, cargarProductos, numeroPreview, focusSearch]);

  confirmarRef.current = handleConfirmar;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'var(--accent-dim)', border: '1px solid var(--border-accent)' }}>
            <ShoppingCart className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          </div>
          <h1 className="text-sm font-semibold" style={{ color: 'var(--text-1)', fontFamily: 'var(--font-display)' }}>Caja 01 — Venta Rápida</h1>
        </div>
        <button type="button" onClick={() => setModalCliente(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
          style={{ color: 'var(--text-2)' }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-2)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
          <User className="w-3.5 h-3.5" />
          {cliente ? (
            <span style={{ color: 'var(--text-1)' }}>{labelCliente(cliente)}</span>
          ) : (
            <>
              <span>Sin nombre</span>
              <kbd className="ml-0.5 px-1 py-0.5 rounded text-[10px]" style={{ background: 'var(--surface-2)' }}>F4</kbd>
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {errorGlobal && (
        <div className="mx-4 mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-xs shrink-0"
          style={{ border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#fca5a5' }}>
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          {errorGlobal}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex min-h-0 gap-4 px-4 pb-1">
        {/* Left column: search + cart + shortcuts */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">

          {/* Search bar */}
          <div className="pb-1.5 shrink-0 relative" ref={dropdownRef}>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded"
                style={{ border: '1px solid var(--border-accent)', color: 'var(--accent)' }}>
                <span className="text-xs font-bold">|||</span>
              </div>
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Escanee o escriba y presione Enter..."
                disabled={loading}
                autoFocus
                className="w-full rounded-lg pl-12 pr-32 py-3.5 text-base outline-none transition-all disabled:opacity-50"
                style={{
                  background: 'var(--surface-0)',
                  color: 'var(--text-1)',
                  fontFamily: 'var(--font-mono)',
                  border: '2px solid var(--border-accent)',
                }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 16px var(--accent-glow)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--border-accent)'; e.target.style.boxShadow = 'none'; }}
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-[10px]">
                <kbd className="flex items-center gap-1 px-2 py-1 rounded font-bold"
                  style={{ background: 'var(--accent-dim)', border: '1px solid var(--border-accent)', color: 'var(--accent)' }}>
                  <Search className="w-3 h-3" />
                  ENTER
                </kbd>
                <span style={{ color: 'var(--text-3)' }}>agrega</span>
              </div>
            </div>

            {/* Live search dropdown */}
            {productosFiltrados.length > 0 && (
              <div className="absolute left-0 right-0 mt-1 rounded-xl shadow-2xl shadow-black/50 z-50 max-h-64 overflow-y-auto"
                style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                {productosFiltrados.map((p) => {
                  const precio = parsePrecioVenta(p);
                  const stock = parseStockDisponible(p);
                  const pesable = esProductoPesable(p);
                  const sinStock = stock <= 0;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={sinStock}
                      onClick={() => { agregarProducto(p, 1); setSearch(""); focusSearch(); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left disabled:opacity-40 disabled:pointer-events-none"
                      style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-2)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                        {pesable ? <Scale className="w-3.5 h-3.5" style={{ color: 'var(--cyan)' }} /> : <ShoppingCart className="w-3.5 h-3.5" style={{ color: 'var(--text-3)' }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-1)' }}>{p.nombre}</p>
                        <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>
                          {pesable ? `${formatMoney(precio)}/kg` : formatMoney(precio)}
                          {sinStock ? <span className="ml-2" style={{ color: 'var(--red)' }}>Sin stock</span> : <span className="ml-2">{stock} {pesable ? "kg" : "u."}</span>}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cart */}
          <div className="flex items-center justify-between px-3 py-1.5 rounded-t-lg shrink-0"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
              <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-1)', fontFamily: 'var(--font-display)' }}>Carrito</span>
              {carrito.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                  style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>{carrito.length}</span>
              )}
            </div>
            {carrito.length > 0 && (
              <button type="button" onClick={handleCancelarTodo}
                className="p-1 rounded transition-colors" title="Esc"
                style={{ color: 'var(--text-3)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = 'transparent'; }}>
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto border-t-0 rounded-b-lg"
            style={{ border: '1px solid var(--border)', borderTop: 'none', background: 'var(--surface-1)' }}>
            {carrito.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-8" style={{ color: 'var(--text-3)' }}>
                <ShoppingCart className="w-8 h-8 mb-1 opacity-20" />
                <p className="text-[11px]">Vacío</p>
              </div>
            ) : (
              <>
                <div className="flex items-center px-4 py-2 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-3)', borderBottom: '1px solid var(--border)' }}>
                  <span className="w-6 text-center">#</span>
                  <span className="flex-1">Producto</span>
                  <span className="w-20 text-center">Cantidad</span>
                  <span className="w-28 text-right">Precio</span>
                  <span className="w-28 text-right">Importe</span>
                  <span className="w-7" />
                </div>
                <div>
                  {carrito.map((line, idx) => {
                    const pesable = esProductoPesable(line);
                    const sub = line.precioUnitario * line.cantidad;
                    const editando = editandoCantidad === line.productoId;
                    return (
                      <div key={line.productoId} className="px-4 py-4 flex items-center gap-2 group transition-colors"
                        style={{ borderBottom: '1px solid var(--border)' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(26,32,48,0.5)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                        <span className="w-7 text-xs text-center shrink-0" style={{ color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>{idx + 1}</span>
                        <div className="flex-1 min-w-0 flex items-center gap-1.5">
                          {pesable && <Scale className="w-4 h-4 shrink-0" style={{ color: 'var(--cyan)' }} />}
                          <span className="text-base font-semibold truncate" style={{ color: 'var(--text-1)' }}>{line.nombre}</span>
                        </div>
                        {editando ? (
                          <div className="w-28 text-center">
                            <input ref={qtyInputRef} type="number"
                              min={pesable ? 0.001 : 1} max={line.stockDisponible} step={pesable ? 0.1 : 1}
                              value={line.cantidad}
                              onChange={(e) => handleCambiarCantidad(line.productoId, e.target.value)}
                              onBlur={() => setEditandoCantidad(null)}
                              onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Tab") setEditandoCantidad(null); e.stopPropagation(); }}
                              className="w-20 rounded px-2 py-1.5 text-base text-center outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              style={{ border: '1px solid var(--border-accent)', background: 'var(--surface-0)', color: 'var(--text-1)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}
                            />
                          </div>
                        ) : (
                          <button type="button" onClick={() => setEditandoCantidad(line.productoId)}
                            className="w-24 text-center text-base cursor-pointer transition-colors"
                            style={{ color: 'var(--text-2)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}
                            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-1)'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-2)'}
                            title="F2">
                            {line.cantidad} {pesable ? "kg" : "u."}
                          </button>
                        )}
                        <span className="w-32 text-right text-base shrink-0" style={{ color: 'var(--text-2)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>{formatMoney(line.precioUnitario)}</span>
                        <span className="w-32 text-right text-base font-bold shrink-0" style={{ color: 'var(--text-1)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>{formatMoney(sub)}</span>
                        <button type="button" onClick={() => handleEliminar(line.productoId)}
                          className="p-1.5 rounded opacity-0 group-hover:opacity-100 transition-all shrink-0" title="Supr"
                          style={{ color: 'var(--text-3)' }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = 'transparent'; }}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Keyboard shortcuts footer */}
          <div className="shrink-0 flex items-center gap-1.5 pt-1.5">
            <Keyboard className="w-4 h-4 mr-0.5" style={{ color: 'var(--accent)' }} />
            {[
              { k: "Enter", v: "agregar" },
              { k: "F2", v: "cant." },
              { k: "Supr", v: "quitar" },
              { k: "F6", v: "exacto" },
              { k: "F7", v: "efec." },
              { k: "F8", v: "transf." },
              { k: "F9", v: "cobrar" },
              { k: "Esc", v: "limpiar" },
            ].map(({ k, v }) => (
              <span key={k} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 transition-colors"
                style={{ background: 'rgba(26,32,48,0.7)', border: '1px solid var(--border-accent)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.borderColor = 'var(--border-accent)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(26,32,48,0.7)'; e.currentTarget.style.borderColor = 'var(--border-accent)'; }}>
                <kbd className="text-[10px] font-bold tabular-nums" style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{k}</kbd>
                <span className="text-[10px]" style={{ color: 'var(--text-2)' }}>{v}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Payment panel — fills full height */}
        <div className="w-[420px] shrink-0 flex flex-col rounded-xl overflow-hidden"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
          {/* BIG total */}
          <div className="px-5 pt-4 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-3)' }}>Total a cobrar</p>
            <p className="text-5xl font-black leading-none tracking-tight"
              style={{ color: 'var(--accent)', fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>
              {formatMoney(totalConIva)}
            </p>
            {carrito.length > 0 && (
              <div className="flex gap-4 mt-2 text-[11px]" style={{ color: 'var(--text-3)' }}>
                <span>{carrito.length} {carrito.length === 1 ? "ítem" : "ítems"}</span>
                <span>Sub {formatMoney(subtotal)}</span>
                <span>IVA {formatMoney(iva)}</span>
              </div>
            )}
          </div>

          {/* Payment method */}
          <div className="px-4 py-3 flex gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
            <button type="button" onClick={() => setFormaPago(FORMA_PAGO_EFECTIVO)}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-semibold transition-all"
              style={{
                border: esEfectivo ? '1px solid var(--border-accent)' : '1px solid var(--surface-3)',
                background: esEfectivo ? 'var(--accent-dim)' : 'var(--surface-0)',
                color: esEfectivo ? 'var(--accent)' : 'var(--text-3)',
              }}>
              <Banknote className="w-5 h-5" />
              Efectivo <kbd className="ml-0.5 px-1.5 py-0.5 rounded text-[10px] font-normal"
                style={{ background: 'var(--surface-2)' }}>F7</kbd>
            </button>
            <button type="button" onClick={() => setFormaPago(FORMA_PAGO_TRANSFERENCIA)}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-semibold transition-all"
              style={{
                border: !esEfectivo ? '1px solid var(--border-accent)' : '1px solid var(--surface-3)',
                background: !esEfectivo ? 'var(--accent-dim)' : 'var(--surface-0)',
                color: !esEfectivo ? 'var(--accent)' : 'var(--text-3)',
              }}>
              <Landmark className="w-5 h-5" />
              Transf. <kbd className="ml-0.5 px-1.5 py-0.5 rounded text-[10px] font-normal"
                style={{ background: 'var(--surface-2)' }}>F8</kbd>
            </button>
          </div>

          {/* Received + Change */}
          {esEfectivo && (
            <div className="px-5 py-4 grid grid-cols-2 gap-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div>
                <p className="text-xs uppercase mb-1" style={{ color: 'var(--text-3)' }}>Recibido</p>
                <input
                  type="text"
                  inputMode="numeric"
                  value={montoPagado}
                  onChange={(e) => setMontoPagado(e.target.value)}
                  placeholder="0"
                  autoComplete="off"
                  className="w-full bg-transparent text-3xl font-bold outline-none rounded px-2 py-1 -mx-2 tabular-nums focus:bg-[var(--surface-2)]"
                  style={{ color: 'var(--text-1)', fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums' }}
                />
              </div>
              <div className="text-right">
                <p className="text-xs uppercase mb-1" style={{ color: 'var(--text-3)' }}>Vuelto</p>
                <p className="text-3xl font-bold" style={{ color: cambio > 0 ? 'var(--accent)' : 'var(--text-3)', fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>
                  {formatMoney(cambio)}
                </p>
              </div>
            </div>
          )}

          {/* Quick amounts + Confirm */}
          {esEfectivo && (
            <div className="px-4 py-3 flex flex-col gap-2.5 flex-1 overflow-y-auto">
              <div className="grid grid-cols-5 gap-2">
                {QUICK_AMOUNTS.map((amt) => (
                  <button key={amt} type="button" onClick={() => setMontoPagado(String(amt))}
                    className="rounded-lg py-3 text-sm font-semibold transition-all"
                    style={{ border: '1px solid var(--surface-3)', background: 'var(--surface-0)', color: 'var(--text-2)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-accent)'; e.currentTarget.style.color = 'var(--text-1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--surface-3)'; e.currentTarget.style.color = 'var(--text-2)'; }}>
                    {amt >= 1000 ? `${amt / 1000}` : amt}k
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setMontoPagado(String(totalConIva))}
                className="w-full rounded-lg py-3 text-sm font-bold transition-all"
                style={{ border: '1px solid var(--border-accent)', background: 'var(--accent-dim)', color: 'var(--accent)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(34,197,94,0.2)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--accent-dim)'}>
                Monto exacto <kbd className="ml-1 px-2 py-0.5 rounded text-[10px] font-normal"
                  style={{ background: 'rgba(11,15,20,0.6)' }}>F6</kbd>
              </button>
              <div className="flex-1 min-h-2" />
              <button type="button" disabled={!puedeConfirmar || confirmando} onClick={handleConfirmar}
                className="w-full rounded-xl font-black py-5 text-lg disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 shrink-0"
                style={{ background: 'var(--accent)', color: 'var(--surface-0)', boxShadow: '0 4px 20px var(--accent-glow)' }}
                onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.background = 'var(--accent-hover)')}
                onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.background = 'var(--accent)')}>
                <Check className="w-6 h-6" strokeWidth={3} />
                {confirmando ? "Registrando..." : "COBRAR"}
                <kbd className="px-2 py-0.5 rounded text-[11px] font-normal"
                  style={{ background: 'rgba(11,15,20,0.3)' }}>F9</kbd>
              </button>
            </div>
          )}

          {/* Confirm button (transfer) */}
          {!esEfectivo && (
            <div className="px-4 py-4 flex flex-col gap-2 flex-1 overflow-y-auto">
              <div className="flex-1 min-h-2" />
              <button type="button" disabled={!puedeConfirmar || confirmando} onClick={handleConfirmar}
                className="w-full rounded-xl font-black py-5 text-lg disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 shrink-0"
                style={{ background: 'var(--accent)', color: 'var(--surface-0)', boxShadow: '0 4px 20px var(--accent-glow)' }}
                onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.background = 'var(--accent-hover)')}
                onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.background = 'var(--accent)')}>
                <Check className="w-6 h-6" strokeWidth={3} />
                {confirmando ? "Registrando..." : "COBRAR"}
                <kbd className="px-2 py-0.5 rounded text-[11px] font-normal"
                  style={{ background: 'rgba(11,15,20,0.3)' }}>F9</kbd>
              </button>
            </div>
          )}
        </div>
      </div>

      <ComprobanteImpresion datos={datosImpresion} />

      <ClienteOpcional
        cliente={cliente}
        onSeleccionar={setCliente}
        onQuitar={() => setCliente(null)}
        abierto={modalCliente}
        onCerrar={() => setModalCliente(false)}
      />
    </div>
  );
}
