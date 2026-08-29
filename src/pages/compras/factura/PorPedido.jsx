import { useState, useEffect, useCallback } from "react";
import { PackageCheck, ArrowLeft, Check } from "lucide-react";
import { getOrdenesPendientes, recibirOrden, apiErrorMessage } from "../../../api/comprasApi";

export default function PorPedido({ onVolver }) {
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sel, setSel] = useState(null);
  const [items, setItems] = useState([]);
  const [comprobante, setComprobante] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [exito, setExito] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOrdenes(await getOrdenesPendientes());
    } catch (err) {
      setError(apiErrorMessage(err) || "No se pudieron cargar las órdenes pendientes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  function seleccionar(orden) {
    setSel(orden);
    setItems((orden.items || []).map((it) => ({ ...it, cantidad: Number(it.cantidad) || 1, precioUnitario: Number(it.precioUnitario) || 0 })));
    setComprobante("");
    setError(null);
  }

  const actualizarItem = (id, campo, val) => {
    const n = parseFloat(String(val).replace(",", "."));
    setItems((prev) => prev.map((it) => (it.idDetalleOrden === id ? { ...it, [campo]: Number.isFinite(n) && n >= 0 ? n : 0 } : it)));
  };

  const total = items.reduce((s, it) => s + (Number(it.cantidad) || 0) * (Number(it.precioUnitario) || 0), 0);

  async function confirmarRecepcion() {
    if (!sel) return;
    for (const it of items) {
      if (!(it.cantidad > 0)) { setError("Todas las cantidades deben ser mayores a cero"); return; }
      if (!(it.precioUnitario >= 0)) { setError("Indicá el precio de costo de cada producto"); return; }
    }
    setError(null);
    setGuardando(true);
    try {
      const res = await recibirOrden(sel.id, {
        numero_comprobante: comprobante.trim() || null,
        lineas: items.map((it) => ({
          idDetalleOrden: it.idDetalleOrden,
          idProducto: it.idProducto,
          cantidad: it.cantidad,
          precioUnitario: it.precioUnitario,
        })),
      });
      setExito(`Orden #${sel.id} recibida como factura #${res?.id ?? "?"}. Stock actualizado.`);
      setSel(null);
      await cargar();
    } catch (err) {
      setError(apiErrorMessage(err) || "No se pudo registrar la recepción");
    } finally {
      setGuardando(false);
    }
  }

  if (exito) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-[#22c55e]/30 bg-[#22c55e]/5 p-8 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-[#22c55e]/10 flex items-center justify-center">
            <Check className="w-7 h-7 text-[#22c55e]" />
          </div>
          <p className="text-lg font-medium text-white">{exito}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setExito(null)}
              className="px-5 py-2 bg-[#22c55e] text-black font-medium rounded-lg hover:bg-green-400 transition-colors">
              Recibir otra orden
            </button>
            {onVolver && (
              <button onClick={onVolver}
                className="px-5 py-2 bg-white/5 text-white border border-white/10 font-medium rounded-lg hover:bg-white/10 transition-colors">
                Volver
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      {!sel ? (
        <>
          {loading && <p className="text-sm text-[#5a5a6e]">Cargando órdenes pendientes...</p>}
          {!loading && ordenes.length === 0 && (
            <p className="text-sm text-[#5a5a6e]">No hay órdenes de compra pendientes de recepción.</p>
          )}
          {ordenes.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-[#5a5a6e] uppercase tracking-wider border-b border-white/10">
                    <th className="text-left py-2 pr-2">Orden</th>
                    <th className="text-left py-2 px-2">Proveedor</th>
                    <th className="text-left py-2 px-2">Emisión</th>
                    <th className="text-left py-2 px-2">Observaciones</th>
                    <th className="text-right py-2 px-2">Total est.</th>
                    <th className="py-2 pl-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {ordenes.map((o) => (
                    <tr key={o.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="py-2.5 pr-2 text-white font-medium">#{o.id}</td>
                      <td className="py-2.5 px-2 text-white/80">{o.proveedor || "—"}</td>
                      <td className="py-2.5 px-2 text-white/60">{o.fechaEmision || "—"}</td>
                      <td className="py-2.5 px-2 text-white/50 text-xs max-w-[200px] truncate">{o.observaciones || "—"}</td>
                      <td className="py-2.5 px-2 text-right text-white">${Number(o.totalEstimado || 0).toFixed(2)}</td>
                      <td className="py-2.5 pl-2 text-right">
                        <button onClick={() => seleccionar(o)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#22c55e] text-black text-xs font-medium rounded-lg hover:bg-green-400 transition-colors">
                          <PackageCheck className="w-3.5 h-3.5" />
                          Recibir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-4">
          <button onClick={() => setSel(null)}
            className="flex items-center gap-1.5 text-sm text-[#5a5a6e] hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Volver a las órdenes
          </button>

          <div className="rounded-xl border border-white/10 bg-[#111114] p-4 space-y-1">
            <p className="text-white font-medium">Orden #{sel.id} — {sel.proveedor || "Sin proveedor"}</p>
            {sel.observaciones && <p className="text-xs text-[#5a5a6e]">{sel.observaciones}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5a5a6e] mb-1.5 uppercase tracking-wider">N° de comprobante del proveedor</label>
            <input value={comprobante} onChange={(e) => setComprobante(e.target.value)}
              placeholder="Ej: 001-001-0001234"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#22c55e]/50" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-[#5a5a6e] uppercase tracking-wider border-b border-white/10">
                  <th className="text-left py-2 pr-2">Producto</th>
                  <th className="text-right py-2 px-2 w-24">Cant. pedida</th>
                  <th className="text-right py-2 px-2 w-24">Cant. real</th>
                  <th className="text-right py-2 px-2 w-28">Precio costo</th>
                  <th className="text-right py-2 px-2 w-28">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.idDetalleOrden} className="border-b border-white/5">
                    <td className="py-2 pr-2 text-white">{it.nombre}</td>
                    <td className="py-2 px-2 text-right text-white/50 text-sm">{it.cantidad}</td>
                    <td className="py-2 px-2">
                      <input type="number" min="0.01" step="any" value={it.cantidad}
                        onChange={(e) => actualizarItem(it.idDetalleOrden, "cantidad", e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white text-right focus:outline-none focus:border-[#22c55e]/50" />
                    </td>
                    <td className="py-2 px-2">
                      <input type="number" min="0" step="any" value={it.precioUnitario}
                        onChange={(e) => actualizarItem(it.idDetalleOrden, "precioUnitario", e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white text-right focus:outline-none focus:border-[#22c55e]/50" />
                    </td>
                    <td className="py-2 px-2 text-right text-white font-medium">${(it.cantidad * it.precioUnitario).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-lg font-bold text-white">Total: ${total.toFixed(2)}</span>
            <button onClick={confirmarRecepcion} disabled={guardando}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#22c55e] hover:bg-green-400 disabled:opacity-50 text-black font-medium rounded-lg transition-colors">
              <PackageCheck className="w-4 h-4" />
              {guardando ? "Confirmando..." : "Confirmar recepción"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
