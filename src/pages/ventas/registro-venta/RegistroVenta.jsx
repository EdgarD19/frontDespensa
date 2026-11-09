import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import ConfirmModal from "../../../components/ui/ConfirmModal";
import { CARD } from "../../../components/ui/styles";
import PageHeader from "../../../components/ui/PageHeader";
import { Link } from "react-router-dom";
import {
  Search, ShoppingCart, Trash2, Scale, Package,
  Banknote, Landmark, Coins, AlertTriangle, RotateCcw, Check,
  ArrowLeft, Barcode, X, ClipboardList, Loader2,
} from "lucide-react";
import { getProductos, getProductoByCodigo } from "../../../api/productosApi";
import { getClientes } from "../../../api/clientesApi";
import { registrarVentaFactura } from "../../../api/ventasApi";
import { apiErrorMessage } from "../../../api/errors";
import { getConfiguracionEmpresa } from "../../../api/configuracionEmpresaApi";
import { getTimbradoVentaPorFecha } from "../../../api/timbradosVentaApi";
import { crearTransferenciaVenta, getTransferenciasPorEstado, recibirTransferenciaVenta, descartarTransferenciaVenta } from "../../../api/transferenciasVentaApi";
import TicketVenta from "./TicketVenta";
import { printVenta } from "../../../services/printer";
import CantidadInput from "../../../components/ui/CantidadInput";
import {
  parsePrecioVenta, parseStockDisponible, esProductoPesable, formatMoney,
  labelCliente, docCliente, labelFormaPago, hoyISO,
  FORMA_PAGO_EFECTIVO, FORMA_PAGO_TRANSFERENCIA, FORMA_PAGO_MIXTO,
  parseBarcodeInput,
} from "./utils";

const QUICK_AMOUNTS = [5000, 10000, 20000, 50000, 100000];

// Estilo compartido con Registrar Factura / Lista de Facturas / Inventario:
// fondo negro, tarjetas con borde white/10, etiquetas en mayúsculas espaciadas.
const MONO = { fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" };
const LABEL = "text-[11px] font-medium uppercase tracking-[0.14em] text-white/50";
const TH = "sticky top-0 z-10 bg-[#0a0a0c] py-2.5 px-2 font-medium";

const ATAJOS = [
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
  // Pago múltiple: parte transferencia (input) + parte efectivo (resto derivado).
  const [montoTransferencia, setMontoTransferencia] = useState("");
  const [formaPago, setFormaPago] = useState(FORMA_PAGO_EFECTIVO);
  const [errorGlobal, setErrorGlobal] = useState(null);
  const [confirmando, setConfirmando] = useState(false);
  const [editandoCantidad, setEditandoCantidad] = useState(null);
  const [datosImpresion, setDatosImpresion] = useState(null);
  const [clienteQuery, setClienteQuery] = useState("");
  const [clientesOpciones, setClientesOpciones] = useState([]);
  const [clienteInactivo, setClienteInactivo] = useState(null);
  const [mostrarClientes, setMostrarClientes] = useState(false);
  const [cargandoClientes, setCargandoClientes] = useState(false);
  const [empresaConfig, setEmpresaConfig] = useState(null);
  // Modal de transferencias pendientes + contador para el badge
  const [showTransferencias, setShowTransferencias] = useState(false);
  const [pendientesCount, setPendientesCount] = useState(null);
  // Disponibilidad del timbrado de venta: null (cargando) | { estado: "ok" | "sinTimbrado", numero, fechaVencimiento }
  const [timbradoEstado, setTimbradoEstado] = useState(null);
  // Toast corto cuando un escaneo no matchea: no bloquea, se limpia solo en 2 s
  // y el campo queda apto para seguir escaneando.
  const [avisoScan, setAvisoScan] = useState(null); // { titulo, texto, tone: "amber"|"red", icono }
  const avisoScanTimer = useRef(null);
  useEffect(() => () => clearTimeout(avisoScanTimer.current), []);

  // Modal efímero de validación (2 s, no bloquea clicks): lo usan el escáner,
  // producto inactivo, sin precio vigente y tope de stock en el carrito.
  const mostrarAviso = useCallback(({ titulo, texto, tone = "amber", icono = "barcode" }) => {
    clearTimeout(avisoScanTimer.current);
    setAvisoScan({ titulo, texto, tone, icono });
    avisoScanTimer.current = setTimeout(() => setAvisoScan(null), 2000);
  }, []);

  // Alias para el caso puntual de código escaneado sin match.
  const mostrarAvisoScan = useCallback((codigo) => {
    mostrarAviso({
      titulo: "Código no encontrado",
      texto: <>El lector escaneó <span className="font-medium text-white" style={MONO}>{codigo}</span> y no coincide con ningún producto del catálogo.</>,
      tone: "amber",
      icono: "barcode",
    });
  }, [mostrarAviso]);

  useEffect(() => {
    let activo = true;
    getConfiguracionEmpresa()
      .then((data) => {
        if (activo) setEmpresaConfig(data);
      })
      .catch(() => {
        if (activo) setEmpresaConfig(null);
      });
    return () => { activo = false; };
  }, []);

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
  // Disponibilidad del timbrado: SOLO POR FECHA (fechaInicio <= hoy <=
  // fechaVencimiento, el día del vencimiento sigue contando). No depende del
  // flag activo del back ni del endpoint /vigente (que exige activo=true).
  // El estado solo es "ok" (hay timbrado que cubre la fecha) o "sinTimbrado".
  const rechequearTimbrado = useCallback(async () => {
    const hoy = hoyISO();
    try {
      const res = await getTimbradoVentaPorFecha(hoy);
      const t = res?.data ?? null;
      const venc = String(t?.fechaVencimiento ?? "");
      if (!t?.numeroTimbrado) {
        const estado = { estado: "sinTimbrado", numero: null, fechaVencimiento: null };
        setTimbradoEstado(estado);
        return estado;
      }
      const estado = { estado: "ok", numero: t.numeroTimbrado, fechaVencimiento: venc };
      setTimbradoEstado(estado);
      return estado;
    } catch {
      const estado = { estado: "sinTimbrado", numero: null, fechaVencimiento: null };
      setTimbradoEstado(estado);
      return estado;
    }
  }, []);
  useEffect(() => { rechequearTimbrado(); }, [rechequearTimbrado]);
  // Contador de transferencias pendientes (badge del botón). Best-effort: el
  // back corriendo puede no tener aún el módulo → el badge simplemente no se ve.
  const cargarPendientesCount = useCallback(async () => {
    try {
      const lista = await getTransferenciasPorEstado("PENDIENTE");
      setPendientesCount(Array.isArray(lista) ? lista.length : 0);
    } catch {
      setPendientesCount(null);
    }
  }, []);
  useEffect(() => { cargarPendientesCount(); }, [cargarPendientesCount]);
  // Mientras el bloqueo esté activo, re-consultar cada 15 s y al volver el foco
  // a la ventana (por si crearon el timbrado en otra pestaña).
  useEffect(() => {
    if (!timbradoEstado || timbradoEstado.estado === "ok") return;
    const id = setInterval(rechequearTimbrado, 15000);
    const onFocus = () => rechequearTimbrado();
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(id); window.removeEventListener("focus", onFocus); };
  }, [timbradoEstado, rechequearTimbrado]);
  // autoFocus del input no alcanza: mientras `loading` está true el campo está
  // disabled y el foco se pierde al habilitarse. Se enfoca al terminar la carga.
  useEffect(() => {
    if (!loading) focusSearch();
  }, [loading, focusSearch]);
  // Impresión directa por impresora térmica/mock; no usar window.print() del navegador.
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
    const ac = new AbortController();
    const t = setTimeout(async () => {
      setCargandoClientes(true);
      try {
        const res = await getClientes({ search: clienteQuery.trim(), pageSize: 8, signal: ac.signal });
        const body = res?.data ?? {};
        setClientesOpciones(Array.isArray(body.content) ? body.content : []);
      } catch (err) {
        if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError") return;
        setClientesOpciones([]);
      } finally {
        setCargandoClientes(false);
      }
    }, 250);
    return () => { ac.abort(); clearTimeout(t); };
  }, [cliente, clienteQuery, mostrarClientes]);

  // Búsqueda de productos: server-side con debounce (250 ms) via
  // GET /api/productos/buscar?nombre= (ya convertidos al shape del front).
  // Si el server falla, se cae al filtro local sobre el catálogo precargado.
  const [serverProductos, setServerProductos] = useState(null); // null = sin búsqueda vigente
  useEffect(() => {
    const q = search.trim();
    if (!q || isBarcode) { setServerProductos(null); return; }
    const ac = new AbortController();
    const t = setTimeout(async () => {
      try {
        // signal: cancela la request anterior si el usuario sigue escribiendo
        // (sin carreras de respuestas desordenadas ni trabajo desperdiciado).
        const res = await getProductos({ search: q, page: 0, pageSize: 8, sortDir: "asc", signal: ac.signal });
        setServerProductos(Array.isArray(res.content) ? res.content : []);
      } catch (err) {
        if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError") return;
        setServerProductos(null); // fallback al filtro local
      }
    }, 250);
    return () => { ac.abort(); clearTimeout(t); };
  }, [search, isBarcode]);

  const productosFiltrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return mostrarDropdown && !isBarcode ? productos.slice(0, 8) : [];
    }
    if (isBarcode) return [];
    const fuente = serverProductos != null ? serverProductos : productos;
    return fuente
      .filter((p) => (p.nombre || "").toLowerCase().includes(q))
      .slice(0, 8);
  }, [productos, serverProductos, search, isBarcode, mostrarDropdown]);

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

  // "Espejo" de los valores que los atajos de teclado deben leer sin re-render:
  // por regla de React las refs NO se escriben durante el render — el useEffect
  // asegura que la ref quede consistente después del commit (Concurrent-safe).
  useEffect(() => {
    carritoRef.current = carrito;
    totalRef.current = totalConIva;
    searchStringRef.current = search;
    editandoRef.current = editandoCantidad;
  }, [carrito, totalConIva, search, editandoCantidad]);

  const esEfectivo = formaPago === FORMA_PAGO_EFECTIVO;
  const esMixto = formaPago === FORMA_PAGO_MIXTO;
  const montoIngresado = parseFloat(String(montoPagado).replace(",", "."));
  // Mixto: el operador ingresa el monto de la TRANSFERENCIA y el efectivo es
  // el resto (derivado siempre al total exacto; cero carga mental de cuentas).
  const montoTransferenciaNum = esMixto
    ? parseFloat(String(montoTransferencia).replace(",", "."))
    : null;
  const montoTransferenciaOk = esMixto
    ? Number.isFinite(montoTransferenciaNum) && montoTransferenciaNum >= 0 && montoTransferenciaNum <= totalConIva
    : true;
  const efectivoMixto = esMixto && montoTransferenciaOk
    ? Math.round((totalConIva - montoTransferenciaNum) * 100) / 100
    : 0;
  const montoNum = esEfectivo ? montoIngresado : (esMixto ? efectivoMixto : totalConIva);
  const montoOk = esEfectivo ? Number.isFinite(montoIngresado) && montoIngresado >= 0 : (esMixto ? montoTransferenciaOk : true);
  const cambio = esEfectivo && montoOk ? Math.max(0, montoIngresado - totalConIva) : 0;

  const puedeConfirmar = carrito.length > 0 && totalConIva > 0 &&
    montoOk && (esMixto ? montoTransferenciaOk : true) &&
    (!esEfectivo || montoIngresado >= totalConIva) &&
    (!timbradoEstado || timbradoEstado.estado === "ok");

  // Solo presentación: cuánto falta para cubrir el total y por qué está deshabilitado "Cobrar".
  const faltante = esEfectivo && montoPagado !== "" && montoOk
    ? Math.max(0, totalConIva - montoIngresado)
    : 0;
  const ayudaCobro = carrito.length === 0
    ? "Agregá productos para habilitar el cobro."
    : !montoTransferenciaOk
      ? "Ingresá el monto de la transferencia (hasta el total)."
      : esEfectivo && !puedeConfirmar
        ? "Ingresá un monto recibido igual o mayor al total."
        : null;

  const agregarProducto = useCallback((producto, cantidad) => {
    const stock = parseStockDisponible(producto);
    const precio = parsePrecioVenta(producto);
    const nombre = producto?.nombre || producto?.codigoBarras || "El producto";
    // Validaciones de catálogo: inactivo, sin precio vigente, sin stock.
    if (producto?.activo === false) {
      mostrarAviso({
        titulo: "Producto inactivo",
        texto: <> <span className="font-medium text-white">{nombre}</span> está inactivo y no está habilitado para la venta.</>,
        tone: "red",
        icono: "alerta",
      });
      return;
    }
    if (precio <= 0) {
      mostrarAviso({
        titulo: "Sin precio vigente",
        texto: <><span className="font-medium text-white">{nombre}</span> no tiene precio de venta vigente. Cargalo en Inventario → Precios.</>,
        tone: "red",
        icono: "alerta",
      });
      return;
    }
    if (stock <= 0) {
      mostrarAviso({
        titulo: "Sin stock",
        texto: <><span className="font-medium text-white">{nombre}</span> no tiene stock disponible.</>,
        tone: "red",
        icono: "alerta",
      });
      return;
    }
    const pesable = esProductoPesable(producto);
    const q = pesable
      ? Math.min(Math.max(0.001, parseFloat(String(cantidad).replace(",", "."))), stock)
      : Math.min(Math.max(1, Math.trunc(Number(cantidad) || 1)), stock);
    if (!Number.isFinite(q) || q <= 0) return;
    setErrorGlobal(null);
    setCarrito((prev) => {
      const idx = prev.findIndex((l) => l.productoId === producto.id);
      // Producto ya en el carrito: se SUMA la cantidad (segundo escaneo del
      // mismo código = +1, tercero = +2…), siempre respetando el stock.
      if (idx !== -1) {
        const line = prev[idx];
        const nc = Math.min(line.cantidad + q, stock);
        if (nc === line.cantidad) {
          // Tope: el carrito ya acumuló todo el stock disponible del producto.
          mostrarAviso({
            titulo: "Stock al máximo en el carrito",
            texto: <><span className="font-medium text-white">{nombre}</span> ya suma {line.cantidad} y solo hay {stock} disponible.</>,
            tone: "amber",
            icono: "alerta",
          });
          return prev;
        }
        const next = [...prev];
        next[idx] = { ...line, cantidad: nc, precioUnitario: precio, stockDisponible: stock };
        return next;
      }
      const line = construirLineaCarrito(producto);
      line.cantidad = q;
      return [...prev, line];
    });
  }, [mostrarAviso]);

  // Pase automático desde Anulación (refacturación rápida): quedó fuera de este
  // módulo. La búsqueda de tickets y la refacturación pasarán a
  // /api/facturas-venta/buscar cuando exista contrato.

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
    setMontoTransferencia("");
    setErrorGlobal(null);
    setEditandoCantidad(null);
    focusSearch();
  }, [focusSearch]);

  const seleccionarCliente = useCallback((c) => {
    // Clientes inactivos no pueden asignarse a la venta: se avisa con un popup.
    if (c?.activo === false) {
      setClienteInactivo({ nombre: labelCliente(c) });
      setClienteQuery("");
      setMostrarClientes(false);
      return;
    }
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
        if (p) {
          seleccionJustoAhoraRef.current = true;
          agregarProducto(p, parsed.quantity);
          setSearch(""); setMostrarDropdown(false); focusSearch();
        } else {
          // Escaneo sin match: aviso efímero + campo listo para el próximo scan
          // (el input se limpia solo; el banner rojo queda para errores reales).
          mostrarAvisoScan(parsed.barcode);
          setSearch("");
          focusSearch();
        }
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
  }, [search, productosFiltrados, agregarProducto, focusSearch, mostrarAvisoScan]);

  const handleGlobalKeyDown = useCallback((e) => {
    const isInput = e.target?.tagName === "INPUT" || e.target?.tagName === "TEXTAREA" || e.target?.tagName === "SELECT";
    const key = e.key;

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
  const finalizarVenta = useCallback(async ({ numFactura, timbradoInfo, fechaVenta }) => {
    const snap = carrito.map((l) => ({ ...l }));
    const cliSnap = cliente;
    const mixtoSnap = esMixto
      ? { efectivo: efectivoMixto, transferencia: Math.round(montoTransferenciaNum ?? 0) }
      : null;
    // Reset completo del cobro (la forma de pago vuelve a Efectivo, el valor
    // más común en un POS, con menos esfuerzo para la siguiente venta).
    setCarrito([]); setMontoPagado(""); setMontoTransferencia(""); setCliente(null); setEditandoCantidad(null);
    setFormaPago(FORMA_PAGO_EFECTIVO);
    await cargarProductos();
    const datosTicket = {
      idComprobante: `${Date.now()}-${numFactura}`,
      // fechaVenta viene del back (fechaCreacion, con hora); fallback: hoy local
      fecha: fechaVenta || hoyISO(),
      numero: numFactura,
      cliente: cliSnap,
      lineas: snap,
      total: totalConIva,
      montoPagado: montoNum,
      // Pago múltiple: el ticket imprime el desglose Efectivo + Transferencia.
      montoMixto: mixtoSnap,
      cambio,
      tipo: "CONTADO",
      formaPago,
      formaPagoLabel: labelFormaPago(formaPago),
      timbrado: timbradoInfo ?? null,
      ...(empresaConfig || {}),
      empresaNombreComercial: empresaConfig?.nombreComercial || empresaConfig?.razonSocial,
      empresaRazonSocial: empresaConfig?.razonSocial,
      empresaRuc: empresaConfig?.ruc,
      empresaDireccion: empresaConfig?.direccion,
      empresaTelefono: empresaConfig?.telefono,
      empresaCiudad: empresaConfig?.ciudad,
      empresaEmail: empresaConfig?.email,
      empresaPieTicket: empresaConfig?.pieTicket,
    };
    setDatosImpresion(datosTicket);
    try {
      await printVenta(datosTicket);
    } catch (e) {
      console.warn("[VENTA] No se pudo imprimir directamente:", e);
    }
    focusSearch();
  }, [carrito, cliente, totalConIva, montoNum, cambio, formaPago, esMixto, montoTransferenciaNum, efectivoMixto, cargarProductos, focusSearch, empresaConfig]);

  const handleConfirmar = useCallback(async () => {
    if (!puedeConfirmar) return;
    setConfirmando(true);
    setErrorGlobal(null);
    // Doble control de vigencia justo antes de enviar: si el timbrado llegó a
    // su fecha límite (o no hay vigente), bloquea y no se envía la venta.
    const vig = await rechequearTimbrado();
    if (vig.estado !== "ok") {
      setConfirmando(false);
      return;
    }
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
      // La vigencia (inicio/fin) no viene en la respuesta de la venta y se
      // consulta aparte: si falla, el ticket muestra solo el número.
      const numFactura = data?.numeroFactura ?? data?.numero_factura;
      let timbradoInfo = data?.numeroTimbrado ? { numeroTimbrado: data.numeroTimbrado } : null;
      try {
        // Disponibilidad por fecha (independiente del flag activo del back).
        const vig = await getTimbradoVentaPorFecha(data?.fechaEmision || hoyISO());
        const t = vig?.data ?? null;
        if (t?.numeroTimbrado) {
          timbradoInfo = {
            numeroTimbrado: t.numeroTimbrado,
            fechaInicio: t.fechaInicio ?? null,
            fechaVencimiento: t.fechaVencimiento ?? null,
          };
        }
      } catch { /* sin vigencia disponible */ }
      // fechaCreacion del back trae fecha + hora (LocalDateTime del servidor)
      const fechaVenta = data?.fechaCreacion ?? data?.fechaEmision ?? null;
      // Contrato 27-10-26: si el pago es por transferencia, se registra la
      // transferencia vinculada a la factura. Best-effort: si el back aún no
      // despliega el endpoint (o falla), la venta queda registrada igual.
      // Pago MIXTO: se registra por el monto parcial de transferencia (el
      // restante se cobró en efectivo en el mostrador).
      const montoTransfer = esMixto ? Math.round(montoTransferenciaNum) : null;
      const registrarTransferencia =
        (formaPago === FORMA_PAGO_TRANSFERENCIA || (esMixto && montoTransfer > 0)) &&
        data?.idFacturaVenta;
      if (registrarTransferencia) {
        try {
          await crearTransferenciaVenta({
            idFacturaVenta: data.idFacturaVenta,
            monto: esMixto ? montoTransfer : totalConIva,
            observacion: `Venta ${numFactura || "—"}`,
          });
        } catch (e) {
          console.warn("[VENTA] No se pudo registrar la transferencia:", e?.message || e);
        }
        // El badge de pendientes puede cambiar con esta venta
        cargarPendientesCount();
      }
      await finalizarVenta({ numFactura, timbradoInfo, fechaVenta });
    } catch (err) {
      // Sin fallback local: se muestra el error tal cual lo responde el back
      // (p. ej. 409 TIMBRADO_VENTA_NO_VIGENTE si no hay timbrado de venta).
      setErrorGlobal(apiErrorMessage(err) || "No se pudo registrar la venta.");
    } finally { setConfirmando(false); }
  }, [puedeConfirmar, cliente, carrito, finalizarVenta, rechequearTimbrado, formaPago, esMixto, montoTransferenciaNum, totalConIva, cargarPendientesCount]);

  confirmarRef.current = handleConfirmar;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden px-6">
      {/* Encabezado estándar (PageHeader) con meta de la última venta a la derecha */}
      <div className="shrink-0">
        <PageHeader
          backTo="/ventas"
          title="Nueva venta"
          right={
            datosImpresion && (
              <p className="hidden items-center gap-2 text-xs text-white/50 md:flex">
                <Check className="h-4 w-4 text-[var(--accent)]" />
                <span>
                  Última venta <span className="text-white/80" style={MONO}>{datosImpresion.numero}</span>
                  {" · "}{formatMoney(datosImpresion.total)}
                  {datosImpresion.cambio > 0 && <> · vuelto {formatMoney(datosImpresion.cambio)}</>}
                </span>
              </p>
            )
          }
        />
      </div>

      {errorGlobal && (
        <div role="alert"
          className="mb-3 flex shrink-0 items-start gap-2 rounded-none border border-red-500/30 bg-red-500/10 px-4 py-1.5 text-sm text-red-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex-1">{errorGlobal}</span>
          <button type="button" onClick={() => setErrorGlobal(null)} aria-label="Cerrar aviso"
            className="rounded-none p-0.5 text-red-300/70 transition-colors hover:text-red-200">
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
                            : <Package className="h-4 w-4 text-[var(--accent-orange)]" />}
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
                    className="rounded-none p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white">
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
                          title={c?.activo === false ? "Cliente inactivo: no se puede asignar a la venta" : undefined}
                          className={`flex w-full items-center justify-between gap-3 border-b border-white/5 px-4 py-2.5 text-left transition-colors last:border-b-0 hover:bg-white/[0.05] ${c?.activo === false ? "opacity-50" : ""}`}>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm text-white">{labelCliente(c)}</span>
                            {docCliente(c) && <span className="block truncate text-xs text-white/50">{docCliente(c)}</span>}
                          </span>
                          {c?.activo === false && (
                            <span className="shrink-0 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] text-red-400">Inactivo</span>
                          )}
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
                              {pesable
                                ? <Scale className="h-4 w-4 shrink-0 text-[var(--cyan)]" aria-label="Producto pesable (kg)" />
                                : <Package className="h-4 w-4 shrink-0 text-[var(--accent-orange)]" aria-label="Producto por unidad" />}
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
                                className="whitespace-nowrap rounded-none px-3 py-1.5 text-base text-white/80 transition-colors hover:bg-white/10 hover:text-white"
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

            <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-white/10 px-5 py-2.5 text-xs text-white/45">
              {ATAJOS.map(([tecla, desc]) => (
                <span key={tecla} className="flex items-center gap-1.5">
                  <Kbd>{tecla}</Kbd>{desc}
                </span>
              ))}

              {/* Transferencias pendientes (contrato 27-10-26): esquina derecha
                  de la franja de atajos, cerca del flujo de dinero */}
              <button type="button" onClick={() => setShowTransferencias(true)}
                title="Transferencias pendientes"
                aria-label="Transferencias pendientes"
                className="relative ml-auto flex items-center gap-2 rounded-none border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white">
                <ClipboardList className="h-3.5 w-3.5" />
                Transferencias
                {pendientesCount != null && pendientesCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-black">
                    {pendientesCount}
                  </span>
                )}
              </button>
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
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="Forma de pago">
              {[
                [FORMA_PAGO_EFECTIVO, "Efectivo", Banknote, "F7"],
                [FORMA_PAGO_TRANSFERENCIA, "Transferencia", Landmark, "F8"],
                [FORMA_PAGO_MIXTO, "Mixto", Coins, "—"],
              ].map(([codigo, texto, Icono, tecla]) => {
                const activo = formaPago === codigo;
                return (
                  <button key={codigo} type="button" aria-pressed={activo} onClick={() => setFormaPago(codigo)}
                    className={`flex items-center justify-center gap-1 whitespace-nowrap rounded-none border px-1.5 py-2 text-xs font-medium transition-colors sm:px-2 sm:text-sm ${
                      activo
                        ? "border-[var(--border-accent)] bg-[var(--accent-dim)] text-[var(--accent)]"
                        : "border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.06] hover:text-white"
                    }`}>
                    <Icono className="h-4 w-4" />
                    <span className="truncate">{texto}</span>
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
                  <div className="flex h-11 items-center gap-2 rounded-none border border-white/10 bg-white/[0.03] px-2 transition-colors focus-within:border-[var(--accent)]">
                    <span className="text-sm text-white/40 select-none">Gs.</span>
                    <input
                      id="venta-recibido"
                      type="text"
                      inputMode="numeric"
                      value={montoPagado}
                      onChange={(e) => setMontoPagado(e.target.value)}
                      placeholder="0"
                      autoComplete="off"
                      className="flex-1 min-w-0 bg-transparent text-xl font-semibold text-white outline-none placeholder:text-white/25"
                      style={MONO}
                    />
                    <button type="button" onClick={() => setMontoPagado("")} title="Borrar recibido"
                      className="rounded-none p-1.5 text-white/30 transition-colors hover:bg-white/10 hover:text-white">
                      <Trash2 className="h-4 w-4" />
                    </button>
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
                    {amt / 1000}mil
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

          {esMixto && (
            <div className="border-t border-white/10 px-4 py-3 space-y-3">
              {/* Único input: monto que llega por transferencia */}
              <div>
                <label htmlFor="venta-mixto-transferencia" className={`${LABEL} mb-2 block`}>
                  Monto por transferencia
                </label>
                <div className="flex h-11 items-center gap-2 rounded-none border border-white/10 bg-white/[0.03] px-2 transition-colors focus-within:border-[var(--accent)]">
                  <span className="text-sm text-white/40 select-none">Gs.</span>
                  <input
                    id="venta-mixto-transferencia"
                    type="text"
                    inputMode="numeric"
                    value={montoTransferencia}
                    onChange={(e) => setMontoTransferencia(e.target.value.replace(/[^\d]/g, ""))}
                    placeholder="0"
                    autoComplete="off"
                    className="flex-1 min-w-0 bg-transparent text-xl font-semibold text-white outline-none placeholder:text-white/25"
                    style={MONO}
                  />
                  <button
                    type="button"
                    onClick={() => setMontoTransferencia("")}
                    title="Borrar monto"
                    className="rounded-none p-1.5 text-white/30 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Efectivo derivado siempre al resto exacto */}
              <div>
                <p className={`${LABEL} mb-2`}>Efectivo (resto)</p>
                <div
                  className={`flex h-11 items-center justify-end rounded-none border px-3 text-xl font-semibold ${
                    montoTransferenciaOk
                      ? "border-[var(--border-accent)] bg-[var(--accent-dim)] text-[var(--accent)]"
                      : "border-amber-400/30 bg-amber-400/10 text-amber-300"
                  }`}
                  style={MONO}
                >
                  {formatMoney(efectivoMixto)}
                </div>
              </div>

              {Number.isFinite(montoTransferenciaNum) && montoTransferenciaNum > totalConIva && (
                <p className="text-xs text-amber-300">
                  El monto de transferencia excede el total ({formatMoney(totalConIva)}).
                </p>
              )}
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
        <TicketVenta
          datos={datosImpresion}
          onCerrar={() => {
            setDatosImpresion(null);
            focusSearch();
          }}
        />
      )}

      {/* Validación efímera (2 s): código sin match, producto inactivo, sin
          precio vigente o stock al máximo. Modal centrado, no bloquea el
          click (pointer-events-none): el operador sigue escaneando mientras
          se desvanecí. */}
      {avisoScan && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-0 z-[130] flex items-center justify-center bg-black/45 p-4"
        >
          <div className={`flex w-full max-w-sm items-start gap-4 rounded-none border p-5 shadow-2xl ${
            avisoScan.tone === "red"
              ? "border-red-500/40 bg-[#0c0c0e]"
              : "border-amber-400/40 bg-[#0c0c0e]"
          }`}>
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-none border ${
              avisoScan.tone === "red"
                ? "border-red-500/30 bg-red-500/10 text-red-400"
                : "border-amber-400/30 bg-amber-400/10 text-amber-400"
            }`}>
              {avisoScan.icono === "alerta"
                ? <AlertTriangle className="h-5 w-5" aria-hidden />
                : <Barcode className="h-5 w-5" aria-hidden />}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <h2 className={`text-sm font-semibold ${
                avisoScan.tone === "red" ? "text-red-400" : "text-amber-400"
              }`}
              >
                {avisoScan.titulo}
              </h2>
              <p className="text-sm text-white/70">{avisoScan.texto}</p>
            </div>
          </div>
        </div>
      )}

      {/* Bloqueo total: si ningún timbrado cubre la fecha de hoy no se puede
          vender. Solo desaparece cuando exista un timbrado vigente por fecha
          (re-chequeo automático). */}
      {timbradoEstado && timbradoEstado.estado !== "ok" && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Timbrado de venta no vigente"
            className="w-full max-w-md rounded-none border border-red-500/40 bg-[#0c0c0e] p-6 shadow-2xl"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-none border border-red-500/30 bg-red-500/10 text-red-400">
                <AlertTriangle className="h-6 w-6" aria-hidden />
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                <h2 className="text-base font-semibold text-red-400">
                  No hay timbrado de venta vigente
                </h2>
                <p className="text-sm text-white/70">
                  Para registrar ventas necesitás un timbrado cuyo período de vigencia
                  cubra la fecha de hoy.
                  {" "}Creá uno nuevo en{" "}
                  <Link to="/configuracion/comprobantes" className="font-semibold text-[var(--accent)] underline underline-offset-2 hover:opacity-80">
                    Configuración → Comprobantes
                  </Link>. La pantalla se desbloquea sola cuando haya un timbrado vigente.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {clienteInactivo && (        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setClienteInactivo(null)}>
          <div role="dialog" aria-modal="true" aria-label="Cliente inactivo"
            className="w-full max-w-sm rounded-none border border-amber-400/30 bg-[#0c0c0e] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-none border border-amber-400/30 bg-amber-400/10 text-amber-400">
                <AlertTriangle className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <h2 className="text-sm font-semibold text-amber-400">Cliente inactivo</h2>
                <p className="text-sm text-white/70">
                  <span className="font-medium text-white">{clienteInactivo.nombre}</span> está inactivo y no puede
                  asignarse a la venta. Reactivá el cliente desde <span className="text-white">Ventas → Clientes</span>.
                </p>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button type="button" autoFocus onClick={() => setClienteInactivo(null)}
                className="rounded-none bg-white/[0.08] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/[0.15]">
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {showTransferencias && (
        <TransferenciasPendientesModal
          onCerrar={() => { setShowTransferencias(false); cargarPendientesCount(); }}
          onCambio={cargarPendientesCount}
        />
      )}
    </div>
  );
}

/* ───────── Modal: transferencias pendientes (contrato 27-10-26) ───────── */

function TransferenciasPendientesModal({ onCerrar, onCambio }) {
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [ocupado, setOcupado] = useState(null); // id en acción
  // Descartar es irreversible: pide confirmación (reduce el miedo a pulsarlo).
  const [descartarId, setDescartarId] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const lista = await getTransferenciasPorEstado("PENDIENTE");
      setLista(Array.isArray(lista) ? lista : []);
    } catch (e) {
      setError(apiErrorMessage(e) || "No se pudieron cargar las transferencias.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onCerrar(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCerrar]);

  const accionar = async (id, accion) => {
    setOcupado(id);
    try {
      if (accion === "recibir") await recibirTransferenciaVenta(id);
      else await descartarTransferenciaVenta(id);
      await cargar();
      onCambio?.();
    } catch (e) {
      setError(apiErrorMessage(e) || "No se pudo actualizar la transferencia.");
    } finally {
      setOcupado(null);
    }
  };

  const fmtF = (v) => {
    const s = String(v ?? "");
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? s
      : d.toLocaleString("es-PY", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  // Más antigua arriba: la primera que se registra es la primera que corresponde
  // recibir (el front ya trae quitas; el sort es defensivo).
  const ordenada = useMemo(
    () => [...lista].sort((a, b) => String(a?.fechaCreacion ?? "").localeCompare(String(b?.fechaCreacion ?? ""))),
    [lista]
  );
  const totalPendiente = ordenada.reduce((acc, t) => acc + (Number(t?.monto) || 0), 0);

  return (
    <div className="fixed inset-0 z-[105] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Transferencias pendientes"
        className="flex max-h-[85vh] w-full max-w-4xl flex-col rounded-none border border-white/10 bg-[#0c0c0e] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <ClipboardList className="h-4 w-4 text-white/50" />
            Transferencias pendientes
          </h2>
          <button type="button" onClick={onCerrar} aria-label="Cerrar"
            className="rounded-none p-1 text-white/40 transition-colors hover:bg-white/5 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {cargando ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-white/50">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 rounded-none border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
            </div>
          ) : lista.length === 0 ? (
            <p className="py-10 text-center text-sm text-white/50">
              Sin transferencias pendientes.
            </p>
          ) : (
            <div className="space-y-2.5">
              {ordenada.map((t) => {
                // La transferencia paga la factura: si el monto difiere del total
                // de la factura, se muestra el faltante/sobra de forma explícita.
                const totalFactura = Number(t?.totalFactura);
                const monto = Number(t?.monto) || 0;
                const difiere = Number.isFinite(totalFactura) && Math.abs(totalFactura - monto) >= 1;
                return (
                  <div key={t.idTransferenciaVenta}
                    className="rounded-none border border-white/10 bg-white/[0.02] px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      {/* Columna izquierda: identificación */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="flex flex-wrap items-baseline gap-x-2.5">
                          <span className="font-medium tabular-nums text-white" style={MONO}>
                            {t.numeroFactura || `Factura #${t.idFacturaVenta}`}
                          </span>
                          <span className="truncate text-xs text-white/60" title={t.nombreCliente || "Sin Nombre"}>
                            {t.nombreCliente || "Sin Nombre"}
                          </span>
                        </p>
                        <p className="text-[11px] text-white/40">
                          Registrada: <span className="whitespace-nowrap">{fmtF(t.fechaCreacion)}</span>
                          {t.usuarioRegistro ? <span> · por {t.usuarioRegistro}</span> : null}
                        </p>
                        {difiere ? (
                          <p className="flex items-center gap-1 text-[11px] text-amber-300">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            Total factura: {formatMoney(totalFactura)} (dif. {formatMoney(totalFactura - monto)})
                          </p>
                        ) : null}
                      </div>

                      {/* Fila derecha: monto + acciones en una sola línea */}
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-base font-bold tabular-nums text-[var(--accent)]" style={MONO}>
                          {formatMoney(monto)}
                        </span>
                        <button type="button" disabled={ocupado != null}
                          onClick={() => setDescartarId(t.idTransferenciaVenta)}
                          className="rounded-none border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-white/60 transition-colors hover:border-red-500/40 hover:text-red-300 disabled:opacity-40">
                          Descartar
                        </button>
                        <button type="button" disabled={ocupado != null}
                          onClick={() => accionar(t.idTransferenciaVenta, "recibir")}
                          className="rounded-none bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-40">
                          {ocupado === t.idTransferenciaVenta ? "Procesando…" : "Recibir"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between border-t border-white/10 px-5 py-3">
          <div className="flex items-baseline gap-3">
            <span className="text-xs text-white/40">
              {lista.length} pendiente{lista.length === 1 ? "" : "s"}
            </span>
            {lista.length > 0 && (
              <span className="text-xs text-white/50">
                Total a recibir:{" "}
                <span className="font-semibold tabular-nums text-[var(--accent)]" style={MONO}>
                  {formatMoney(totalPendiente)}
                </span>
              </span>
            )}
          </div>
          <button type="button" onClick={onCerrar}
            className="rounded-none border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/70 transition-colors hover:text-white">
            Cerrar
          </button>
        </div>

        {/* Confirmación: descartar es irreversible */}
        {descartarId != null && (
          <ConfirmModal
            abierto
            titulo="Descartar transferencia"
            mensaje={
              (() => {
                const t = lista.find((x) => x.idTransferenciaVenta === descartarId);
                const fact = t?.numeroFactura || (t?.idFacturaVenta ? `Factura #${t.idFacturaVenta}` : "");
                return `¿Descartar la transferencia${fact ? ` de ${fact}` : ""}? La operación no se puede deshacer.`;
              })()
            }
            confirmarLabel="Descartar"
            confirmarClass="bg-red-500 text-white hover:bg-red-400"
            cargando={ocupado === descartarId}
            onConfirmar={async () => {
              await accionar(descartarId, "descartar");
              setDescartarId(null);
            }}
            onCerrar={() => setDescartarId(null)}
          />
        )}
      </div>
    </div>
  );
}


