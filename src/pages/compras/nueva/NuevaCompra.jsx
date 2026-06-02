import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Search, Truck, ShoppingCart, Check } from "lucide-react";
import { getProductos } from "../../../api/productosApi";
import { getProveedores } from "../../../api/proveedoresApi";
import { crearCompra } from "../../../api/comprasApi";
import { apiErrorMessage } from "../../../api/errors";

export default function NuevaCompra() {
  const [proveedores, setProveedores] = useState([]);
  const [proveedorSearch, setProveedorSearch] = useState("");
  const [proveedorSel, setProveedorSel] = useState(null);
  const [showProveedores, setShowProveedores] = useState(false);

  const [productos, setProductos] = useState([]);
  const [prodSearch, setProdSearch] = useState("");
  const [showProductos, setShowProductos] = useState(false);

  const [lineas, setLineas] = useState([]);
  const [formaPago, setFormaPago] = useState("EFECTIVO");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);

  useEffect(() => {
    if (proveedorSearch.length < 1) { setProveedores([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await getProveedores({ search: proveedorSearch, pageSize: 10 });
        setProveedores(res?.data?.content || []);
      } catch { setProveedores([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [proveedorSearch]);

  useEffect(() => {
    if (prodSearch.length < 1) { setProductos([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await getProductos({ search: prodSearch, pageSize: 10 });
        setProductos(res.content || []);
      } catch { setProductos([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [prodSearch]);

  const agregarLinea = useCallback((prod) => {
    const existente = lineas.find((l) => l.producto.id === prod.id);
    if (existente) {
      setLineas((prev) =>
        prev.map((l) =>
          l.producto.id === prod.id ? { ...l, cantidad: l.cantidad + 1 } : l
        )
      );
    } else {
      const precio = parseFloat(String(prod.precioCompra || prod.precioVenta || "0").replace(",", "."));
      setLineas((prev) => [...prev, { producto: prod, cantidad: 1, precioUnitario: precio > 0 ? precio : 0 }]);
    }
    setProdSearch("");
    setShowProductos(false);
  }, [lineas]);

  const eliminarLinea = (id) => setLineas((prev) => prev.filter((l) => l.producto.id !== id));

  const actualizarCantidad = (id, val) => {
    const n = parseFloat(val.replace(",", "."));
    setLineas((prev) => prev.map((l) => (l.producto.id === id ? { ...l, cantidad: Number.isFinite(n) && n > 0 ? n : 1 } : l)));
  };

  const actualizarPrecio = (id, val) => {
    const n = parseFloat(val.replace(",", "."));
    setLineas((prev) => prev.map((l) => (l.producto.id === id ? { ...l, precioUnitario: Number.isFinite(n) && n >= 0 ? n : 0 } : l)));
  };

  const total = lineas.reduce((sum, l) => sum + l.cantidad * l.precioUnitario, 0);

  const handleSubmit = async () => {
    if (!proveedorSel) { setError("Seleccioná un proveedor"); return; }
    if (lineas.length === 0) { setError("Agregá al menos un producto"); return; }
    setError(null);
    setGuardando(true);
    try {
      const res = await crearCompra({
        idProveedor: proveedorSel.id,
        formaPago,
        lineas: lineas.map((l) => ({
          idProducto: l.producto.id,
          cantidad: l.cantidad,
          precioUnitario: l.precioUnitario,
        })),
      });
      setExito(`Compra registrada correctamente (ID: ${res.idFacturaCompra})`);
      setLineas([]);
      setProveedorSel(null);
      setProveedorSearch("");
      setFormaPago("EFECTIVO");
    } catch (err) {
      setError(apiErrorMessage(err) || "Error al registrar compra");
    } finally {
      setGuardando(false);
    }
  };

  if (exito) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="rounded-xl border border-[#22c55e]/30 bg-[#22c55e]/5 p-8 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-[#22c55e]/10 flex items-center justify-center">
            <Check className="w-7 h-7 text-[#22c55e]" />
          </div>
          <p className="text-lg font-medium text-white">{exito}</p>
          <button onClick={() => setExito(null)}
            className="px-5 py-2 bg-[#22c55e] text-black font-medium rounded-lg hover:bg-green-400 transition-colors">
            Nueva compra
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-[#f1f1f3] tracking-tight">Nueva Compra</h1>
        <p className="text-sm text-[#5a5a6e]">Registrá una factura de compra a un proveedor</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="relative">
          <label className="block text-xs font-medium text-[#5a5a6e] mb-1.5 uppercase tracking-wider">Proveedor</label>
          <div className="relative">
            <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3a3a4a]" />
            <input value={proveedorSearch} onChange={(e) => { setProveedorSearch(e.target.value); setProveedorSel(null); setShowProveedores(true); }}
              onFocus={() => setShowProveedores(true)}
              placeholder="Buscar proveedor..."
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#22c55e]/50" />
          </div>
          {showProveedores && proveedores.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-lg border border-white/10 bg-[#1a1a20] shadow-xl max-h-48 overflow-y-auto">
              {proveedores.map((p) => {
                const id = p.id ?? p.idProveedor;
                const nombre = p.nombre || p.name || "";
                return (
                  <button key={id} type="button" onClick={() => { setProveedorSel({ id, nombre }); setProveedorSearch(nombre); setShowProveedores(false); }}
                    className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5 transition-colors">
                    {nombre}
                  </button>
                );
              })}
            </div>
          )}
          {proveedorSel && !showProveedores && (
            <p className="mt-1 text-xs text-[#22c55e]">{proveedorSel.nombre} seleccionado</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-[#5a5a6e] mb-1.5 uppercase tracking-wider">Forma de pago</label>
          <select value={formaPago} onChange={(e) => setFormaPago(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#22c55e]/50">
            <option value="EFECTIVO">Efectivo</option>
            <option value="TRANSFERENCIA">Transferencia</option>
            <option value="TARJETA">Tarjeta</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-[#5a5a6e] mb-1.5 uppercase tracking-wider">Productos</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3a3a4a]" />
          <input value={prodSearch} onChange={(e) => { setProdSearch(e.target.value); setShowProductos(true); }}
            onFocus={() => setShowProductos(true)}
            placeholder="Buscar producto para agregar..."
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#22c55e]/50" />
          {showProductos && productos.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-lg border border-white/10 bg-[#1a1a20] shadow-xl max-h-48 overflow-y-auto">
              {productos.map((p) => (
                <button key={p.id} type="button" onClick={() => agregarLinea(p)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-white hover:bg-white/5 transition-colors">
                  <span>{p.nombre}</span>
                  <span className="text-[#5a5a6e] text-xs">${p.precioCompra || p.precioVenta || "—"}</span>
                </button>
              ))}
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
                <th className="text-right py-2 px-2 w-24">Cantidad</th>
                <th className="text-right py-2 px-2 w-28">Precio unit.</th>
                <th className="text-right py-2 px-2 w-28">Subtotal</th>
                <th className="py-2 pl-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {lineas.map((l) => (
                <tr key={l.producto.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="py-2 pr-2 text-white">{l.producto.nombre}</td>
                  <td className="py-2 px-2">
                    <input type="number" min="0.01" step="any" value={l.cantidad}
                      onChange={(e) => actualizarCantidad(l.producto.id, e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white text-right focus:outline-none focus:border-[#22c55e]/50" />
                  </td>
                  <td className="py-2 px-2">
                    <input type="number" min="0" step="any" value={l.precioUnitario}
                      onChange={(e) => actualizarPrecio(l.producto.id, e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white text-right focus:outline-none focus:border-[#22c55e]/50" />
                  </td>
                  <td className="py-2 px-2 text-right text-white font-medium">${(l.cantidad * l.precioUnitario).toFixed(2)}</td>
                  <td className="py-2 pl-2">
                    <button onClick={() => eliminarLinea(l.producto.id)}
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

      <div className="flex items-center justify-between pt-2">
        <span className="text-lg font-bold text-white">Total: ${total.toFixed(2)}</span>
        <button onClick={handleSubmit} disabled={guardando}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#22c55e] hover:bg-green-400 disabled:opacity-50 text-black font-medium rounded-lg transition-colors">
          <ShoppingCart className="w-4 h-4" />
          {guardando ? "Guardando..." : "Registrar Compra"}
        </button>
      </div>
    </div>
  );
}
