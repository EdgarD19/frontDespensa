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

  const subtotal = useMemo(() => carrito.reduce((a, l) => a + l.precioUnitario * l.cantidad, 0), [carrito]);
  const iva = Math.round(subtotal * 0.1);
  const totalConIva = subtotal + iva;

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

    if (e.key === "F2") {
      e.preventDefault();
      if (carrito.length > 0) setEditandoCantidad(carrito[carrito.length - 1].productoId);
    }
    if (e.key === "F6") {
      e.preventDefault();
      if (carrito.length > 0 && totalConIva > 0) {
        setFormaPago(FORMA_PAGO_EFECTIVO);
        setMontoPagado(String(totalConIva));
      }
    }
    if (e.key === "F7") { e.preventDefault(); setFormaPago(FORMA_PAGO_EFECTIVO); }
    if (e.key === "F8") { e.preventDefault(); setFormaPago(FORMA_PAGO_TRANSFERENCIA); }
    if (e.key === "F9") {
      e.preventDefault();
      if (puedeConfirmar && !confirmando) confirmarRef.current?.();
    }
    if (e.key === "F4") {
      e.preventDefault();
      setModalCliente(true);
    }
    if (e.key === "Delete" && !isInput) {
      e.preventDefault();
      if (carrito.length > 0) handleEliminar(carrito[carrito.length - 1].productoId);
    }
    if (e.key === "Escape") {
      if (editandoCantidad !== null) { setEditandoCantidad(null); return; }
      if (search) { setSearch(""); return; }
      if (carrito.length > 0) { handleCancelarTodo(); return; }
    }
  }, [carrito, totalConIva, puedeConfirmar, confirmando, search, editandoCantidad, handleEliminar, handleCancelarTodo]);

  useEffect(() => {
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [handleGlobalKeyDown]);

  const handleConfirmar = async () => {
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
  };

  confirmarRef.current = handleConfirmar;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#1e1e24] shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20">
            <ShoppingCart className="w-4 h-4 text-[#22c55e]" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-[#f1f1f3]">Caja 01 — Venta Rápida</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setModalCliente(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs hover:bg-[#1a1f2e] transition-colors">
            <User className="w-3.5 h-3.5" />
            {cliente ? (
              <span className="text-[#e1e1eb]">{labelCliente(cliente)}</span>
            ) : (
              <>
                <span className="text-[#5a5a6e]">Sin nombre</span>
                <kbd className="ml-0.5 px-1 py-0.5 rounded bg-[#1a1f2e] text-[10px]">F4</kbd>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {errorGlobal && (
        <div className="mx-4 mt-2 flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200 shrink-0">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          {errorGlobal}
        </div>
      )}

      {/* Main content — carrito (con buscador y atajos) + panel de pago */}
      <div className="flex-1 flex min-h-0 gap-4 px-4 pb-1">
        {/* Left column: search + cart + shortcuts */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">

          {/* Search bar */}
          <div className="pb-1.5 shrink-0 relative" ref={dropdownRef}>
            <div className="relative">
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center border border-[#22c55e]/60 rounded text-[#22c55e]">
                <span className="text-[10px] font-bold">|||</span>
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
                className="w-full rounded-lg border-2 border-[#22c55e]/50 bg-[#0a0c0e] pl-10 pr-28 py-2.5 text-sm text-[#f1f1f3] placeholder:text-[#3a3a4a] focus:border-[#22c55e] focus:shadow-[0_0_12px_rgba(34,197,94,0.15)] outline-none transition-all disabled:opacity-50 font-mono"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-[10px]">
                <kbd className="flex items-center gap-1 px-2 py-1 rounded bg-[#22c55e]/15 border border-[#22c55e]/30 text-[#22c55e] font-bold">
                  <Search className="w-3 h-3" />
                  ENTER
                </kbd>
                <span className="text-[#3a3a4a]">agrega</span>
              </div>
            </div>

            {/* Live search dropdown */}
            {productosFiltrados.length > 0 && (
              <div className="absolute left-0 right-0 mt-1 rounded-xl border border-[#1e1e24] bg-[#0d1014] shadow-2xl shadow-black/50 z-50 max-h-64 overflow-y-auto">
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
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#151a24] transition-colors text-left disabled:opacity-40 disabled:pointer-events-none border-b border-[#1e1e24] last:border-b-0"
                    >
                      <div className="w-7 h-7 rounded-lg bg-[#151a24] flex items-center justify-center shrink-0 border border-[#1e1e24]">
                        {pesable ? <Scale className="w-3.5 h-3.5 text-[#06b6d4]" /> : <ShoppingCart className="w-3.5 h-3.5 text-[#5a5a6e]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#e1e1eb] truncate">{p.nombre}</p>
                        <p className="text-[10px] text-[#5a5a6e]">
                          {pesable ? `${formatMoney(precio)}/kg` : formatMoney(precio)}
                          {sinStock ? <span className="text-rose-400 ml-2">Sin stock</span> : <span className="ml-2">{stock} {pesable ? "kg" : "u."}</span>}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cart */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-[#0f1115] border border-[#1e1e24] rounded-t-lg shrink-0">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-3.5 h-3.5 text-[#22c55e]" />
              <span className="text-[11px] font-semibold text-[#e1e1eb] uppercase tracking-wide">Carrito</span>
              {carrito.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-[#22c55e]/20 text-[#22c55e] text-[9px] font-bold">{carrito.length}</span>
              )}
            </div>
            {carrito.length > 0 && (
              <button type="button" onClick={handleCancelarTodo}
                className="p-1 rounded text-[#5a5a6e] hover:text-rose-400 hover:bg-rose-500/10 transition-colors" title="Esc">
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto border border-[#1e1e24] border-t-0 bg-[#0f1115]">
            {carrito.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-[#3a3a4a] py-8">
                <ShoppingCart className="w-8 h-8 mb-1 opacity-20" />
                <p className="text-[11px]">Vacío</p>
              </div>
            ) : (
              <>
                <div className="flex items-center px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#3a3a4a] border-b border-[#1e1e24]">
                  <span className="w-6 text-center">#</span>
                  <span className="flex-1">Producto</span>
                  <span className="w-20 text-center">Cantidad</span>
                  <span className="w-28 text-right">Precio</span>
                  <span className="w-28 text-right">Importe</span>
                  <span className="w-7" />
                </div>
                <div className="divide-y divide-[#1e1e24]">
                  {carrito.map((line, idx) => {
                    const pesable = esProductoPesable(line);
                    const sub = line.precioUnitario * line.cantidad;
                    const editando = editandoCantidad === line.productoId;
                    return (
                      <div key={line.productoId} className="px-4 py-3 flex items-center gap-2 group hover:bg-[#1a1f2e]/50 transition-colors">
                        <span className="w-6 text-[11px] text-[#3a3a4a] text-center shrink-0 tabular-nums">{idx + 1}</span>
                        <div className="flex-1 min-w-0 flex items-center gap-1.5">
                          {pesable && <Scale className="w-3.5 h-3.5 text-[#06b6d4] shrink-0" />}
                          <span className="text-sm font-semibold text-[#e1e1eb] truncate">{line.nombre}</span>
                        </div>
                        {editando ? (
                          <div className="w-20 text-center">
                            <input ref={qtyInputRef} type="number"
                              min={pesable ? 0.001 : 1} max={line.stockDisponible} step={pesable ? 0.1 : 1}
                              value={line.cantidad}
                              onChange={(e) => handleCambiarCantidad(line.productoId, e.target.value)}
                              onBlur={() => setEditandoCantidad(null)}
                              onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Tab") setEditandoCantidad(null); e.stopPropagation(); }}
                              className="w-16 rounded border border-[#22c55e]/50 bg-[#0a0c0e] px-2 py-1 text-sm text-[#f1f1f3] text-center tabular-nums outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>
                        ) : (
                          <button type="button" onClick={() => setEditandoCantidad(line.productoId)}
                            className="w-20 text-center text-sm text-[#9a9aac] hover:text-[#e1e1eb] tabular-nums cursor-pointer" title="F2">
                            {line.cantidad} {pesable ? "kg" : "u."}
                          </button>
                        )}
                        <span className="w-28 text-right text-sm text-[#9a9aac] tabular-nums shrink-0">{formatMoney(line.precioUnitario)}</span>
                        <span className="w-28 text-right text-sm font-bold text-[#e1e1eb] tabular-nums shrink-0">{formatMoney(sub)}</span>
                        <button type="button" onClick={() => handleEliminar(line.productoId)}
                          className="p-1 rounded text-[#3a3a4a] hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all shrink-0" title="Supr">
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
            <Keyboard className="w-4 h-4 text-[#22c55e] mr-0.5" />
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
              <span key={k} className="inline-flex items-center gap-1.5 rounded-lg bg-[#1a1f2e]/70 border border-[#22c55e]/15 px-2 py-1 hover:bg-[#1a1f2e] hover:border-[#22c55e]/30 transition-colors">
                <kbd className="text-[10px] font-bold text-[#22c55e]/80 tabular-nums">{k}</kbd>
                <span className="text-[10px] text-[#9a9aac]">{v}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Payment panel — fills full height */}
        <div className="w-[420px] shrink-0 flex flex-col bg-[#0d1014] border border-[#1e1e24] rounded-xl overflow-hidden">
          {/* BIG total */}
          <div className="px-5 pt-4 pb-3 border-b border-[#1e1e24]">
            <p className="text-[10px] text-[#5a5a6e] uppercase tracking-widest mb-1">Total a cobrar</p>
            <p className="text-5xl font-black text-[#22c55e] tabular-nums leading-none tracking-tight">
              {formatMoney(totalConIva)}
            </p>
            {carrito.length > 0 && (
              <div className="flex gap-4 mt-2 text-[11px] text-[#5a5a6e]">
                <span>{carrito.length} {carrito.length === 1 ? "ítem" : "ítems"}</span>
                <span>Sub {formatMoney(subtotal)}</span>
                <span>IVA {formatMoney(iva)}</span>
              </div>
            )}
          </div>

          {/* Payment method */}
          <div className="px-4 py-3 flex gap-2 border-b border-[#1e1e24]">
            <button type="button" onClick={() => setFormaPago(FORMA_PAGO_EFECTIVO)}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg border px-3 py-3 text-sm font-semibold transition-colors ${
                esEfectivo ? "border-[#22c55e]/50 bg-[#22c55e]/15 text-[#22c55e]" : "border-[#2a2a32] bg-[#0d0d0f] text-[#5a5a6e] hover:border-[#3a3a48]"
              }`}>
              <Banknote className="w-5 h-5" />
              Efectivo <kbd className="ml-0.5 px-1.5 py-0.5 rounded bg-[#1a1f2e]/80 text-[10px] font-normal">F7</kbd>
            </button>
            <button type="button" onClick={() => setFormaPago(FORMA_PAGO_TRANSFERENCIA)}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg border px-3 py-3 text-sm font-semibold transition-colors ${
                !esEfectivo ? "border-[#22c55e]/50 bg-[#22c55e]/15 text-[#22c55e]" : "border-[#2a2a32] bg-[#0d0d0f] text-[#5a5a6e] hover:border-[#3a3a48]"
              }`}>
              <Landmark className="w-5 h-5" />
              Transf. <kbd className="ml-0.5 px-1.5 py-0.5 rounded bg-[#1a1f2e]/80 text-[10px] font-normal">F8</kbd>
            </button>
          </div>

          {/* Received + Change */}
          {esEfectivo && (
            <div className="px-5 py-4 grid grid-cols-2 gap-4 border-b border-[#1e1e24]">
              <div>
                <p className="text-xs text-[#5a5a6e] uppercase mb-1">Recibido</p>
                <p className="text-3xl font-bold text-[#e1e1eb] tabular-nums">{montoPagado || "0"}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#5a5a6e] uppercase mb-1">Vuelto</p>
                <p className={`text-3xl font-bold tabular-nums ${cambio > 0 ? "text-[#22c55e]" : "text-[#5a5a6e]"}`}>
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
                    className="rounded-lg border border-[#2a2a32] bg-[#0d0d0f] py-3 text-sm font-semibold text-[#9a9aac] hover:border-[#22c55e]/30 hover:text-[#e1e1eb] transition-colors tabular-nums">
                    {amt >= 1000 ? `${amt / 1000}` : amt}k
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setMontoPagado(String(totalConIva))}
                className="w-full rounded-lg border border-[#22c55e]/40 bg-[#22c55e]/10 py-3 text-sm font-bold text-[#22c55e] hover:bg-[#22c55e]/20 transition-colors">
                Monto exacto <kbd className="ml-1 px-2 py-0.5 rounded bg-[#0d0d0f]/60 text-[10px] font-normal">F6</kbd>
              </button>
              <div className="flex-1 min-h-2" />
              <button type="button" disabled={!puedeConfirmar || confirmando} onClick={handleConfirmar}
                className="w-full rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-[#0d0d0f] font-black py-5 text-lg disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#22c55e]/20 shrink-0">
                <Check className="w-6 h-6" strokeWidth={3} />
                {confirmando ? "Registrando..." : "COBRAR"}
                <kbd className="px-2 py-0.5 rounded bg-[#0d0d0f]/30 text-[11px] font-normal">F9</kbd>
              </button>
            </div>
          )}

          {/* Confirm button (transfer) */}
          {!esEfectivo && (
            <div className="px-4 py-4 flex flex-col gap-2 flex-1 overflow-y-auto">
              <div className="flex-1 min-h-2" />
              <button type="button" disabled={!puedeConfirmar || confirmando} onClick={handleConfirmar}
                className="w-full rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-[#0d0d0f] font-black py-5 text-lg disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#22c55e]/20 shrink-0">
                <Check className="w-6 h-6" strokeWidth={3} />
                {confirmando ? "Registrando..." : "COBRAR"}
                <kbd className="px-2 py-0.5 rounded bg-[#0d0d0f]/30 text-[11px] font-normal">F9</kbd>
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
