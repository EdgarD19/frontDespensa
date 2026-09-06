import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Trash2 } from "lucide-react";
import { getProveedores } from "../../../../api/proveedoresApi";
import { getProductos } from "../../../../api/productosApi";
import { crearPedido } from "../../../../api/comprasApi";
import { apiErrorMessage } from "../../../../api/errors";

const S = {
  field:
    "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white " +
    "placeholder:text-white/30 outline-none transition-colors duration-150 focus:border-[#22c55e]/50",
  label: "block text-xs font-medium text-[#5a5a6e] mb-1.5 uppercase tracking-wider",
  select: "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#22c55e]/50",
  eyebrow: "text-[0.625rem] font-medium uppercase tracking-[0.12em] text-[#5a5a6e]",
  dropdown:
    "absolute z-20 mt-0.5 w-full bg-[#17171c] border border-white/10 rounded-lg max-h-40 overflow-y-auto shadow-lg",
  dropdownItem: "w-full text-left px-2.5 py-1.5 text-sm text-white transition-colors duration-150 hover:bg-white/5",
};

export default function GenerarPedido() {
  const navigate = useNavigate();

  const [proveedores, setProveedores] = useState([]);
  const [proveedorSel, setProveedorSel] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const [prodSearch, setProdSearch] = useState("");
  const [showProductos, setShowProductos] = useState(false);
  const [productos, setProductos] = useState([]);
  const [lineas, setLineas] = useState([]);

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const p = await getProveedores({ pageSize: 100 });
        setProveedores((p?.content || []).filter((x) => x.activo !== false));
      } catch {
        setProveedores([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!showProductos) return;
    const t = setTimeout(async () => {
      try {
        const res = await getProductos({ search: prodSearch || undefined, pageSize: 20 });
        const content = (res?.content || []).filter((p) => p.activo !== false);
        setProductos(content);
      } catch {
        setProductos([]);
      }
    }, prodSearch.length > 0 ? 300 : 0);
    return () => clearTimeout(t);
  }, [prodSearch, showProductos]);

  const agregarLinea = (prod) => {
    const existente = lineas.find((l) => l.producto.id === prod.id);
    if (existente) {
      setLineas((prev) =>
        prev.map((l) => (l.producto.id === prod.id ? { ...l, cantidad: l.cantidad + 1 } : l))
      );
    } else {
      setLineas((prev) => [...prev, {
        producto: { id: prod.id, nombre: prod.nombre, unidadMedida: prod.unidadMedida, unitAbbreviation: prod.unitAbbreviation },
        cantidad: 1,
      }]);
    }
    setProdSearch("");
    setShowProductos(false);
  };

  const eliminarLinea = (id) => setLineas((prev) => prev.filter((l) => l.producto.id !== id));

  const actualizarCantidad = (id, val) => {
    const n = Math.floor(parseFloat(String(val).replace(",", ".")));
    setLineas((prev) =>
      prev.map((l) => (l.producto.id === id ? { ...l, cantidad: Number.isFinite(n) && n > 0 ? n : 1 } : l))
    );
  };

  async function crear() {
    if (!proveedorSel) return setError("Seleccioná un proveedor.");
    if (lineas.length === 0) return setError("Agregá al menos un producto.");
    for (const l of lineas) {
      if (l.cantidad <= 0) return setError(`La cantidad de "${l.producto.nombre}" debe ser mayor a cero.`);
    }

    setGuardando(true);
    setError(null);
    setExito(null);
    try {
      await crearPedido({
        idProveedor: Number(proveedorSel),
        observaciones: observaciones.trim() || null,
        lineas: lineas.map((l) => ({ idProducto: l.producto.id, cantidad: l.cantidad })),
      });
      setExito("Pedido generado correctamente.");
      setProveedorSel("");
      setObservaciones("");
      setLineas([]);
      setProdSearch("");
    } catch (err) {
      setError(apiErrorMessage(err) || "No se pudo generar el pedido.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)}
          className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors" title="Volver">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="space-y-0.5">
          <h1 className="text-2xl font-semibold text-[#f1f1f3] tracking-tight">Generar Pedido</h1>
          <p className="text-sm text-[#5a5a6e]">Elegí el proveedor y los productos a pedir</p>
        </div>
      </div>

      {(error || exito) && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${
            exito
              ? "border-[#22c55e]/30 bg-[#22c55e]/10 text-[#22c55e]"
              : "border-red-500/30 bg-red-500/10 text-red-300"
          }`}>
          {exito || error}
        </div>
      )}

      <div className="rounded-2xl border border-[#1e1e24] bg-[#111114] p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={S.label}>Proveedor *</label>
            <select value={proveedorSel} onChange={(e) => setProveedorSel(e.target.value)} required className={S.select}>
              <option value="" className="bg-[#111114]">Seleccionar proveedor</option>
              {proveedores.map((p) => (
                <option key={p.id ?? p.idProveedor} value={p.id ?? p.idProveedor} className="bg-[#111114]">{p.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={S.label}>Observaciones</label>
            <input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Opcional" className={S.field} />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#1e1e24] bg-[#111114] p-5 space-y-3">
        <label className={S.eyebrow} htmlFor="buscar">Productos</label>
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#5a5a6e]">
            <Search size={16} />
          </span>
          <input
            id="buscar"
            value={prodSearch}
            onChange={(e) => { setProdSearch(e.target.value); setShowProductos(true); }}
            onFocus={() => setShowProductos(true)}
            placeholder="Buscar producto por nombre..."
            className={`${S.field} pl-[2.5rem]`}
          />
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
                  {p.unidadMedida && <span className="text-xs text-[#5a5a6e]">{p.unitAbbreviation || p.unidadMedida}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-3 max-h-[26vh] overflow-y-auto rounded-xl">
          <div className="w-full grid grid-cols-[1fr_70px_90px_36px] gap-x-2 items-center">
            <div className="pb-1 pl-3 text-left text-[0.625rem] font-medium uppercase tracking-[0.12em] text-[#5a5a6e]">Producto</div>
            <div className="pb-1 text-center text-[0.625rem] font-medium uppercase tracking-[0.12em] text-[#5a5a6e]">U.M.</div>
            <div className="pb-1 text-right text-[0.625rem] font-medium uppercase tracking-[0.12em] text-[#5a5a6e]">Cantidad</div>
            <div className="pb-1"></div>

            {lineas.length === 0 ? (
              <div className="col-span-4 text-center py-6 text-sm text-[#5a5a6e] border border-dashed border-white/10 rounded-xl">
                Todavía no agregaste productos a este pedido.
              </div>
            ) : lineas.map((l) => (
              <div key={l.producto.id} className="contents">
                <div className="py-1.5 pl-3 text-sm font-medium text-white bg-white/[0.03] rounded-l-xl">
                  {l.producto.nombre}
                </div>
                <div className="py-1.5 text-center text-sm text-white/60 bg-white/[0.03]">
                  {l.producto.unitAbbreviation || l.producto.unidadMedida || "—"}
                </div>
                <div className="py-1.5 bg-white/[0.03]">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={l.cantidad}
                    onChange={(e) => actualizarCantidad(l.producto.id, e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white text-right focus:outline-none focus:border-[#22c55e]/50"
                  />
                </div>
                <div className="py-1.5 bg-white/[0.03] rounded-r-xl">
                  <button onClick={() => eliminarLinea(l.producto.id)}
                    className="p-1 text-[#5a5a6e] hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-[#5a5a6e]">
          {lineas.length > 0
            ? `${lineas.length} producto${lineas.length !== 1 ? "s" : ""} seleccionado${lineas.length !== 1 ? "s" : ""}`
            : "Ningún producto seleccionado"}
        </span>
        <button disabled
          className="flex items-center gap-2 px-6 py-2.5 bg-[#22c55e] disabled:opacity-40 cursor-not-allowed text-black font-medium rounded-lg transition-colors">
          Crear pedido
        </button>
      </div>
    </div>
  );
}