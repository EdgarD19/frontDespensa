import React, { useState, useEffect, useRef } from "react";
import { Truck, Search, Barcode, Trash2, ShoppingCart, Check, Calendar, FileText, X, PackageCheck } from "lucide-react";
import { getProductos, getProductoByCodigo, getPrecioCompraVigente } from "../../../../api/productosApi";
import { getProveedorById } from "../../../../api/proveedoresApi";
import {
  crearFacturaCompra,
  facturaCompraNumeroExiste,
  getTimbradosProveedor,
} from "../../../../api/facturasCompraApi";
import { apiErrorMessage } from "../../../../api/errors";

const money = (n) => Math.round(n).toLocaleString("es-PY", { maximumFractionDigits: 0 });

const hoyAsuncion = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "America/Asuncion", year: "numeric", month: "2-digit", day: "2-digit" });

function formatoFactura(val) {
  const nums = val.replace(/\D/g, "").slice(0, 13);
  const p1 = nums.slice(0, 3);
  const p2 = nums.slice(3, 6);
  const p3 = nums.slice(6, 13);
  if (nums.length <= 3) return p1;
  if (nums.length <= 6) return `${p1}-${p2}`;
  return `${p1}-${p2}-${p3}`;
}

function esKG(prod) {
  const u = (prod.unidadMedida || prod.unitAbbreviation || "").toUpperCase();
  return u === "KG" || u === "KILOGRAMO" || u === "KILOGRAMOS";
}

function stepCant(prod) {
  return esKG(prod) ? "0.001" : "1";
}

function parseCant(val, prod) {
  const n = parseFloat(String(val).replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return esKG(prod) ? 0.001 : 1;
  return esKG(prod) ? Math.round(n * 1000) / 1000 : Math.floor(n);
}

function estadoTimbrado(t, fecha) {
  if (!t) return null;
  if (t.activo === false) {
    return { tipo: "inactivo", msg: "El timbrado está inactivo. No se puede registrar la compra con este timbrado." };
  }
  const fe = String(fecha || "");
  const inicio = String(t.fechaInicio || "");
  const venc = String(t.fechaVencimiento || "");
  if (venc && fe && fe > venc) {
    return { tipo: "vencido", msg: `El timbrado venció el ${venc}. No se puede registrar la compra con este timbrado.` };
  }
  if (inicio && fe && fe < inicio) {
    return { tipo: "noIniciado", msg: `El timbrado aún no está vigente (inicia el ${inicio}).` };
  }
  return { tipo: "vigente", msg: null };
}

function etiquetaTimbrado(tipo) {
  switch (tipo) {
    case "vencido": return "vencido";
    case "inactivo": return "inactivo";
    case "noIniciado": return "no vigente";
    default: return "vigente";
  }
}

const S = {
  field:
    "w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-white " +
    "placeholder:text-white/30 outline-none transition-colors duration-150 focus:border-[#22c55e]/50",
  fieldMono:
    "w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm font-mono text-white " +
    "placeholder:text-white/30 outline-none transition-colors duration-150 focus:border-[#22c55e]/50",
  eyebrow: "text-[0.625rem] font-medium uppercase tracking-[0.12em] text-[#5a5a6e]",
  dropdown:
    "absolute z-20 mt-0.5 w-full bg-[#17171c] border border-white/10 rounded-lg max-h-40 overflow-y-auto shadow-lg",
  dropdownItem: "w-full text-left px-2.5 py-1.5 text-sm text-white transition-colors duration-150 hover:bg-white/5",
};

export default function RecepcionPedidoModal({ pedido, onClose, onCambio }) {
  const [proveedor, setProveedor] = useState(null);
  const [productos, setProductos] = useState([]);
  const [prodSearch, setProdSearch] = useState("");
  const [showProductos, setShowProductos] = useState(false);

  const [timbrados, setTimbrados] = useState([]);
  const [timbradoId, setTimbradoId] = useState("");
  const [cargandoTimbrados, setCargandoTimbrados] = useState(false);
  const [numeroComprobante, setNumeroComprobante] = useState("");
  const [formaPago, setFormaPago] = useState("CONTADO");
  const [fechaEmision, setFechaEmision] = useState(() => hoyAsuncion());

  const [lineas, setLineas] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);

  const prodRef = useRef(null);

  const idProveedor = pedido?.idProveedor;

  // Proveedor + datos del pedido + precios de costo vigentes
  useEffect(() => {
    if (idProveedor == null) return;
    let activo = true;

    (async () => {
      try {
        const res = await getProveedorById(idProveedor);
        const prov = res?.data?.data ?? res?.data ?? {};
        if (activo) setProveedor(prov);
      } catch {}
    })();

    setTimbrados([]);
    setTimbradoId("");
    setCargandoTimbrados(true);
    getTimbradosProveedor(idProveedor)
      .then((res) => { if (activo) setTimbrados(res?.content || []); })
      .catch(() => { if (activo) setTimbrados([]); })
      .finally(() => { if (activo) setCargandoTimbrados(false); });

    return () => { activo = false; };
  }, [idProveedor]);

  // Líneas precargadas desde el pedido + precio de costo vigente por producto
  useEffect(() => {
    if (!pedido?.detalles?.length) return;
    let activo = true;

    (async () => {
      const filas = await Promise.all(
        pedido.detalles.map(async (d) => {
          const costo = await getPrecioCompraVigente(d.idProducto).catch(() => 0);
          return {
            producto: {
              id: d.idProducto,
              nombre: d.nombreProducto || "",
              unidadMedida: d.nombreUnidadMedida || "",
              unitAbbreviation: "",
              iva: d.tasaIva != null ? d.tasaIva : 10,
            },
            cantidad: Number(d.cantidad) > 0 ? Number(d.cantidad) : 1,
            precioUnitario: costo > 0 ? costo : 0,
          };
        })
      );
      if (activo) setLineas(filas);
    })();

    return () => { activo = false; };
  }, [pedido]);

  useEffect(() => {
    const handler = (e) => {
      if (prodRef.current && !prodRef.current.contains(e.target)) setShowProductos(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!showProductos) return;
    const t = setTimeout(async () => {
      try {
        const res = await getProductos({ search: prodSearch || undefined, pageSize: 20 });
        const content = (res?.content || []).map((p) => ({ ...p, precioCompra: Number(p.precioCompra) }));
        const conCosto = await Promise.all(
          content.map(async (p) => {
            if (p.precioCompra > 0) return p;
            const costo = await getPrecioCompraVigente(p.id);
            return { ...p, precioCompra: costo };
          })
        );
        setProductos(conCosto);
      } catch { setProductos([]); }
    }, prodSearch.length > 0 ? 300 : 0);
    return () => clearTimeout(t);
  }, [prodSearch, showProductos]);

  const agregarLinea = async (prod) => {
    const existente = lineas.find((l) => l.producto.id === prod.id);
    if (existente) {
      setLineas((prev) =>
        prev.map((l) =>
          l.producto.id === prod.id ? { ...l, cantidad: l.cantidad + (esKG(prod) ? 0.001 : 1) } : l
        )
      );
    } else {
      let costo = Number(prod.precioCompra);
      if (!(costo > 0)) costo = await getPrecioCompraVigente(prod.id).catch(() => 0);
      setLineas((prev) => [...prev, {
        producto: { ...prod, iva: prod.iva != null ? prod.iva : 10 },
        cantidad: esKG(prod) ? 1.0 : 1,
        precioUnitario: costo > 0 ? costo : 0,
      }]);
    }
    setProdSearch("");
    setShowProductos(false);
  };

  const buscarPorCodigo = async (codigo) => {
    if (!codigo.trim()) return;
    const prod = await getProductoByCodigo(codigo.trim()).catch(() => null);
    if (prod) { agregarLinea(prod); setProdSearch(""); return; }
    setProdSearch(codigo);
  };

  const eliminarLinea = (id) => setLineas((prev) => prev.filter((l) => l.producto.id !== id));

  const actualizarCantidad = (id, val) => {
    setLineas((prev) => prev.map((l) => {
      if (l.producto.id !== id) return l;
      return { ...l, cantidad: parseCant(val, l.producto) };
    }));
  };

  const actualizarPrecio = (id, val) => {
    const n = Math.round(parseFloat(String(val).replace(",", ".")));
    setLineas((prev) => prev.map((l) => (l.producto.id === id ? { ...l, precioUnitario: Number.isFinite(n) && n >= 0 ? n : 0 } : l)));
  };

  const subtotalLinea = (l) => Math.round(l.cantidad * l.precioUnitario);
  const total = lineas.reduce((sum, l) => sum + subtotalLinea(l), 0);

  const timbradoSel = timbrados.find((t) => String(t.idTimbrado) === String(timbradoId)) || null;
  const estadoTimbradoSel = timbradoSel ? estadoTimbrado(timbradoSel, fechaEmision) : null;
  const timbradoBloqueado = estadoTimbradoSel && estadoTimbradoSel.tipo !== "vigente";

  const ivaLinea = (l) => {
    const t = Number(l.producto.iva ?? 10);
    const bruto = l.cantidad * l.precioUnitario;
    if (t === 0) return 0;
    return Math.round(bruto - bruto / (1 + t / 100));
  };
  const tasasLineas = (tasa) => lineas.filter((l) => Number(l.producto.iva ?? 10) === tasa);
  const ivaExento = tasasLineas(0).reduce((s, l) => s + ivaLinea(l), 0);
  const iva5 = tasasLineas(5).reduce((s, l) => s + ivaLinea(l), 0);
  const iva10 = tasasLineas(10).reduce((s, l) => s + ivaLinea(l), 0);
  const totalIva = ivaExento + iva5 + iva10;
  const subtotalSinIva = total - totalIva;

  const handleSubmit = async () => {
    if (!timbradoId) { setError("Seleccioná el timbrado del proveedor"); return; }
    if (timbradoBloqueado) { setError(estadoTimbradoSel.msg); return; }
    if (!numeroComprobante.match(/^\d{3}-\d{3}-\d{7}$/)) {
      setError("El número de factura debe tener el formato 000-000-0000000"); return;
    }
    if (lineas.length === 0) { setError("Agregá al menos un producto"); return; }
    for (const l of lineas) {
      if (l.precioUnitario <= 0) { setError(`Indicá el precio de costo de "${l.producto.nombre}"`); return; }
      if (l.cantidad <= 0) { setError(`La cantidad de "${l.producto.nombre}" debe ser mayor a cero`); return; }
    }
    setGuardando(true);
    try {
      if (await facturaCompraNumeroExiste(numeroComprobante.trim())) {
        setError(`El número de factura ${numeroComprobante.trim()} ya está registrado en otra factura.`);
        setGuardando(false);
        return;
      }
    } catch { /* si la verificación falla, el backend lo valida */ }
    setError(null);
    try {
      const res = await crearFacturaCompra({
        idProveedor,
        idTimbrado: Number(timbradoId),
        numeroFactura: numeroComprobante.trim(),
        condicionPago: formaPago,
        fechaEmision,
        detalles: lineas.map((l) => ({ idProducto: l.producto.id, cantidad: l.cantidad, precioUnitario: l.precioUnitario })),
        idPedido: pedido.idPedido,
      });
      setExito(res);
    } catch (err) {
      setError(apiErrorMessage(err) || "Error al registrar factura");
    } finally {
      setGuardando(false);
    }
  };

  const volverSinCambios = () => {
    if (guardando) return;
    if (onCambio) onCambio();
    onClose();
  };

  if (exito) {
    const f = exito;
    const detalle = (tasa) => (f.detalles || []).filter((d) => Number(d.tasaIva) === tasa);
    const mostrarDesglose =
      (detalle(10).length > 0) || (detalle(5).length > 0) || (detalle(0).length > 0);
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-[#1a1a20] border border-[#22c55e]/30 rounded-2xl w-full max-w-lg shadow-2xl p-8 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-[#22c55e]/10 flex items-center justify-center">
            <Check className="w-7 h-7 text-[#22c55e]" />
          </div>
          <p className="text-lg font-medium text-white">Pedido #<span className="font-mono">{f.idPedido ?? pedido.idPedido}</span> recibido y factura registrada</p>
          <p className="text-sm text-[#5a5a6e]">
            N° {f.numeroFactura} · Timbrado {f.numeroTimbrado || "—"} · {f.nombreProveedor}
          </p>

          {mostrarDesglose && (
            <div className="mx-auto max-w-md grid grid-cols-3 gap-3 text-sm">
              {detalle(10).length > 0 && (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className={S.eyebrow}>IVA 10%</p>
                  <p className="font-mono text-lg font-bold text-white">₲ {money(f.iva10 ?? 0)}</p>
                  <p className="text-xs text-[#5a5a6e]">Subtotal ₲ {money(f.subtotal10 ?? 0)}</p>
                </div>
              )}
              {detalle(5).length > 0 && (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className={S.eyebrow}>IVA 5%</p>
                  <p className="font-mono text-lg font-bold text-white">₲ {money(f.iva5 ?? 0)}</p>
                  <p className="text-xs text-[#5a5a6e]">Subtotal ₲ {money(f.subtotal5 ?? 0)}</p>
                </div>
              )}
              {detalle(0).length > 0 && (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className={S.eyebrow}>Exento</p>
                  <p className="font-mono text-lg font-bold text-white">₲ {money(f.subtotalExento ?? 0)}</p>
                  <p className="text-xs text-[#5a5a6e]">Sin IVA</p>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-center gap-6">
            <div className="text-right">
              <p className="text-xs text-[#5a5a6e]">IVA total</p>
              <p className="font-mono text-lg font-bold text-white">₲ {money(f.ivaTotal ?? 0)}</p>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div className="text-right">
              <p className="text-xs text-[#5a5a6e]">Total</p>
              <p className="font-mono text-2xl font-bold tracking-tight text-[#22c55e]">₲ {money(f.totalGeneral ?? 0)}</p>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={volverSinCambios}
              className="px-6 py-3 bg-[#22c55e] hover:bg-green-400 text-black text-sm font-semibold rounded-lg transition-colors"
            >
              Volver a pedidos
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1a1a20] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 sticky top-0 bg-[#1a1a20] z-10">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-[#22c55e]/10 p-2 text-[#22c55e]">
              <PackageCheck className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-white">Recepcionar Pedido #{pedido?.idPedido}</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-white/40 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
          )}

          {/* Proveedor (precargado) */}
          <div>
            <label className={S.eyebrow}>Proveedor</label>
            <dl className="mt-1 grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-1.5 rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
              <div>
                <dt className={S.eyebrow}>RUC / Doc.</dt>
                <dd className="text-[0.8125rem] font-medium text-white">{proveedor?.numeroDocumento || "—"}</dd>
              </div>
              <div>
                <dt className={S.eyebrow}>Razón social</dt>
                <dd className="text-[0.8125rem] font-medium text-white">{proveedor?.nombreRazonSocial || proveedor?.nombre || pedido?.nombreProveedor || "—"}</dd>
              </div>
              <div>
                <dt className={S.eyebrow}>Dirección</dt>
                <dd className="text-[0.8125rem] font-medium text-white">{proveedor?.direccion || "—"}</dd>
              </div>
              <div>
                <dt className={S.eyebrow}>Teléfono</dt>
                <dd className="text-[0.8125rem] font-medium text-white">{proveedor?.telefono || proveedor?.celular || "—"}</dd>
              </div>
            </dl>
          </div>

          {/* Formulario comprobante */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className={S.eyebrow} htmlFor="rc-timbrado">Timbrado *</label>
              <select
                id="rc-timbrado"
                value={timbradoId}
                onChange={(e) => setTimbradoId(e.target.value)}
                disabled={cargandoTimbrados}
                className={`${S.field} mt-1 appearance-none`}
              >
                {cargandoTimbrados ? (
                  <option value="">Cargando timbrados...</option>
                ) : timbrados.length === 0 ? (
                  <option value="">Sin timbrados registrados</option>
                ) : (
                  <>
                    <option value="">Seleccionar timbrado</option>
                    {timbrados.map((t) => {
                      const st = estadoTimbrado(t, fechaEmision);
                      return (
                        <option key={t.idTimbrado} value={t.idTimbrado}>
                          {t.numeroTimbrado} — {etiquetaTimbrado(st.tipo)}
                        </option>
                      );
                    })}
                  </>
                )}
              </select>
              {timbradoSel && estadoTimbradoSel && estadoTimbradoSel.tipo !== "vigente" && (
                <p className="mt-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs text-red-300">
                  {estadoTimbradoSel.msg}
                </p>
              )}
            </div>

            <div>
              <label className={S.eyebrow} htmlFor="rc-factura">N° factura *</label>
              <div className="relative mt-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#5a5a6e]">
                  <FileText size={14} />
                </span>
                <input
                  id="rc-factura"
                  value={numeroComprobante}
                  onChange={(e) => setNumeroComprobante(formatoFactura(e.target.value))}
                  placeholder="000-000-0000000"
                  maxLength={15}
                  className={`${S.fieldMono} pl-[2.2rem]`}
                />
              </div>
            </div>

            <div>
              <label className={S.eyebrow} htmlFor="rc-condicion">Condición de pago *</label>
              <select
                id="rc-condicion"
                value={formaPago}
                onChange={(e) => setFormaPago(e.target.value)}
                className={`${S.field} mt-1 appearance-none`}
              >
                <option value="CONTADO">Contado</option>
                <option value="CREDITO">Crédito</option>
              </select>
            </div>

            <div>
              <label className={S.eyebrow} htmlFor="rc-fecha">Fecha emisión *</label>
              <div className="relative mt-1">
                <input
                  id="rc-fecha"
                  type="date"
                  value={fechaEmision}
                  onChange={(e) => setFechaEmision(e.target.value)}
                  className={`${S.field} pr-[2.2rem]`}
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#5a5a6e]">
                  <Calendar size={14} />
                </span>
              </div>
            </div>
          </div>

          {/* Productos precargados del pedido */}
          <div className="mt-1" ref={prodRef}>
            <label className={S.eyebrow}>Productos</label>
            <div className="relative mt-1">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#5a5a6e]">
                <Search size={16} />
              </span>
              <input
                value={prodSearch}
                onChange={(e) => { setProdSearch(e.target.value); setShowProductos(true); }}
                onFocus={() => setShowProductos(true)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); buscarPorCodigo(prodSearch); } }}
                placeholder="Escanear código de barras o buscar por nombre..."
                className={`${S.field} pl-[2.5rem] pr-[2.5rem]`}
              />
              <button
                onClick={() => buscarPorCodigo(prodSearch)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5a5a6e] hover:text-white transition-colors"
              >
                <Barcode size={16} />
              </button>

              {showProductos && (
                <div className={S.dropdown}>
                  {productos.length === 0 ? (
                    <div className="px-2.5 py-1.5 text-sm italic text-[#5a5a6e]">Sin resultados</div>
                  ) : productos.map((p) => (
                    <button
                      key={p.id} type="button" onClick={() => agregarLinea(p)}
                      className={`${S.dropdownItem} flex items-center justify-between`}
                    >
                      <span>{p.nombre}</span>
                      <span className="text-xs text-[#5a5a6e]">
                        {Number(p.precioCompra) > 0 ? `₲ ${money(p.precioCompra)}` : "Sin costo registrado"}
                        {p.unidadMedida ? ` (${p.unitAbbreviation || p.unidadMedida})` : ""}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tabla de líneas */}
          <div className="max-h-[26vh] overflow-y-auto rounded-xl">
            <div className="w-full grid grid-cols-[1fr_80px_90px_64px_120px_120px_36px] gap-x-2 gap-y-1 items-center">
              <div className="pb-1 pl-3 text-left text-[0.625rem] font-medium uppercase tracking-[0.12em] text-[#5a5a6e]">Producto</div>
              <div className="pb-1 text-center text-[0.625rem] font-medium uppercase tracking-[0.12em] text-[#5a5a6e]">U.M.</div>
              <div className="pb-1 text-center text-[0.625rem] font-medium uppercase tracking-[0.12em] text-[#5a5a6e]">Cantidad</div>
              <div className="pb-1 text-center text-[0.625rem] font-medium uppercase tracking-[0.12em] text-[#5a5a6e]">IVA %</div>
              <div className="pb-1 text-right text-[0.625rem] font-medium uppercase tracking-[0.12em] text-[#5a5a6e]">Precio costo</div>
              <div className="pb-1 pr-3 text-right text-[0.625rem] font-medium uppercase tracking-[0.12em] text-[#5a5a6e]">Subtotal</div>
              <div className="pb-1"></div>

              {lineas.length === 0 ? (
                <div className="col-span-7 text-center py-6 text-sm text-[#5a5a6e] border border-dashed border-white/10 rounded-xl">
                  Todavía no agregaste productos a esta factura.
                </div>
              ) : lineas.map((l) => (
                <React.Fragment key={l.producto.id}>
                  <div className="py-1.5 pl-3 text-sm font-medium text-white bg-white/[0.03] rounded-l-xl">
                    {l.producto.nombre}
                  </div>
                  <div className="py-1.5 text-center text-sm text-white bg-white/[0.03]">
                    <span className="rounded px-1.5 py-0.5 text-xs bg-white/10 text-[#5a5a6e]">
                      {l.producto.unitAbbreviation || l.producto.unidadMedida || "UNI"}
                    </span>
                  </div>
                  <div className="py-1.5 text-right bg-white/[0.03]">
                    <input
                      type="number"
                      min={esKG(l.producto) ? "0.001" : "1"}
                      step={stepCant(l.producto)}
                      value={l.cantidad}
                      onChange={(e) => actualizarCantidad(l.producto.id, e.target.value)}
                      className="w-20 bg-white/5 border border-white/10 rounded px-2 py-1 text-right text-sm font-mono text-white outline-none transition-colors focus:border-[#22c55e]/50"
                    />
                  </div>
                  <div className="py-1.5 text-center text-sm text-white bg-white/[0.03]">
                    <span className="rounded px-1.5 py-0.5 text-xs bg-white/10 text-[#5a5a6e]">
                      {l.producto.iva != null ? `${l.producto.iva}%` : "10%"}
                    </span>
                  </div>
                  <div className="py-1.5 text-right bg-white/[0.03]">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={l.precioUnitario}
                      onChange={(e) => actualizarPrecio(l.producto.id, e.target.value)}
                      className="w-28 bg-white/5 border border-white/10 rounded px-2 py-1 text-right text-sm font-mono text-white outline-none transition-colors focus:border-[#22c55e]/50"
                    />
                  </div>
                  <div className="py-1.5 pr-3 text-right font-semibold font-mono text-sm text-white bg-white/[0.03]">
                    ₲ {money(subtotalLinea(l))}
                  </div>
                  <div className="py-1.5 pr-3 text-right bg-white/[0.03] rounded-r-xl">
                    <button
                      onClick={() => eliminarLinea(l.producto.id)}
                      className="rounded p-1 text-[#5a5a6e] hover:bg-red-500/15 hover:text-red-400 transition-colors"
                      aria-label={`Quitar ${l.producto.nombre}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Totales + Acciones */}
          <div className="pt-3 border-t border-white/10 grid gap-4 sm:grid-cols-3 items-end">
            <div className="space-y-1.5">
              <p className="text-sm text-[#5a5a6e]">
                {lineas.length} ítem{lineas.length === 1 ? "" : "s"} en el comprobante
              </p>
              <div className="space-y-1 font-mono text-sm">
                <div className="flex items-center justify-between text-white/70">
                  <span className="text-[#5a5a6e]">Exentas:</span>
                  <span>₲ {money(ivaExento)}</span>
                </div>
                <div className="flex items-center justify-between text-white/70">
                  <span className="text-[#5a5a6e]">IVA 5%:</span>
                  <span>₲ {money(iva5)}</span>
                </div>
                <div className="flex items-center justify-between text-white/70">
                  <span className="text-[#5a5a6e]">IVA 10%:</span>
                  <span>₲ {money(iva10)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 font-mono text-sm">
              <div className="flex items-center justify-between text-white/90">
                <span className="text-[#5a5a6e]">Total IVA:</span>
                <span className="font-semibold">₲ {money(totalIva)}</span>
              </div>
              <div className="flex items-center justify-between text-white/90 border-t border-white/10 pt-1.5">
                <span className="text-[#5a5a6e]">Subtotal:</span>
                <span>₲ {money(subtotalSinIva)}</span>
              </div>
            </div>

            <div className="flex flex-col items-end justify-end gap-3">
              <div className="w-full sm:w-auto text-right">
                <p className="text-xs text-[#5a5a6e] uppercase tracking-[0.12em]">Total factura</p>
                <p className="font-mono text-3xl font-bold tracking-tight text-[#22c55e]">
                  ₲ {money(total)}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-white/5 text-white border border-white/10 text-sm font-medium rounded-lg hover:bg-white/10 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={guardando || timbradoBloqueado}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2 bg-[#22c55e] hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-black text-sm font-semibold rounded-lg transition-colors"
                >
                  <Truck size={16} />
                  {guardando ? "Registrando..." : "Recepcionar y registrar compra"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}