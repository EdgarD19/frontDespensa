import { useState, useEffect, useCallback } from "react";
import { Search, X, Save, FileText, AlertTriangle, CheckCircle, RotateCcw } from "lucide-react";
import { getFacturasCompra, getFacturaCompraById } from "../../../api/comprasApi";
import { apiErrorMessage } from "../../../api/errors";

const MOTIVOS_DEVOLUCION = [
  { value: "DANIADO", label: "Producto dañado" },
  { value: "VENCIDO", label: "Producto vencido" },
  { value: "INCORRECTO", label: "Producto incorrecto" },
  { value: "DEFECTUOSO", label: "Producto defectuoso" },
  { value: "OTRO", label: "Otro" },
];

const TIPOS_DOCUMENTO = [
  { value: "NOTA_CREDITO", label: "Nota de Crédito" },
  { value: "NOTA_DEBITO", label: "Nota de Débito" },
  { value: "OTRO", label: "Otro" },
];

function fmtMoneda(n) {
  return new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", minimumFractionDigits: 0 }).format(n ?? 0);
}

function fmtFecha(valor) {
  if (!valor) return "—";
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? String(valor) : d.toLocaleDateString("es-PY");
}

export default function Devoluciones() {
  const [tipoOperacion, setTipoOperacion] = useState("DEVOLUCION");
const [facturas, setFacturas] = useState([]);
  const [loadingFacturas, setLoadingFacturas] = useState(false);
  const [searchFactura, setSearchFactura] = useState("");
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);
  const [facturaDetalle, setFacturaDetalle] = useState(null);
  const [productosDevueltos, setProductosDevueltos] = useState({});
  const [motivo, setMotivo] = useState("");
  const [motivoOtro, setMotivoOtro] = useState("");
  const [tipoDocumento, setTipoDocumento] = useState("");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [fechaDocumento, setFechaDocumento] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const cargarFacturas = useCallback(async () => {
    setLoadingFacturas(true);
    setError(null);
    try {
      const res = await getFacturasCompra({ search: searchFactura, page: 0, size: 50, sortBy: "fechaEmision", sortDirection: "desc" });
      const body = res.data ?? {};
      setFacturas(Array.isArray(body.content) ? body.content : []);
    } catch (err) {
      console.error("Error al cargar facturas:", err);
      setError(apiErrorMessage(err) || "No se pudieron cargar las facturas.");
    } finally {
      setLoadingFacturas(false);
    }
  }, [searchFactura]);

  useEffect(() => {
    const timer = setTimeout(cargarFacturas, 400);
    return () => clearTimeout(timer);
  }, [cargarFacturas]);

  const handleSeleccionarFactura = async (factura) => {
    setFacturaSeleccionada(factura);
    try {
      const res = await getFacturaCompraById(factura.idFactura);
      setFacturaDetalle(res.data ?? res);
      setProductosDevueltos({});
      setError(null);
    } catch (err) {
      console.error("Error al cargar detalle:", err);
      setError("No se pudo cargar el detalle de la factura.");
    }
  };

  const handleCambiarCantidad = (idProducto, cantidad) => {
    const max = facturaDetalle?.detalles?.find(d => d.idProducto === idProducto)?.cantidad ?? 0;
    const val = Math.max(0, Math.min(Number(cantidad) || 0, max));
    setProductosDevueltos(prev => ({ ...prev, [idProducto]: val }));
  };

  const hayProductosSeleccionados = Object.values(productosDevueltos).some(v => v > 0);
  const totalDevuelto = facturaDetalle?.detalles?.reduce((sum, d) => {
    const cant = productosDevueltos[d.idProducto] || 0;
    return sum + (cant * (d.precioUnitario || 0));
  }, 0) || 0;

  const puedeGuardar = facturaDetalle && hayProductosSeleccionados && motivo && (!motivo.includes("OTRO") || motivoOtro);

  const handleGuardar = async () => {
    if (!puedeGuardar) return;
    setGuardando(true);
    setError(null);
    try {
      const items = facturaDetalle.detalles
        .filter(d => (productosDevueltos[d.idProducto] || 0) > 0)
        .map(d => ({
          idProducto: d.idProducto,
          cantidad: productosDevueltos[d.idProducto],
          precioUnitario: d.precioUnitario,
          motivo: motivo === "OTRO" ? motivoOtro : motivo,
        }));

      console.log("Guardar devolución:", { facturaId: facturaDetalle.idFactura, tipoOperacion, items, tipoDocumento, numeroDocumento, fechaDocumento, observaciones });
      setAviso("Devolución registrada correctamente (simulación).");
      setProductosDevueltos({});
      setMotivo("");
      setMotivoOtro("");
      setTipoDocumento("");
      setNumeroDocumento("");
      setFechaDocumento("");
      setObservaciones("");
      setFacturaSeleccionada(null);
      setFacturaDetalle(null);
    } catch (err) {
      console.error("Error al guardar:", err);
      setError("No se pudo registrar la devolución.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-[#f1f1f3] tracking-tight">Registrar Devolución a Proveedor</h1>
        <p className="text-sm text-[#5a5a6e]">Selecciona una factura de compra y registra la devolución de productos</p>
      </div>

      {/* Tipo de operación */}
      <div className="flex gap-3 mb-4">
        <button
          onClick={() => { setTipoOperacion("DEVOLUCION"); setFacturaSeleccionada(null); setFacturaDetalle(null); }}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            tipoOperacion === "DEVOLUCION"
              ? "bg-[#22c55e] text-black"
              : "bg-white/5 border border-white/10 text-white/70 hover:bg-white/10"
          }`}
        >
          <RotateCcw className="inline w-4 h-4 mr-1" /> Devolución
        </button>
        <button
          onClick={() => { setTipoOperacion("INTERCAMBIO"); setFacturaSeleccionada(null); setFacturaDetalle(null); }}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            tipoOperacion === "INTERCAMBIO"
              ? "bg-[#22c55e] text-black"
              : "bg-white/5 border border-white/10 text-white/70 hover:bg-white/10"
          }`}
        >
          <RotateCcw className="inline w-4 h-4 mr-1" /> Intercambio
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg py-3 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" /> {error}
        </div>
      )}

      {aviso && (
        <div className="mb-4 px-4 bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg py-3 flex items-center gap-2">
          <CheckCircle className="w-5 h-5" /> {aviso}
        </div>
      )}

      {/* Paso 1: Buscar factura */}
      <div className="bg-[var(--bg-card)] border border-white/5 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <FileText className="w-5 h-5" /> Paso 1: Seleccionar Factura de Compra
        </h2>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 w-5 h-5" />
          <input
            type="text"
            value={searchFactura}
            onChange={(e) => setSearchFactura(e.target.value)}
            placeholder="Buscar por número de factura, proveedor, fecha..."
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#22c55e]/50"
          />
        </div>

        {loadingFacturas ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white/5 border border-white/5 rounded-lg p-4">
                <div className="h-4 bg-white/10 rounded w-1/4" />
              </div>
            ))}
          </div>
        ) : facturas.length === 0 ? (
          <p className="text-center text-white/30 py-8">No se encontraron facturas</p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/40 text-left">
                  <th className="px-4 py-3 font-medium">N° Factura</th>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Proveedor</th>
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                  <th className="px-4 py-3 font-medium w-24" />
                </tr>
              </thead>
              <tbody>
                {facturas.map((f) => (
                  <tr
                    key={f.idFactura}
                    onClick={() => handleSeleccionarFactura(f)}
                    className={`border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors ${facturaSeleccionada?.idFactura === f.idFactura ? "bg-green-500/5" : ""}`}
                  >
                    <td className="px-4 py-3 text-white font-mono">{f.numeroFactura}</td>
                    <td className="px-4 py-3 text-white/70">{fmtFecha(f.fechaEmision)}</td>
                    <td className="px-4 py-3 text-white/70">{f.nombreProveedor}</td>
                    <td className="px-4 py-3 text-right text-white font-mono">{fmtMoneda(f.totalGeneral)}</td>
                    <td className="px-4 py-3 text-center">
                      {facturaSeleccionada?.idFactura === f.idFactura ? (
                        <span className="text-green-400 text-sm font-medium">Seleccionada</span>
                      ) : (
                        <span className="text-white/40 text-sm">Seleccionar</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paso 2: Detalle de factura y selección de productos */}
      {facturaDetalle && (
        <div className="bg-[var(--bg-card)] border border-white/5 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <FileText className="w-5 h-5" /> Paso 2: Seleccionar Productos a Devolver
            </h2>
            <button
              onClick={() => { setFacturaSeleccionada(null); setFacturaDetalle(null); }}
              className="text-sm text-[#22c55e] hover:underline flex items-center gap-1"
            >
              <X className="w-4 h-4" /> Cambiar factura
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-white/40">N° Factura</p>
              <p className="text-white font-mono">{facturaDetalle.numeroFactura}</p>
            </div>
            <div>
              <p className="text-white/40">Fecha</p>
              <p className="text-white">{fmtFecha(facturaDetalle.fechaEmision)}</p>
            </div>
            <div>
              <p className="text-white/40">Proveedor</p>
              <p className="text-white">{facturaDetalle.nombreProveedor}</p>
            </div>
            <div>
              <p className="text-white/40">Total Factura</p>
              <p className="text-white font-mono">{fmtMoneda(facturaDetalle.totalGeneral)}</p>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/40 text-left">
                  <th className="px-4 py-3 font-medium">Producto</th>
                  <th className="px-4 py-3 font-medium text-center">Comprado</th>
                  <th className="px-4 py-3 font-medium text-center">Devuelto</th>
                  <th className="px-4 py-3 font-medium text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {facturaDetalle.detalles?.map((d) => {
                  const devuelto = productosDevueltos[d.idProducto] || 0;
                  const max = d.cantidad || 0;
                  const subtotal = devuelto * (d.precioUnitario || 0);
                  return (
                    <tr key={d.idProducto} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-4 py-3 text-white">{d.nombreProducto}</td>
                      <td className="px-4 py-3 text-center text-white/70 font-mono">{d.cantidad} {d.nombreUnidadMedida || ""}</td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max={max}
                          step={d.nombreUnidadMedida?.toLowerCase().includes("kg") ? "0.001" : "1"}
                          value={devuelto}
                          onChange={(e) => handleCambiarCantidad(d.idProducto, e.target.value)}
                          className="w-24 bg-white/5 border border-white/10 rounded px-2 py-1 text-right text-sm font-mono text-white outline-none focus:border-[#22c55e]/50"
                        />
                      </td>
                      <td className="px-4 py-3 text-right text-white font-mono">{fmtMoneda(subtotal)}</td>
                    </tr>
                  );
                })}
                {(!facturaDetalle.detalles || facturaDetalle.detalles.length === 0) && (
                  <tr>
                    <td colSpan="4" className="px-4 py-8 text-center text-white/30">La factura no tiene productos</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="text-right pt-2 border-t border-white/10">
            <p className="text-sm font-mono text-white">Total a devolver: <span className="text-[#22c55e]">{fmtMoneda(totalDevuelto)}</span></p>
          </div>
        </div>
      )}

      {/* Paso 3: Datos de la devolución */}
      {facturaSeleccionada && (
        <div className="bg-[var(--bg-card)] border border-white/5 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileText className="w-5 h-5" /> Paso 3: Datos de la Devolución
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">Motivo *</label>
              <select
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#22c55e]/50"
              >
                <option value="">Seleccionar motivo</option>
                {MOTIVOS_DEVOLUCION.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              {motivo === "OTRO" && (
                <input
                  type="text"
                  value={motivoOtro}
                  onChange={(e) => setMotivoOtro(e.target.value)}
                  placeholder="Especificar motivo"
                  className="mt-2 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#22c55e]/50"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">Tipo de Documento del Proveedor</label>
              <select
                value={tipoDocumento}
                onChange={(e) => setTipoDocumento(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#22c55e]/50"
              >
                <option value="">Seleccionar</option>
                {TIPOS_DOCUMENTO.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">Número de Documento</label>
              <input
                type="text"
                value={numeroDocumento}
                onChange={(e) => setNumeroDocumento(e.target.value)}
                placeholder="Ej: 001-001-0001234"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#22c55e]/50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">Fecha del Documento</label>
              <input
                type="date"
                value={fechaDocumento}
                onChange={(e) => setFechaDocumento(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#22c55e]/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-white/70 mb-1">Observaciones</label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={3}
              placeholder="Observaciones adicionales..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#22c55e]/50 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button
              onClick={() => { setFacturaSeleccionada(null); setFacturaDetalle(null); }}
              className="px-6 py-2.5 bg-white/5 border border-white/10 text-white/70 rounded-lg hover:bg-white/10 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleGuardar}
              disabled={!puedeGuardar || guardando}
              className="px-6 py-2.5 bg-[#22c55e] hover:bg-green-400 text-black font-medium rounded-lg transition-colors disabled:opacity-40 disabled:pointer-events-none flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {guardando ? "Guardando..." : `Registrar ${tipoOperacion === "DEVOLUCION" ? "Devolución" : "Intercambio"}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}