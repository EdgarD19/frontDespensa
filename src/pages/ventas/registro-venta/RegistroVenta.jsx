import { useState, useEffect, useMemo, useCallback } from "react";
import { ShoppingCart } from "lucide-react";
import { getProductos, getProductoByCodigo } from "../../../api/productosApi";
import { getCategorias } from "../../../api/maestrosApi";
import { registrarVentaFactura } from "../../../api/ventasApi";
import { apiErrorMessage } from "../../../api/errors";
import CatalogoProductos from "./CatalogoProductos";
import CarritoVenta from "./CarritoVenta";
import ClienteOpcional from "./ClienteOpcional";
import ResumenFactura from "./ResumenFactura";
import PagoVenta from "./PagoVenta";
import ComprobanteImpresion from "./ComprobanteImpresion";
import {
  parsePrecioVenta,
  parseStockDisponible,
  esProductoPesable,
  labelCliente,
  labelFormaPago,
  numeroFacturaPreview,
  hoyISO,
  esSoloDigitosBarras,
  FORMA_PAGO_EFECTIVO,
} from "./utils";

function construirLineaCarrito(producto) {
  const stock = parseStockDisponible(producto);
  const precioUnitario = parsePrecioVenta(producto);
  const pesable = esProductoPesable(producto);
  return {
    productoId: producto.id,
    nombre: producto.nombre || "—",
    codigoBarras: producto.codigoBarras || "",
    precioUnitario,
    cantidad: pesable ? 1.0 : 1,
    stockDisponible: stock,
    productoPesable: producto.productoPesable,
  };
}

export default function RegistroVenta() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorCatalogo, setErrorCatalogo] = useState(null);
  const [search, setSearch] = useState("");
  const [categoria, setCategoria] = useState("");
  const [categoriasMaestros, setCategoriasMaestros] = useState([]);

  const [carrito, setCarrito] = useState([]);
  const [cliente, setCliente] = useState(null);
  const [montoPagado, setMontoPagado] = useState("");
  const [formaPago, setFormaPago] = useState(FORMA_PAGO_EFECTIVO);
  const [errorGlobal, setErrorGlobal] = useState(null);
  const [confirmando, setConfirmando] = useState(false);

  const [numeroPreview] = useState(() => numeroFacturaPreview());
  const [datosImpresion, setDatosImpresion] = useState(null);

  const cargarProductos = useCallback(async () => {
    try {
      setErrorCatalogo(null);
      setLoading(true);
      const res = await getProductos({ pageSize: 500 });
      setProductos(res.content || []);
    } catch (err) {
      setErrorCatalogo(apiErrorMessage(err) || "Error al cargar productos");
      setProductos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarProductos();
  }, [cargarProductos]);

  useEffect(() => {
    getCategorias()
      .then(setCategoriasMaestros)
      .catch(() => setCategoriasMaestros([]));
  }, []);

  useEffect(() => {
    if (!datosImpresion?.idComprobante) return;
    /* Sin cleanup: si se cancela el timeout, en React StrictMode (dev) a veces no se abría el diálogo de impresión. */
    setTimeout(() => window.print(), 300);
  }, [datosImpresion?.idComprobante]);

  const categoriasOpciones = useMemo(() => {
    const fromProd = productos.map((p) => (p.categoria || "").trim()).filter(Boolean);
    const fromM = categoriasMaestros.map((c) => c.nombre).filter(Boolean);
    return [...new Set([...fromProd, ...fromM])].sort((a, b) => a.localeCompare(b));
  }, [productos, categoriasMaestros]);

  const productosFiltrados = useMemo(() => {
    let list = productos;
    const cat = categoria.trim();
    if (cat) {
      list = list.filter((p) => (p.categoria || "").trim() === cat);
    }
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (p) =>
        (p.nombre || "").toLowerCase().includes(q) ||
        String(p.codigoBarras || "").toLowerCase().includes(search.trim().toLowerCase())
    );
  }, [productos, search, categoria]);

  const subtotal = useMemo(() => {
    return carrito.reduce((acc, l) => acc + l.precioUnitario * l.cantidad, 0);
  }, [carrito]);
  const iva = Math.round(subtotal * 0.1);
  const totalConIva = subtotal + iva;

  const esEfectivo = formaPago === FORMA_PAGO_EFECTIVO;
  const montoIngresado = parseFloat(String(montoPagado).replace(",", "."));
  const montoNum = esEfectivo ? montoIngresado : totalConIva;
  const montoOkEfectivo = Number.isFinite(montoIngresado) && montoIngresado >= 0;
  const cambio =
    esEfectivo && montoOkEfectivo ? Math.max(0, montoIngresado - totalConIva) : 0;

  const handleAgregarProducto = useCallback(
    (producto, cantidad) => {
      const stock = parseStockDisponible(producto);
      const precio = parsePrecioVenta(producto);
      const pesable = esProductoPesable(producto);
      if (stock <= 0) {
        setErrorGlobal("No se puede agregar un producto sin stock.");
        return;
      }
      const q = pesable
        ? Math.min(Math.max(0.001, parseFloat(String(cantidad).replace(",", "."))), stock)
        : Math.min(Math.max(1, Math.trunc(Number(cantidad))), stock);
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
        const nuevaCant = Math.min(line.cantidad + q, stock);
        if (nuevaCant === line.cantidad) return prev;
        const next = [...prev];
        next[idx] = { ...line, cantidad: nuevaCant, precioUnitario: precio, stockDisponible: stock };
        return next;
      });
    },
    []
  );

  const handleCambiarCantidad = useCallback((productoId, raw) => {
    setCarrito((prev) =>
      prev.map((line) => {
        if (line.productoId !== productoId) return line;
        const max = line.stockDisponible;
        const pesable = esProductoPesable(line);
        const v = pesable
          ? parseFloat(String(raw).replace(",", "."))
          : Math.trunc(Number(raw));
        const min = pesable ? 0.001 : 1;
        const q = Math.min(Math.max(min, v), max);
        return { ...line, cantidad: Number.isFinite(q) ? q : line.cantidad };
      })
    );
  }, []);

  const handleEliminar = useCallback((productoId) => {
    setCarrito((prev) => prev.filter((l) => l.productoId !== productoId));
  }, []);

  const handleCancelarTodo = useCallback(() => {
    setCarrito([]);
    setCliente(null);
    setMontoPagado("");
    setErrorGlobal(null);
  }, []);

  const handleSearchKeyDown = useCallback(
    async (e) => {
      if (e.key !== "Enter") return;
      const t = search.trim();
      if (!esSoloDigitosBarras(t)) return;
      e.preventDefault();
      setErrorGlobal(null);
      try {
        const p = await getProductoByCodigo(t);
        if (p) {
          handleAgregarProducto(p, 1);
          setSearch("");
        } else {
          setErrorGlobal("No se encontró producto con ese código de barras.");
        }
      } catch (err) {
        setErrorGlobal(apiErrorMessage(err) || "Error al buscar por código de barras.");
      }
    },
    [search, handleAgregarProducto]
  );

  let mensajeBloqueo = null;
  if (carrito.length === 0) mensajeBloqueo = "Agregá productos al carrito para continuar.";
  else if (esEfectivo && (!montoOkEfectivo || montoIngresado < totalConIva))
    mensajeBloqueo = "El monto recibido debe cubrir el total de la venta.";

  const puedeConfirmar =
    carrito.length > 0 &&
    totalConIva > 0 &&
    (esEfectivo ? montoOkEfectivo && montoIngresado >= totalConIva : true);

  const handleConfirmar = async () => {
    if (!puedeConfirmar) return;
    setConfirmando(true);
    setErrorGlobal(null);
    const payload = {
      fechaFactura: hoyISO(),
      tipoFactura: "CONTADO",
      estado: "PENDIENTE",
      idCliente: cliente?.idCliente ?? cliente?.id ?? null,
      etiquetaCliente: cliente ? labelCliente(cliente) : "Sin nombre",
      lineas: carrito.map((l) => ({
        idProducto: l.productoId,
        cantidad: l.cantidad,
        precioUnitario: l.precioUnitario,
        subtotal: l.precioUnitario * l.cantidad,
      })),
      total: subtotal,
      montoPagado: montoNum,
      cambio,
      formaPago,
    };

    try {
      const data = await registrarVentaFactura(payload);
      const numFactura = data?.numeroFactura ?? data?.numero_factura ?? numeroPreview;

      const snapshotLineas = carrito.map((l) => ({ ...l }));
      const clienteSnap = cliente;

      setCarrito([]);
      setMontoPagado("");
      setCliente(null);
      await cargarProductos();

      setDatosImpresion({
        idComprobante: `${Date.now()}-${numFactura}`,
        fecha: hoyISO(),
        numero: numFactura,
        cliente: clienteSnap,
        lineas: snapshotLineas,
        total: totalConIva,
        montoPagado: montoNum,
        cambio,
        tipo: "CONTADO",
        formaPago,
        formaPagoLabel: labelFormaPago(formaPago),
      });
    } catch (err) {
      setErrorGlobal(
        apiErrorMessage(err) ||
          "No se pudo registrar la venta. Verificá que el backend exponga POST /api/ventas/facturas."
      );
    } finally {
      setConfirmando(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-10 px-4 sm:px-6">
      <div className="flex items-center gap-3 py-6 border-b border-[#1e1e24] mb-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20">
          <ShoppingCart className="w-5 h-5 text-[#22c55e]" aria-hidden />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-[#f1f1f3] tracking-tight">Registro de venta</h1>
          <p className="text-sm text-[#5a5a6e]">
            Productos por unidad · pago en efectivo o transferencia
          </p>
        </div>
      </div>

      {errorGlobal ? (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
        >
          {errorGlobal}
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-7 space-y-4">
          <CatalogoProductos
            loading={loading}
            error={errorCatalogo}
            search={search}
            onSearchChange={setSearch}
            onSearchKeyDown={handleSearchKeyDown}
            categoria={categoria}
            onCategoriaChange={setCategoria}
            categoriasOpciones={categoriasOpciones}
            productosFiltrados={productosFiltrados}
            onAgregarProducto={handleAgregarProducto}
            agregando={false}
          />
        </div>
        <div className="xl:col-span-5 space-y-4">
          <CarritoVenta
            lineas={carrito}
            onCambiarCantidad={handleCambiarCantidad}
            onEliminar={handleEliminar}
            onCancelarTodo={handleCancelarTodo}
            subtotal={subtotal}
            iva={iva}
            total={totalConIva}
          />
          <ClienteOpcional
            cliente={cliente}
            onSeleccionar={setCliente}
            onQuitar={() => setCliente(null)}
          />
          <ResumenFactura fechaISO={hoyISO()} numeroPreview={numeroPreview} />
          <PagoVenta
            total={totalConIva}
            formaPago={formaPago}
            onFormaPagoChange={setFormaPago}
            montoPagado={montoPagado}
            onMontoChange={setMontoPagado}
            cambio={cambio}
            puedeConfirmar={puedeConfirmar}
            onConfirmar={handleConfirmar}
            confirmando={confirmando}
            mensajeBloqueo={mensajeBloqueo}
          />
        </div>
      </div>

      <ComprobanteImpresion datos={datosImpresion} />
    </div>
  );
}
