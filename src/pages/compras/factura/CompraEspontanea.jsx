import React, { useState, useEffect, useCallback, useRef } from "react";
import { Truck, Search, Barcode, Trash2, ShoppingCart, Check, Calendar, FileText } from "lucide-react";
import { getProductos, getProductoByCodigo } from "../../../api/productosApi";
import { getProveedores, getProveedorId } from "../../../api/proveedoresApi";
import { crearCompra, compraTimbradoExiste, compraFacturaExiste } from "../../../api/comprasApi";
import { apiErrorMessage } from "../../../api/errors";

const money = (n) => n.toLocaleString("es-PY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

export default function CompraEspontanea({ onVolver }) {
  const [proveedores, setProveedores] = useState([]);
  const [proveedorSearch, setProveedorSearch] = useState("");
  const [proveedorSel, setProveedorSel] = useState(null);
  const [showProveedores, setShowProveedores] = useState(false);

  const [timbrado, setTimbrado] = useState("");
  const [numeroComprobante, setNumeroComprobante] = useState("");
  const [formaPago, setFormaPago] = useState("CONTADO");
  const [fechaEmision, setFechaEmision] = useState(() => new Date().toISOString().slice(0, 10));

  const [productos, setProductos] = useState([]);
  const [prodSearch, setProdSearch] = useState("");
  const [showProductos, setShowProductos] = useState(false);

  const [lineas, setLineas] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);

  const provRef = useRef(null);
  const prodRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (provRef.current && !provRef.current.contains(e.target)) setShowProveedores(false);
      if (prodRef.current && !prodRef.current.contains(e.target)) setShowProductos(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!showProveedores) return;
    const t = setTimeout(async () => {
      try {
        const res = await getProveedores({ search: proveedorSearch || undefined, pageSize: 20 });
        setProveedores(res?.content || []);
      } catch { setProveedores([]); }
    }, proveedorSearch.length > 0 ? 300 : 0);
    return () => clearTimeout(t);
  }, [proveedorSearch, showProveedores]);

  useEffect(() => {
    if (!showProductos) return;
    const t = setTimeout(async () => {
      try {
        const res = await getProductos({ search: prodSearch || undefined, pageSize: 20 });
        setProductos(res.content || []);
      } catch { setProductos([]); }
    }, prodSearch.length > 0 ? 300 : 0);
    return () => clearTimeout(t);
  }, [prodSearch, showProductos]);

  const agregarLinea = useCallback((prod) => {
    const existente = lineas.find((l) => l.producto.id === prod.id);
    if (existente) {
      setLineas((prev) =>
        prev.map((l) =>
          l.producto.id === prod.id ? { ...l, cantidad: l.cantidad + (esKG(prod) ? 0.001 : 1) } : l
        )
      );
    } else {
      const precio = parseFloat(String(prod.precioCompra || prod.precioVenta || "0").replace(",", "."));
      setLineas((prev) => [...prev, {
        producto: prod,
        cantidad: esKG(prod) ? 1.0 : 1,
        precioUnitario: precio > 0 ? precio : 0,
      }]);
    }
    setProdSearch("");
    setShowProductos(false);
  }, [lineas]);

  const buscarPorCodigo = useCallback(async (codigo) => {
    if (!codigo.trim()) return;
    const prod = await getProductoByCodigo(codigo.trim()).catch(() => null);
    if (prod) { agregarLinea(prod); setProdSearch(""); return; }
    setProdSearch(codigo);
  }, [agregarLinea]);

  const eliminarLinea = (id) => setLineas((prev) => prev.filter((l) => l.producto.id !== id));

  const actualizarCantidad = (id, val) => {
    setLineas((prev) => prev.map((l) => {
      if (l.producto.id !== id) return l;
      return { ...l, cantidad: parseCant(val, l.producto) };
    }));
  };

  const actualizarPrecio = (id, val) => {
    const n = parseFloat(val.replace(",", "."));
    setLineas((prev) => prev.map((l) => (l.producto.id === id ? { ...l, precioUnitario: Number.isFinite(n) && n >= 0 ? n : 0 } : l)));
  };

  const subtotalLinea = (l) => l.cantidad * l.precioUnitario;
  const total = lineas.reduce((sum, l) => sum + subtotalLinea(l), 0);
  const iva10 = total / 11;

  const handleSubmit = async () => {
    if (!proveedorSel) { setError("Seleccioná un proveedor"); return; }
    if (!timbrado.trim()) { setError("El timbrado es obligatorio"); return; }
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
      const [timbradoUsado, facturaUsada] = await Promise.all([
        compraTimbradoExiste(timbrado.trim()),
        compraFacturaExiste(numeroComprobante.trim()),
      ]);
      if (timbradoUsado) {
        setError(`El timbrado ${timbrado.trim()} ya está registrado en otra compra.`);
        setGuardando(false);
        return;
      }
      if (facturaUsada) {
        setError(`El número de factura ${numeroComprobante.trim()} ya está registrado en otra compra.`);
        setGuardando(false);
        return;
      }
    } catch {
      /* si la verificación falla, se deja pasar y el backend lo valida */
    }
    setError(null);
    try {
      await crearCompra({
        idProveedor: getProveedorId(proveedorSel),
        numeroFactura: numeroComprobante.trim(),
        timbrado: timbrado.trim(),
        condicionPago: formaPago,
        fechaEmision,
        detalles: lineas.map((l) => ({ idProducto: l.producto.id, cantidad: l.cantidad, precioUnitario: l.precioUnitario })),
      });
      setExito("Compra registrada correctamente. Stock y costos actualizados.");
    } catch (err) {
      setError(apiErrorMessage(err) || "Error al registrar compra");
    } finally {
      setGuardando(false);
    }
  };

  if (exito) {
    return (
      <div className="rounded-2xl border border-[#22c55e]/30 bg-[#22c55e]/5 p-8 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-[#22c55e]/10 flex items-center justify-center">
          <Check className="w-7 h-7 text-[#22c55e]" />
        </div>
        <p className="text-lg font-medium text-white">{exito}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => {
              setExito(null); setLineas([]); setProveedorSel(null); setProveedorSearch("");
              setTimbrado(""); setNumeroComprobante(""); setFormaPago("CONTADO");
              setFechaEmision(new Date().toISOString().slice(0, 10));
            }}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#22c55e] hover:bg-green-400 text-black text-sm font-semibold rounded-lg transition-colors"
          >
            <ShoppingCart className="w-4 h-4" /> Nueva compra
          </button>
          {onVolver && (
            <button
              onClick={onVolver}
              className="px-5 py-3 bg-white/5 text-white border border-white/10 text-sm font-medium rounded-lg hover:bg-white/10 transition-colors"
            >
              Volver
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 mb-5">
          {error}
        </div>
      )}

      {/* Panel principal */}
      <section className="rounded-2xl border border-white/10 bg-[#111114] p-4 sm:p-5">
        {/* Proveedor */}
        <label className={S.eyebrow} htmlFor="proveedor">Proveedor *</label>
        <div className="relative mt-1" ref={provRef}>
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#5a5a6e]">
            <Truck size={16} />
          </span>
          <input
            id="proveedor"
            value={proveedorSearch}
            onChange={(e) => { setProveedorSearch(e.target.value); setProveedorSel(null); setShowProveedores(true); }}
            onFocus={() => setShowProveedores(true)}
            placeholder="Buscar proveedor..."
            className={`${S.field} pl-[2.5rem]`}
          />
          {showProveedores && (
            <div className={S.dropdown}>
              {proveedores.length === 0 ? (
                <div className="px-2.5 py-1.5 text-sm italic text-[#5a5a6e]">Sin resultados</div>
              ) : proveedores.map((p) => {
                const id = p.id ?? p.idProveedor;
                return (
                  <button
                    key={id} type="button"
                    onClick={() => { setProveedorSel(p); setProveedorSearch(p.nombre || ""); setShowProveedores(false); }}
                    className={S.dropdownItem}
                  >
                    {p.nombre}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Info proveedor */}
        {proveedorSel && !showProveedores && (
          <dl className="mt-2.5 grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-1.5 rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
            <div>
              <dt className={S.eyebrow}>RUC / Doc.</dt>
              <dd className="text-[0.8125rem] font-medium text-white">{proveedorSel.numeroDocumento || "—"}</dd>
            </div>
            <div>
              <dt className={S.eyebrow}>Razón social</dt>
              <dd className="text-[0.8125rem] font-medium text-white">{proveedorSel.nombreRazonSocial || proveedorSel.nombre || "—"}</dd>
            </div>
            <div>
              <dt className={S.eyebrow}>Dirección</dt>
              <dd className="text-[0.8125rem] font-medium text-white">{proveedorSel.direccion || "—"}</dd>
            </div>
            <div>
              <dt className={S.eyebrow}>Teléfono</dt>
              <dd className="text-[0.8125rem] font-medium text-white">{proveedorSel.telefono || proveedorSel.celular || "—"}</dd>
            </div>
          </dl>
        )}

        {/* Formulario comprobante */}
        <div className="mt-3.5 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Timbrado */}
          <div>
            <label className={S.eyebrow} htmlFor="timbrado">Timbrado *</label>
            <input
              id="timbrado"
              value={timbrado}
              onChange={(e) => setTimbrado(e.target.value)}
              placeholder="N° timbrado"
              className={`${S.fieldMono} mt-1`}
            />
          </div>

          {/* N° Factura */}
          <div>
            <label className={S.eyebrow} htmlFor="factura">N° factura *</label>
            <div className="relative mt-1">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#5a5a6e]">
                <FileText size={14} />
              </span>
              <input
                id="factura"
                value={numeroComprobante}
                onChange={(e) => setNumeroComprobante(formatoFactura(e.target.value))}
                placeholder="000-000-0000000"
                maxLength={15}
                className={`${S.fieldMono} pl-[2.2rem]`}
              />
            </div>
          </div>

          {/* Condición de pago */}
          <div>
            <label className={S.eyebrow} htmlFor="condicion">Condición de pago *</label>
            <select
              id="condicion"
              value={formaPago}
              onChange={(e) => setFormaPago(e.target.value)}
              className={`${S.field} mt-1 appearance-none`}
            >
              <option value="CONTADO">Contado</option>
              <option value="TRANSFERENCIA">Transferencia</option>
            </select>
          </div>

          {/* Fecha emisión */}
          <div>
            <label className={S.eyebrow} htmlFor="fecha">Fecha emisión *</label>
            <div className="relative mt-1">
              <input
                id="fecha"
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

        {/* Productos */}
        <div className="mt-4" ref={prodRef}>
          <label className={S.eyebrow} htmlFor="buscar">Productos</label>
          <div className="relative mt-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#5a5a6e]">
              <Search size={16} />
            </span>
            <input
              id="buscar"
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
                      ${p.precioCompra || p.precioVenta || "—"}
                      {p.unidadMedida ? ` (${p.unitAbbreviation || p.unidadMedida})` : ""}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tabla */}
        <div className="mt-3 max-h-[26vh] overflow-y-auto rounded-xl">
          <div className="w-full grid grid-cols-[1fr_80px_90px_120px_120px_36px] gap-x-2 gap-y-1 items-center">
            {/* Headers */}
            <div className="pb-1 pl-3 text-left text-[0.625rem] font-medium uppercase tracking-[0.12em] text-[#5a5a6e]">Producto</div>
            <div className="pb-1 text-center text-[0.625rem] font-medium uppercase tracking-[0.12em] text-[#5a5a6e]">U.M.</div>
            <div className="pb-1 text-right text-[0.625rem] font-medium uppercase tracking-[0.12em] text-[#5a5a6e]">Cantidad</div>
            <div className="pb-1 text-right text-[0.625rem] font-medium uppercase tracking-[0.12em] text-[#5a5a6e]">Precio costo</div>
            <div className="pb-1 pr-3 text-right text-[0.625rem] font-medium uppercase tracking-[0.12em] text-[#5a5a6e]">Subtotal</div>
            <div className="pb-1"></div>

            {/* Filas */}
            {lineas.length === 0 ? (
              <div className="col-span-6 text-center py-6 text-sm text-[#5a5a6e] border border-dashed border-white/10 rounded-xl">
                Todavía no agregaste productos a esta factura.
              </div>
            ) : lineas.map((l) => (
              <React.Fragment key={l.producto.id}>
                {/* Producto */}
                <div className="py-1.5 pl-3 text-sm font-medium text-white bg-white/[0.03] rounded-l-xl">
                  {l.nuevo ? (
                    <div className="flex flex-col gap-0.5">
                      <input value={l.producto.nombre}
                        onChange={(e) => setLineas((prev) => prev.map((x) => x.producto.id === l.producto.id ? { ...x, producto: { ...x.producto, nombre: e.target.value } } : x))}
                        placeholder="Nombre del producto"
                        className={`${S.field} !py-0.5 !px-1.5 !text-sm border-[#22c55e]/30`}
                      />
                      <input value={l.producto.codigo}
                        onChange={(e) => setLineas((prev) => prev.map((x) => x.producto.id === l.producto.id ? { ...x, producto: { ...x.producto, codigo: e.target.value } } : x))}
                        placeholder="Código de barras"
                        className={`${S.field} !py-0.5 !px-1.5 !text-xs`}
                      />
                      <span className="text-[0.625rem] font-medium uppercase tracking-[0.1em] text-[#22c55e]">Producto nuevo</span>
                    </div>
                  ) : l.producto.nombre}
                </div>
                {/* U.M. */}
                <div className="py-1.5 text-center text-sm text-white bg-white/[0.03]">
                  <span className="rounded px-1.5 py-0.5 text-xs bg-white/10 text-[#5a5a6e]">
                    {l.producto.unitAbbreviation || l.producto.unidadMedida || "UNI"}
                  </span>
                </div>
                {/* Cantidad */}
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
                {/* Precio costo */}
                <div className="py-1.5 text-right bg-white/[0.03]">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={l.precioUnitario}
                    onChange={(e) => actualizarPrecio(l.producto.id, e.target.value)}
                    className="w-28 bg-white/5 border border-white/10 rounded px-2 py-1 text-right text-sm font-mono text-white outline-none transition-colors focus:border-[#22c55e]/50"
                  />
                </div>
                {/* Subtotal */}
                <div className="py-1.5 pr-3 text-right font-semibold font-mono text-sm text-white bg-white/[0.03]">
                  ₲ {money(subtotalLinea(l))}
                </div>
                {/* Eliminar */}
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
        <div className="mt-3 pt-3 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-sm text-[#5a5a6e]">
            {lineas.length} ítem{lineas.length === 1 ? "" : "s"} en el comprobante
          </p>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-[#5a5a6e]">
                IVA 10% (incluido):{" "}
                <span className="font-mono text-white">₲ {money(iva10)}</span>
              </p>
              <p className="font-mono text-2xl font-bold tracking-tight text-[#22c55e]">
                ₲ {money(total)}
              </p>
            </div>

            <div className="flex gap-2">
              {onVolver && (
                <button
                  onClick={onVolver}
                  className="px-4 py-2 bg-white/5 text-white border border-white/10 text-sm font-medium rounded-lg hover:bg-white/10 transition-colors"
                >
                  Cancelar
                </button>
              )}
              <button
                onClick={handleSubmit}
                disabled={guardando}
                className="inline-flex items-center justify-center gap-2 px-5 py-2 bg-[#22c55e] hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-black text-sm font-semibold rounded-lg transition-colors"
              >
                <ShoppingCart size={16} />
                {guardando ? "Guardando..." : "Registrar compra"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
