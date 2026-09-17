import { useState, useEffect, useCallback } from "react";
import { Search, Filter, X, FileText, History, ChevronLeft, ChevronRight, MoreHorizontal, CheckCircle } from "lucide-react";
import { apiErrorMessage } from "../../../api/errors";
import { getOperaciones, updateOperacion } from "./operacionesStore";

const TIPOS_OPERACION = [
  { value: "", label: "Todos" },
  { value: "DEVOLUCION", label: "Devolución" },
  { value: "INTERCAMBIO", label: "Intercambio" },
];

const ESTADOS_OPERACION = [
  { value: "", label: "Todos" },
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "RECIBIDO", label: "Recibido" },
  { value: "PROCESADA", label: "Procesada" },
  { value: "RECHAZADA", label: "Rechazada" },
];

function estadoBadgeClass(estado) {
  if (estado === "PROCESADA" || estado === "RECIBIDO") return "bg-green-500/10 text-green-400";
  if (estado === "PENDIENTE") return "bg-yellow-500/10 text-yellow-400";
  return "bg-red-500/10 text-red-400";
}

function fmtMoneda(n) {
  return new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", minimumFractionDigits: 0 }).format(n ?? 0);
}

function fmtFechaHora(valor) {
  if (!valor) return "—";
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? String(valor) : d.toLocaleString("es-PY", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const MOCK_OPERACIONES = [
  {
    id: 1,
    tipo: "DEVOLUCION",
    estado: "PROCESADA",
    fecha: "2026-09-15T10:30:00",
    facturaNumero: "001-001-0001234",
    proveedor: "Distribuidora Central S.A.",
    proveedorId: 1,
    total: 450000,
    items: [
      { producto: "Azúcar 1kg", cantidad: 5, precioUnitario: 12000 },
      { producto: "Arroz 5kg", cantidad: 2, precioUnitario: 45000 },
    ],
    motivo: "DANIADO",
    documentoTipo: "NOTA_CREDITO",
    documentoNumero: "NC-001-001-000456",
    observaciones: "Empaques rotos en transporte",
  },
  {
    id: 2,
    tipo: "INTERCAMBIO",
    estado: "PENDIENTE",
    fecha: "2026-09-14T14:15:00",
    facturaNumero: "001-002-0000987",
    proveedor: "Proveedora del Norte",
    proveedorId: 2,
    total: 780000,
    items: [
      { producto: "Harina 000 25kg", cantidad: 1, precioUnitario: 180000, tipo: "entregar" },
      { producto: "Harina 0000 25kg", cantidad: 1, precioUnitario: 185000, tipo: "recibir" },
    ],
    motivo: "INCORRECTO",
    documentoTipo: "NOTA_CREDITO",
    documentoNumero: "NC-001-002-000123",
    observaciones: "Se envió harina 000 en lugar de 0000",
  },
  {
    id: 3,
    tipo: "DEVOLUCION",
    estado: "RECHAZADA",
    fecha: "2026-09-12T09:45:00",
    facturaNumero: "001-003-0000456",
    proveedor: "Mayorista Sur S.R.L.",
    proveedorId: 3,
    total: 230000,
    items: [
      { producto: "Aceite 900ml", cantidad: 10, precioUnitario: 23000 },
    ],
    motivo: "VENCIDO",
    documentoTipo: "OTRO",
    documentoNumero: "REC-001",
    observaciones: "Proveedor rechazó devolución por política de 30 días",
  },
  {
    id: 4,
    tipo: "INTERCAMBIO",
    estado: "PROCESADA",
    fecha: "2026-09-10T16:20:00",
    facturaNumero: "001-001-0001100",
    proveedor: "Distribuidora Central S.A.",
    proveedorId: 1,
    total: 560000,
    items: [
      { producto: "Yerba 1kg", cantidad: 20, precioUnitario: 28000, tipo: "entregar" },
      { producto: "Yerba 500g", cantidad: 40, precioUnitario: 15000, tipo: "recibir" },
    ],
    motivo: "DEFECTUOSO",
    documentoTipo: "NOTA_CREDITO",
    documentoNumero: "NC-001-001-000789",
    observaciones: "Envase defectuoso con fuga",
  },
];

export default function HistorialDevoluciones() {
  const [operaciones, setOperaciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroFechaDesde, setFiltroFechaDesde] = useState("");
  const [filtroFechaHasta, setFiltroFechaHasta] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize] = useState(10);
  const [operacionDetalle, setOperacionDetalle] = useState(null);
  const [avisoRecepcion, setAvisoRecepcion] = useState(null);
  const [error, setError] = useState(null);

  const cargarOperaciones = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Simulación: las operaciones registradas se leen de localStorage; el resto son datos de ejemplo
      await new Promise(r => setTimeout(r, 300));
      setOperaciones([...getOperaciones(), ...MOCK_OPERACIONES]);
    } catch (err) {
      console.error("Error al cargar historial:", err);
      setError(apiErrorMessage(err) || "No se pudo cargar el historial.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarOperaciones();
  }, [cargarOperaciones]);

  const operacionesFiltradas = operaciones.filter(op => {
    const matchSearch = !search ||
      op.facturaNumero.toLowerCase().includes(search.toLowerCase()) ||
      op.proveedor.toLowerCase().includes(search.toLowerCase()) ||
      (op.motivo || "").toLowerCase().includes(search.toLowerCase());
    const matchTipo = !filtroTipo || op.tipo === filtroTipo;
    const matchEstado = !filtroEstado || op.estado === filtroEstado;
    const fechaOp = new Date(op.fecha);
    const matchDesde = !filtroFechaDesde || fechaOp >= new Date(filtroFechaDesde);
    const matchHasta = !filtroFechaHasta || fechaOp <= new Date(filtroFechaHasta);
    return matchSearch && matchTipo && matchEstado && matchDesde && matchHasta;
  });

  const totalPages = Math.ceil(operacionesFiltradas.length / pageSize) || 1;
  const operacionesPagina = operacionesFiltradas.slice(page * pageSize, (page + 1) * pageSize);

  const handleVerDetalle = (op) => {
    setOperacionDetalle(op);
    setAvisoRecepcion(null);
  };

  const handleCerrarDetalle = () => {
    setOperacionDetalle(null);
    setAvisoRecepcion(null);
  };

  const handleConfirmarRecepcion = () => {
    if (!operacionDetalle) return;
    const cambios = { estado: "RECIBIDO", fechaRecepcion: new Date().toISOString() };
    updateOperacion(operacionDetalle.id, cambios);
    const actualizada = { ...operacionDetalle, ...cambios };
    setOperaciones(prev => prev.map(op => String(op.id) === String(operacionDetalle.id) ? actualizada : op));
    setOperacionDetalle(actualizada);
    setAvisoRecepcion("Recepción confirmada (simulación). El stock del reemplazo se incrementa ahora.");
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-[#f1f1f3] tracking-tight">Historial de Devoluciones e Intercambios</h1>
        <p className="text-sm text-[#5a5a6e]">Consulta y filtra las operaciones registradas</p>
      </div>

      {error && (
        <div className="mb-4 px-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg py-3">
          {error}
        </div>
      )}

      {/* Filtros */}
      <div className="bg-[var(--bg-card)] border border-white/5 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Filter className="w-5 h-5" /> Filtros
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-white/70 mb-1">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 w-5 h-5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="N° factura, proveedor, motivo..."
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#22c55e]/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-white/70 mb-1">Tipo</label>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#22c55e]/50"
            >
              {TIPOS_OPERACION.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-white/70 mb-1">Estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#22c55e]/50"
            >
              {ESTADOS_OPERACION.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-white/70 mb-1">Fecha desde</label>
            <input
              type="date"
              value={filtroFechaDesde}
              onChange={(e) => setFiltroFechaDesde(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#22c55e]/50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/70 mb-1">Fecha hasta</label>
            <input
              type="date"
              value={filtroFechaHasta}
              onChange={(e) => setFiltroFechaHasta(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#22c55e]/50"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={() => {
              setSearch("");
              setFiltroTipo("");
              setFiltroEstado("");
              setFiltroFechaDesde("");
              setFiltroFechaHasta("");
              setPage(0);
            }}
            className="px-4 py-2 text-sm bg-white/5 border border-white/10 text-white/70 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4 mr-1" /> Limpiar
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-[var(--bg-card)] border border-white/5 rounded-xl overflow-hidden">
        {loading ? (
          <div className="space-y-2 p-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white/5 border border-white/5 rounded-lg p-4">
                <div className="h-4 bg-white/10 rounded w-1/4" />
              </div>
            ))}
          </div>
        ) : operacionesFiltradas.length === 0 ? (
          <div className="p-8 text-center text-white/30">
            <History className="w-12 h-12 mx-auto mb-4 text-white/20" />
            <p>No se encontraron operaciones con los filtros actuales</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-white/40 text-left">
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Tipo</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">N° Factura</th>
                    <th className="px-4 py-3 font-medium">Proveedor</th>
                    <th className="px-4 py-3 font-medium text-right">Total</th>
                    <th className="px-4 py-3 font-medium w-16" />
                  </tr>
                </thead>
                <tbody>
                  {operacionesPagina.map((op) => (
                    <tr
                      key={op.id}
                      onClick={() => handleVerDetalle(op)}
                      className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-white/70">{fmtFechaHora(op.fecha)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                          op.tipo === "DEVOLUCION" ? "bg-blue-500/10 text-blue-400" : "bg-purple-500/10 text-purple-400"
                        }`}>
                          {op.tipo === "DEVOLUCION" ? "Devolución" : "Intercambio"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${estadoBadgeClass(op.estado)}`}>
                          {op.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white font-mono">{op.facturaNumero}</td>
                      <td className="px-4 py-3 text-white/70">{op.proveedor}</td>
                      <td className="px-4 py-3 text-right text-white font-mono">{fmtMoneda(op.total)}</td>
                      <td className="px-4 py-3 text-center">
                        <MoreHorizontal className="w-5 h-5 text-white/40 mx-auto" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-white/5">
                <div className="text-sm text-white/40">
                  Página {page + 1} de {totalPages} · {operacionesFiltradas.length} operaciones
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="p-2 rounded bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page === totalPages - 1}
                    className="p-2 rounded bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal detalle */}
      {operacionDetalle && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1a1a20] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {operacionDetalle.tipo === "DEVOLUCION" ? "Detalle de Devolución" : "Detalle de Intercambio"} #{operacionDetalle.id}
                </h2>
                <p className="text-xs text-[#7a7a8c] mt-0.5">
                  {operacionDetalle.proveedor} · {fmtFechaHora(operacionDetalle.fecha)}
                </p>
              </div>
              <button
                onClick={handleCerrarDetalle}
                className="p-1 text-white/40 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-white/40">Fecha</p>
                  <p className="text-white">{fmtFechaHora(operacionDetalle.fecha)}</p>
                </div>
                <div>
                  <p className="text-white/40">Tipo</p>
                  <p className="text-white">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                      operacionDetalle.tipo === "DEVOLUCION" ? "bg-blue-500/10 text-blue-400" : "bg-purple-500/10 text-purple-400"
                    }`}>
                      {operacionDetalle.tipo === "DEVOLUCION" ? "Devolución" : "Intercambio"}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-white/40">Estado</p>
                  <p className="text-white">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${estadoBadgeClass(operacionDetalle.estado)}`}>
                      {operacionDetalle.estado}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-white/40">N° Factura</p>
                  <p className="text-white font-mono">{operacionDetalle.facturaNumero}</p>
                </div>
                {operacionDetalle.fechaRecepcion && (
                  <div>
                    <p className="text-white/40">Fecha recepción</p>
                    <p className="text-white">{fmtFechaHora(operacionDetalle.fechaRecepcion)}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-white/40">Proveedor</p>
                  <p className="text-white">{operacionDetalle.proveedor}</p>
                </div>
                <div>
                  <p className="text-white/40">Motivo</p>
                  <p className="text-white">{operacionDetalle.motivo}</p>
                </div>
                <div>
                  <p className="text-white/40">Documento</p>
                  <p className="text-white">{operacionDetalle.documentoTipo}: {operacionDetalle.documentoNumero}</p>
                </div>
                <div>
                  <p className="text-white/40">Total</p>
                  <p className="text-white font-mono">{fmtMoneda(operacionDetalle.total)}</p>
                </div>
              </div>

              {operacionDetalle.observaciones && (
                <div>
                  <p className="text-white/40">Observaciones</p>
                  <p className="text-white">{operacionDetalle.observaciones}</p>
                </div>
              )}

              <div className="pt-4 border-t border-white/5">
                <h3 className="text-sm font-semibold text-white mb-3">Productos</h3>
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-white/40 text-left">
                        <th className="px-4 py-3 font-medium">Producto</th>
                        <th className="px-4 py-3 font-medium text-center">Cant.</th>
                        <th className="px-4 py-3 font-medium text-center">Tipo</th>
                        <th className="px-4 py-3 font-medium text-right">Precio Unit.</th>
                        <th className="px-4 py-3 font-medium text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {operacionDetalle.items.map((item, i) => (
                        <tr key={i} className="border-b border-white/5">
                          <td className="px-4 py-3 text-white">{item.producto}</td>
                          <td className="px-4 py-3 text-center text-white/70 font-mono">{item.cantidad}</td>
                          <td className="px-4 py-3 text-center">
                            {item.tipo === "entregar" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-500/10 text-red-400">Entregar</span>
                            ) : item.tipo === "recibir" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-500/10 text-green-400">Recibir</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-500/10 text-blue-400">Devolver</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-white font-mono">{fmtMoneda(item.precioUnitario)}</td>
                          <td className="px-4 py-3 text-right text-white font-mono">{fmtMoneda(item.cantidad * item.precioUnitario)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-4 border-t border-white/5">
                <p className="text-xs text-white/50">
                  {operacionDetalle.tipo === "INTERCAMBIO" && operacionDetalle.estado === "PENDIENTE"
                    ? "El stock entregado ya fue descontado; se incrementará al confirmar la recepción."
                    : avisoRecepcion && <span className="text-green-400">{avisoRecepcion}</span>}
                </p>
                <div className="flex gap-3">
                  {operacionDetalle.tipo === "INTERCAMBIO" && operacionDetalle.estado === "PENDIENTE" && (
                    <button
                      onClick={handleConfirmarRecepcion}
                      className="px-6 py-2.5 bg-[#22c55e] hover:bg-green-400 text-black font-medium rounded-lg transition-colors flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" /> Confirmar recepción
                    </button>
                  )}
                  <button
                    onClick={handleCerrarDetalle}
                    className="px-6 py-2.5 bg-white/5 border border-white/10 text-white/70 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}