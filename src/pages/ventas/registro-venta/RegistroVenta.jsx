import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Search, ShoppingCart, Trash2, Scale,
  Banknote, Landmark, AlertTriangle, RotateCcw, Check,
  ArrowLeft, Barcode, X,
} from "lucide-react";
import { getProductos, getProductoByCodigo } from "../../../api/productosApi";
import { getClientes } from "../../../api/clientesApi";
import { registrarVentaFactura } from "../../../api/ventasApi";
import { apiErrorMessage } from "../../../api/errors";
import ComprobanteImpresion from "./ComprobanteImpresion";
import CantidadInput from "../../../components/ui/CantidadInput";
import {
  parsePrecioVenta, parseStockDisponible, esProductoPesable, formatMoney,
  labelCliente, docCliente, labelFormaPago, hoyISO,
  FORMA_PAGO_EFECTIVO, FORMA_PAGO_TRANSFERENCIA,
  parseBarcodeInput,
} from "./utils";

const QUICK_AMOUNTS = [5000, 10000, 20000, 50000, 100000];

// Estilo compartido con Registrar Factura / Lista de Facturas / Inventario:
// fondo negro, tarjetas con borde white/10, etiquetas en mayúsculas espaciadas.
const MONO = { fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" };
const CARD = "rounded-none border border-white/10 bg-white/[0.02]";
const LABEL = "text-[11px] font-medium uppercase tracking-[0.14em] text-white/50";
const TH = "sticky top-0 z-10 bg-[#0a0a0c] py-2.5 px-2 font-medium";

const ATAJOS = [
  ["F2", "Editar último"],
  ["Supr", "Quitar último"],
  ["F6", "Monto exacto"],
  ["F7", "Efectivo"],
  ["F8", "Transferencia"],
  ["F9", "Cobrar"],
  ["Esc", "Cancelar"],
];

function Kbd({ children, tone = "neutral" }) {
  const estilos = tone === "accent"
    ? "border-black/20 bg-black/15 text-black/70"
    : "border-white/10 bg-white/[0.06] text-white/60";
  return (
    <kbd className={`border px-1.5 py-1 text-[10px] font-medium leading-none ${estilos}`}>
      {children}
    </kbd>
  );
}


function construirLineaCarrito(producto) {
  return {
    productoId: producto.id,
    nombre: producto.nombre || "—",
    codigoBarras: producto.codigoBarras || "",
    precioUnitario: parsePrecioVenta(producto),
    cantidad: esProductoPesable(producto) ? 1.0 : 1,
    stockDisponible: parseStockDisponible(producto),
    productoPesable: producto.productoPesable,
    unidadMedida: producto.unidadMedida ?? producto.nombreUnidadMedida ?? "",
    unitAbbreviation: producto.unitAbbreviation ?? "",
    // Tasa de IVA del producto (5 / 10 / 0). El precio de venta ya la incluye.
    tasaIva: Number.isFinite(Number(producto.iva)) ? Number(producto.iva) : 10,
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
  const [datosImpresion, setDatosImpresion] = useState(null);
  const [clienteQuery, setClienteQuery] = useState("");
  const [clientesOpciones, setClientesOpciones] = useState([]);
  const [mostrarClientes, setMostrarClientes] = useState(false);
  const [cargandoClientes, setCargandoClientes] = useState(false);

  // Sin dependencias locales: el habilitado del cobro, el número de factura y
  // el timbrado los resuelve el backend (POST /api/facturas-venta).

  const searchRef = useRef(null);
  const qtyInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const clienteDropdownRef = useRef(null);
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const seleccionJustoAhoraRef = useRef(false);
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
    let raf1, raf2;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        window.print();
        setDatosImpresion(null);
      });
    });
    return () => {
      if (raf1) cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [datosImpresion?.idComprobante]);
  useEffect(() => {
    if (editandoCantidad !== null) {
      setTimeout(() => {
        const el = qtyInputRef.current?.tagName === "INPUT"
          ? qtyInputRef.current
          : qtyInputRef.current?.querySelector("input");
        el?.focus();
        el?.select();
      }, 0);
    }
  }, [editandoCantidad]);

  const isBarcode = useMemo(() => /^\d{8,14}$/.test(search.trim()), [search]);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setMostrarDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (clienteDropdownRef.current && !clienteDropdownRef.current.contains(e.target)) setMostrarClientes(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Búsqueda de clientes (server-side) con debounce mientras el selector está abierto.
  useEffect(() => {
    if (cliente || !mostrarClientes) return;
    let activo = true;
    const t = setTimeout(async () => {
      setCargandoClientes(true);
      try {
        const res = await getClientes({ search: clienteQuery.trim(), pageSize: 8 });
        const body = res?.data ?? {};
        if (activo) setClientesOpciones(Array.isArray(body.content) ? body.content : []);
      } catch {
        if (activo) setClientesOpciones([]);
      } finally {
        if (activo) setCargandoClientes(false);
      }
    }, 250);
    return () => { activo = false; clearTimeout(t); };
  }, [cliente, clienteQuery, mostrarClientes]);

  const productosFiltrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return mostrarDropdown && !isBarcode ? productos.slice(0, 8) : [];
    }
    if (isBarcode) return [];
    return productos
      .filter((p) => (p.nombre || "").toLowerCase().includes(q))
      .slice(0, 8);
  }, [productos, search, isBarcode, mostrarDropdown]);

  // El precio de venta del back es IVA incluido y la tasa depende de cada
  // producto (5% / 10% / exento). Se replica el cálculo del back (CalculoIvaUtil)
  // para que el total a cobrar coincida con el total de la factura emitida.
  const totalConIva = useMemo(() => {
    const r2 = (n) => Math.round(n * 100) / 100;
    const total = carrito.reduce((a, l) => {
      const tasa = Number.isFinite(Number(l.tasaIva)) ? Number(l.tasaIva) : 10;
      const baseUnit = Math.round((l.precioUnitario / (1 + tasa / 100)) * 1e6) / 1e6;
      const base = r2(baseUnit * l.cantidad);
      const iva = r2((base * tasa) / 100);
      return a + base + iva;
    }, 0);
    return r2(total);
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

  // Solo presentación: cuánto falta para cubrir el total y por qué está deshabilitado "Cobrar".
  const faltante = esEfectivo && montoPagado !== "" && montoOk
    ? Math.max(0, totalConIva - montoIngresado)
    : 0;
  const ayudaCobro = carrito.length === 0
    ? "Agregá productos para habilitar el cobro."
    : esEfectivo && !puedeConfirmar
      ? "Ingresá un monto recibido igual o mayor al total."
      : null;

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

  // Pase automático desde Anulación (refacturación rápida): antes se leía de
  // localStorage (despensa_refacturacion_v1) y se precargaba el carrito. Con la
  // Caja 100% contra el back ese puente queda fuera; la búsqueda de tickets y la
  // refacturación pasarán a /api/facturas-venta/buscar cuando exista contrato.

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

  const seleccionarCliente = useCallback((c) => {
    setCliente(c);
    setClienteQuery("");
    setMostrarClientes(false);
  }, []);

  const quitarCliente = useCallback(() => {
    setCliente(null);
    setClienteQuery("");
  }, []);

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
        if (p) { seleccionJustoAhoraRef.current = true; agregarProducto(p, parsed.quantity); setSearch(""); setMostrarDropdown(false); focusSearch(); }
        else { setErrorGlobal(`No se encontró producto con código "${parsed.barcode}".`); }
      } catch (err) { setErrorGlobal(apiErrorMessage(err) || "Error al buscar por código."); }
      return;
    }

    if (productosFiltrados.length === 1) {
      seleccionJustoAhoraRef.current = true;
      agregarProducto(productosFiltrados[0], 1);
      setSearch("");
      setMostrarDropdown(false);
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

  // Cierre de una venta registrada contra el backend: limpia el carrito, arma el
  // comprobante imprimible y refresca el catálogo. El número de factura y el
  // timbrado vienen del back; acá no se persiste nada en el navegador.
  const finalizarVenta = useCallback(async ({ numFactura, timbradoInfo }) => {
    const snap = carrito.map((l) => ({ ...l }));
    const cliSnap = cliente;
    setCarrito([]); setMontoPagado(""); setCliente(null); setEditandoCantidad(null);
    await cargarProductos();
    setDatosImpresion({
      idComprobante: `${Date.now()}-${numFactura}`, fecha: hoyISO(), numero: numFactura,
      cliente: cliSnap, lineas: snap, total: totalConIva, montoPagado: montoNum,
      cambio, tipo: "CONTADO", formaPago, formaPagoLabel: labelFormaPago(formaPago),
      timbrado: timbradoInfo ?? null,
    });
    focusSearch();
  }, [carrito, cliente, totalConIva, montoNum, cambio, formaPago, cargarProductos, focusSearch]);

  const handleConfirmar = useCallback(async () => {
    if (!puedeConfirmar) return;
    setConfirmando(true);
    setErrorGlobal(null);
    // El back toma el precio vigente de cada producto (IVA incluido), calcula el
    // IVA por tasa, descuenta stock y asigna la fecha de emisión (no se envía:
    // el back usa su fecha local, evitando desfases de zona horaria del navegador).
    const payload = {
      idCliente: cliente?.idCliente ?? cliente?.id ?? undefined,
      detalles: carrito.map((l) => ({ idProducto: l.productoId, cantidad: l.cantidad })),
    };
    try {
      const data = await registrarVentaFactura(payload);
      // El back asigna el número de factura y el timbrado de venta vigente.
      const numFactura = data?.numeroFactura ?? data?.numero_factura;
      const timbradoInfo = data?.numeroTimbrado ? { numeroTimbrado: data.numeroTimbrado } : null;
      await finalizarVenta({ numFactura, timbradoInfo });
    } catch (err) {
      // Sin fallback local: se muestra el error tal cual lo responde el back
      // (p. ej. 409 TIMBRADO_VENTA_NO_VIGENTE si no hay timbrado de venta).
      setErrorGlobal(apiErrorMessage(err) || "No se pudo registrar la venta.");
    } finally { setConfirmando(false); }
  }, [puedeConfirmar, cliente, carrito, finalizarVenta]);

  confirmarRef.current = handleConfirmar;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden px-6">
      {/* Encabezado: mismo patrón que Registrar Factura (flecha + título).
          Si el título de esa pantalla usa otro tamaño, igualá la clase de <h1>. */}
      <header className="flex shrink-0 items-center justify-between gap-4 py-5">
        <div className="flex items-center gap-4">
          <Link to="/ventas" aria-label="Volver"
            className="rounded-none p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-medium text-white">Registrar Venta</h1>
        </div>

        {datosImpresion && (
          <p className="hidden items-center gap-2 text-xs text-white/50 md:flex">
            <Check className="h-4 w-4 text-[var(--accent)]" />
            <span>
              Última venta <span className="text-white/80" style={MONO}>{datosImpresion.numero}</span>
              {" · "}{formatMoney(datosImpresion.total)}
              {datosImpresion.cambio > 0 && <> · vuelto {formatMoney(datosImpresion.cambio)}</>}
            </span>
          </p>
        )}
      </header>

      {errorGlobal && (
        <div role="alert"
          className="mb-3 flex shrink-0 items-start gap-2 rounded-none border border-red-500/30 bg-red-500/10 px-4 py-1.5 text-sm text-red-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex-1">{errorGlobal}</span>
          <button type="button" onClick={() => setErrorGlobal(null)} aria-label="Cerrar aviso"
            className="rounded p-0.5 text-red-300/70 transition-colors hover:text-red-200">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1 gap-5 pb-5">
        {/* ───────── Columna izquierda: búsqueda + carrito ───────── */}
        <section className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex shrink-0 items-start gap-3">
            <div className="relative min-w-0 flex-1" ref={dropdownRef}>
              <label htmlFor="venta-buscar" className={`${LABEL} mb-2 block`}>Productos</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-white/40" />
                <input
                  id="venta-buscar"
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder={loading ? "Cargando productos…" : "Escanear código de barras o buscar por nombre…"}
                  disabled={loading}
                  autoFocus
                  autoComplete="off"
                  className="h-12 w-full rounded-none border border-white/10 bg-white/[0.03] pl-11 pr-24 text-base text-white outline-none transition-colors placeholder:text-white/35 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-dim)] disabled:opacity-50"
                  onFocus={() => {
                    if (seleccionJustoAhoraRef.current) {
                      seleccionJustoAhoraRef.current = false;
                      setMostrarDropdown(false);
                    } else {
                      setMostrarDropdown(true);
                    }
                  }}
                />
                <div className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5 text-xs text-white/40">
                  {search
                    ? <><Kbd>Enter</Kbd> agrega</>
                    : <Barcode className="h-5 w-5 text-white/35" />}
                </div>
              </div>

              {mostrarDropdown && productosFiltrados.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-none border border-white/10 bg-[#0c0c0e] shadow-2xl shadow-black/60">
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
                        onClick={() => { seleccionJustoAhoraRef.current = true; agregarProducto(p, 1); setSearch(""); setMostrarDropdown(false); focusSearch(); }}
                        className="flex w-full items-center gap-3 border-b border-white/5 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-white/[0.05] disabled:pointer-events-none disabled:opacity-40">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none border border-white/10 bg-white/[0.04]">
                          {pesable
                            ? <Scale className="h-4 w-4 text-[var(--cyan)]" />
                            : <ShoppingCart className="h-4 w-4 text-white/40" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-white first-letter:uppercase">{p.nombre}</p>
                          <p className="text-xs text-white/50">{pesable ? `${formatMoney(precio)}/kg` : formatMoney(precio)}</p>
                        </div>
                        {sinStock
                          ? <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-400">Sin stock</span>
                          : <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-white/60" style={MONO}>{stock} {pesable ? "kg" : "u."}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Buscador de cliente: 30% de la fila; el sobrante queda para Productos */}
            <div className="relative w-[30%] shrink-0" ref={clienteDropdownRef}>
              <label htmlFor="venta-cliente" className={`${LABEL} mb-2 block`}>Cliente</label>
              {cliente ? (
                <div className="flex h-12 items-center justify-between gap-2 rounded-none border border-[var(--border-accent)] bg-[var(--accent-dim)] px-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{labelCliente(cliente)}</p>
                    {docCliente(cliente) && <p className="truncate text-xs text-white/50">{docCliente(cliente)}</p>}
                  </div>
                  <button type="button" onClick={quitarCliente} aria-label="Quitar cliente"
                    className="rounded p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                    <input
                      id="venta-cliente"
                      type="text"
                      value={clienteQuery}
                      onChange={(e) => { setClienteQuery(e.target.value); setMostrarClientes(true); }}
                      onFocus={() => setMostrarClientes(true)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") { e.stopPropagation(); setMostrarClientes(false); setClienteQuery(""); }
                      }}
                      placeholder="Buscar por nombre o documento…"
                      autoComplete="off"
                      className="h-12 w-full rounded-none border border-white/10 bg-white/[0.03] pl-9 pr-3 text-sm text-white outline-none transition-colors placeholder:text-white/35 focus:border-[var(--accent)]"
                    />
                  </div>
                  {mostrarClientes && (
                    <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-none border border-white/10 bg-[#0c0c0e] shadow-2xl shadow-black/60">
                      {cargandoClientes && (
                        <p className="px-4 py-3 text-sm text-white/40">Buscando…</p>
                      )}
                      {!cargandoClientes && clientesOpciones.length === 0 && (
                        <p className="px-4 py-3 text-sm text-white/40">Sin resultados.</p>
                      )}
                      {!cargandoClientes && clientesOpciones.map((c) => (
                        <button key={c.id ?? c.idCliente} type="button" onClick={() => seleccionarCliente(c)}
                          className="flex w-full items-center justify-between gap-3 border-b border-white/5 px-4 py-2.5 text-left transition-colors last:border-b-0 hover:bg-white/[0.05]">
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm text-white">{labelCliente(c)}</span>
                            {docCliente(c) && <span className="block truncate text-xs text-white/50">{docCliente(c)}</span>}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Carrito */}
          <div className={`${CARD} flex min-h-0 flex-1 flex-col overflow-hidden`}>
            <div className="flex shrink-0 items-center justify-between px-5 py-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-[var(--accent)]" />
                <h2 className="text-sm font-medium text-white">Carrito</h2>
                {carrito.length > 0 && (
                  <span className="rounded-full bg-[var(--accent-dim)] px-2 py-0.5 text-xs font-semibold text-[var(--accent)]">
                    {carrito.length}
                  </span>
                )}
              </div>
              {carrito.length > 0 && (
                <button type="button" onClick={handleCancelarTodo} title="Esc"
                  className="flex items-center gap-1.5 rounded-none px-2.5 py-1.5 text-xs text-white/50 transition-colors hover:bg-red-500/10 hover:text-red-400">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Vaciar
                </button>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
              {carrito.length === 0 ? (
                <div className="flex h-full min-h-40 flex-col items-center justify-center rounded-none border border-dashed border-white/10 px-6 text-center">
                  <ShoppingCart className="mb-3 h-8 w-8 text-white/15" />
                  <p className="text-sm text-white/50">Todavía no agregaste productos a esta venta.</p>
                  <p className="mt-1 text-xs text-white/35">
                    Escaneá un código o buscá por nombre. Con <span style={MONO}>3*código</span> cargás varias unidades.
                  </p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                      <th scope="col" className={`${TH} w-10 text-center`}>#</th>
                      <th scope="col" className={`${TH} text-left`}>Producto</th>
                      <th scope="col" className={`${TH} w-36 text-center`}>Cantidad</th>
                      <th scope="col" className={`${TH} w-32 text-right`}>Precio</th>
                      <th scope="col" className={`${TH} w-36 text-right`}>Importe</th>
                      <th scope="col" className={`${TH} w-12`}><span className="sr-only">Quitar</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {carrito.map((line, idx) => {
                      const pesable = esProductoPesable(line);
                      const sub = line.precioUnitario * line.cantidad;
                      const editando = editandoCantidad === line.productoId;
                      return (
                        <tr key={line.productoId} className="border-t border-white/5 transition-colors hover:bg-white/[0.03]">
                          <td className="px-2 py-3.5 text-center text-xs text-white/35" style={MONO}>{idx + 1}</td>
                          <td className="w-full max-w-0 px-2 py-3.5">
                            <div className="flex items-center gap-2">
                              {pesable && <Scale className="h-4 w-4 shrink-0 text-[var(--cyan)]" aria-label="Producto pesable" />}
                              <span className="block truncate text-base font-medium text-white first-letter:uppercase">{line.nombre}</span>
                            </div>
                          </td>
                          <td className="px-2 py-2 text-center">
                            {editando ? (
                              <div
                                ref={qtyInputRef}
                                className="text-center"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === "Tab") setEditandoCantidad(null);
                                  e.stopPropagation();
                                }}
                              >
                                <CantidadInput
                                  unidadMedida={pesable ? "KG" : "UN"}
                                  value={line.cantidad}
                                  max={line.stockDisponible}
                                  onChange={(v) => handleCambiarCantidad(line.productoId, v)}
                                  onBlur={() => setEditandoCantidad(null)}
                                  ariaLabel={`Cantidad de ${line.nombre}`}
                                  className="mx-auto w-20"
                                />
                              </div>
                            ) : (
                              <button type="button" onClick={() => setEditandoCantidad(line.productoId)} title="Editar cantidad"
                                className="rounded-none px-3 py-1.5 text-base text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                                style={MONO}>
                                {line.cantidad} {pesable ? "kg" : "u."}
                              </button>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-2 py-3.5 text-right text-base tabular-nums text-white/60">
                            {formatMoney(line.precioUnitario)}
                          </td>
                          <td className="whitespace-nowrap px-2 py-3.5 text-right text-base font-semibold tabular-nums text-white">
                            {formatMoney(sub)}
                          </td>
                          <td className="px-1 py-2 text-right">
                            <button type="button" onClick={() => handleEliminar(line.productoId)}
                              title="Quitar" aria-label={`Quitar ${line.nombre}`}
                              className="rounded-none p-2 text-white/30 transition-colors hover:bg-red-500/10 hover:text-red-400 focus-visible:text-red-400">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-white/10 px-5 py-3 text-xs text-white/45">
              {ATAJOS.map(([tecla, desc]) => (
                <span key={tecla} className="flex items-center gap-1.5">
                  <Kbd>{tecla}</Kbd>{desc}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ───────── Columna derecha: cobro ───────── */}
        <aside className={`${CARD} flex w-[440px] shrink-0 flex-col`}>
          <div className="px-4 pb-3 pt-4">
            <p className={LABEL}>Total a cobrar</p>
            <p className="mt-1 text-3xl font-semibold leading-none tracking-tight text-[var(--accent)]" style={MONO}>
              {formatMoney(totalConIva)}
            </p>
          </div>

          <div className="border-t border-white/10 px-4 py-3">
            <p className={`${LABEL} mb-3`}>Forma de pago</p>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Forma de pago">
              {[
                [FORMA_PAGO_EFECTIVO, "Efectivo", Banknote, "F7"],
                [FORMA_PAGO_TRANSFERENCIA, "Transferencia", Landmark, "F8"],
              ].map(([codigo, texto, Icono, tecla]) => {
                const activo = formaPago === codigo;
                return (
                  <button key={codigo} type="button" aria-pressed={activo} onClick={() => setFormaPago(codigo)}
                    className={`flex items-center justify-center gap-1.5 whitespace-nowrap rounded-none border px-2 py-2 text-sm font-medium transition-colors ${
                      activo
                        ? "border-[var(--border-accent)] bg-[var(--accent-dim)] text-[var(--accent)]"
                        : "border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.06] hover:text-white"
                    }`}>
                    <Icono className="h-[18px] w-[18px]" />
                    {texto}
                    <Kbd>{tecla}</Kbd>
                  </button>
                );
              })}
            </div>
          </div>

          {esEfectivo ? (
            <div className="border-t border-white/10 px-4 py-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="venta-recibido" className={`${LABEL} mb-2 block`}>Recibido</label>
                  <div className="flex h-11 items-center gap-2 rounded-none border border-white/10 bg-white/[0.03] px-3 transition-colors focus-within:border-[var(--accent)]">
                    <span className="text-lg text-white/40">₲</span>
                    <input
                      id="venta-recibido"
                      type="text"
                      inputMode="numeric"
                      value={montoPagado}
                      onChange={(e) => setMontoPagado(e.target.value)}
                      placeholder="0"
                      autoComplete="off"
                      className="w-full min-w-0 bg-transparent text-xl font-semibold text-white outline-none placeholder:text-white/25"
                      style={MONO}
                    />
                  </div>
                </div>
                <div>
                  <p className={`${LABEL} mb-2`}>{faltante > 0 ? "Falta" : "Vuelto"}</p>
                  <div
                    className={`flex h-11 items-center justify-end rounded-none border px-3 text-xl font-semibold ${
                      faltante > 0
                        ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
                        : cambio > 0
                          ? "border-[var(--border-accent)] bg-[var(--accent-dim)] text-[var(--accent)]"
                          : "border-white/10 bg-white/[0.03] text-white/35"
                    }`}
                    style={MONO}>
                    {formatMoney(faltante > 0 ? faltante : cambio)}
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-5 gap-2">
                {QUICK_AMOUNTS.map((amt) => (
                  <button key={amt} type="button" onClick={() => setMontoPagado(String(amt))}
                    className="rounded-none border border-white/10 bg-white/[0.03] py-1.5 text-sm font-medium text-white/70 transition-colors hover:border-[var(--border-accent)] hover:text-white"
                    style={MONO}>
                    {amt / 1000}k
                  </button>
                ))}
              </div>
              <button type="button" disabled={totalConIva <= 0} onClick={() => setMontoPagado(String(totalConIva))}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-none border border-[var(--border-accent)] bg-[var(--accent-dim)] py-2 text-sm font-semibold text-[var(--accent)] transition-all hover:brightness-125 disabled:pointer-events-none disabled:opacity-40">
                Monto exacto <Kbd>F6</Kbd>
              </button>
            </div>
          ) : (
            <div className="border-t border-white/10 px-4 py-3 text-sm text-white/50">
              Se registra el cobro por el total exacto de la venta:{" "}
              <span className="text-white/80" style={MONO}>{formatMoney(totalConIva)}</span>.
            </div>
          )}

          <div className="mt-auto border-t border-white/10 px-4 py-3">
            <button type="button" disabled={!puedeConfirmar || confirmando} onClick={handleConfirmar}
              className="flex w-full items-center justify-center gap-2.5 rounded-none bg-[var(--accent)] py-3 text-base font-semibold text-black transition-colors hover:bg-[var(--accent-hover)] disabled:pointer-events-none disabled:opacity-40"
              style={{ boxShadow: puedeConfirmar ? "0 4px 20px var(--accent-glow)" : "none" }}>
              <Check className="h-5 w-5" strokeWidth={3} />
              {confirmando ? "Registrando…" : "Cobrar"}
              <Kbd tone="accent">F9</Kbd>
            </button>
            {ayudaCobro && <p className="mt-2 text-center text-xs text-white/40">{ayudaCobro}</p>}
          </div>
        </aside>
      </div>

      {datosImpresion && (
        <div className="print-only">
          <ComprobanteImpresion datos={datosImpresion} />
        </div>
      )}
    </div>
  );
}


