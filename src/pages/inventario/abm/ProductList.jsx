import { useState } from "react";
import { Search, Pencil, Ban, X, ChevronLeft, ChevronRight, Plus, Eye } from "lucide-react";

const fieldClass = "flex items-center gap-2 rounded-lg px-3 py-2 bg-white/5 border border-white/10";
const inputClass = "flex-1 bg-transparent border-none outline-none w-full text-white placeholder:text-white/30 focus:ring-0 text-sm";
const btnPrimary = "inline-flex items-center justify-center gap-2 px-4 py-2 bg-[var(--accent-green)]/90 hover:bg-[var(--accent-green)] text-white rounded-lg font-medium transition-all duration-300 text-sm";

export default function ProductList({
  products,
  loading,
  search,
  onSearch,
  onEdit,
  onDelete,
  onNuevo,
  paginacion,
  onPageChange,
}) {
  const [detalleProducto, setDetalleProducto] = useState(null);
  const page = paginacion?.page ?? 0;
  const totalPages = paginacion?.totalPages ?? 0;

  return (
    <div className="rounded-lg bg-white/5 border border-white/10 flex flex-col min-h-[60vh]">
      <div className="p-4 border-b border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Lista de productos</h2>
            <p className="text-xs text-white/40 mt-0.5">{products.length} productos</p>
          </div>
          <button type="button" onClick={onNuevo} className={btnPrimary}>
            <Plus className="w-4 h-4" />
            Nuevo producto
          </button>
        </div>
        <div className={fieldClass}>
          <Search className="w-4 h-4 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Buscar por nombre..."
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-white/40 text-sm">Cargando...</div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="w-8 h-8 text-white/20 mb-3" />
            <p className="text-white/40 text-sm">No se encontraron productos</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="bg-white/5 text-left">
                  <th className="px-4 py-3 font-medium text-white/40 border-b border-white/10">Código</th>
                  <th className="px-4 py-3 font-medium text-white/40 border-b border-white/10">Producto</th>
                  <th className="px-4 py-3 font-medium text-white/40 border-b border-white/10">Categoría</th>
                  <th className="px-4 py-3 font-medium text-white/40 border-b border-white/10">Marca</th>
                  <th className="px-4 py-3 font-medium text-white/40 border-b border-white/10 text-right">P. Venta</th>
                  <th className="px-4 py-3 font-medium text-white/40 border-b border-white/10 text-center">Estado</th>
                  <th className="px-4 py-3 font-medium text-white/40 border-b border-white/10 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const precio = Number(p.precioVenta || 0);
                  const precioText = precio > 0 ? `₲ ${precio.toLocaleString("es-PY")}` : "—";
                  const activo = p.activo !== false;

                  return (
                    <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-white/40 font-mono text-xs align-middle">{p.codigoBarras || "—"}</td>
                      <td className="px-4 py-3 align-middle">
                        <p className="font-medium text-white truncate max-w-[14rem]" title={p.nombre}>{p.nombre}</p>
                      </td>
                      <td className="px-4 py-3 align-middle text-white/60 text-sm">{p.categoria || "—"}</td>
                      <td className="px-4 py-3 align-middle text-white/60 text-sm">{p.marca || "—"}</td>
                      <td className="px-4 py-3 text-right align-middle">
                        <span className="font-semibold text-[var(--accent-green)]">{precioText}</span>
                      </td>
                      <td className="px-4 py-3 text-center align-middle">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          activo
                            ? "bg-green-500/10 text-green-400 border border-green-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}>
                          {activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center align-middle">
                        <div className="flex items-center justify-center gap-1">
                          <button type="button" onClick={() => onEdit(p)}
                            className="p-2 rounded-md bg-white/5 text-white/70 hover:bg-white/10 border border-white/10 transition-all"
                            title="Editar">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => onDelete(p.id)}
                            className="p-2 rounded-md bg-white/5 text-white/70 hover:bg-orange-500/20 border border-white/10 transition-all"
                            title="Inactivar">
                            <Ban className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => setDetalleProducto(p)}
                            className="p-2 rounded-md bg-white/5 text-white/70 hover:bg-white/10 border border-white/10 transition-all"
                            title="Detalles">
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
          <span className="text-xs text-white/40">Página {page + 1} de {totalPages}</span>
          <div className="flex gap-1">
            <button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 0}
              className="p-2 rounded-md bg-white/5 text-white/70 hover:bg-white/10 border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages - 1}
              className="p-2 rounded-md bg-white/5 text-white/70 hover:bg-white/10 border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {detalleProducto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setDetalleProducto(null)}>
          <div className="bg-[#1a1f2e] rounded-xl border border-white/10 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white">{detalleProducto.nombre}</h3>
              <button type="button" onClick={() => setDetalleProducto(null)}
                className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-white/40 mb-1">Precio compra</p>
                  <p className="text-white font-medium">
                    {detalleProducto.precioCompra
                      ? `₲ ${Number(detalleProducto.precioCompra).toLocaleString("es-PY")}`
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-1">Subcategoría</p>
                  <p className="text-white font-medium">{detalleProducto.subcategoria || "—"}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-white/40 mb-1">Última actualización</p>
                <p className="text-white font-medium">
                  {detalleProducto.fechaActualizacion
                    ? new Date(detalleProducto.fechaActualizacion).toLocaleString("es-PY", {
                        year: "numeric", month: "2-digit", day: "2-digit",
                        hour: "2-digit", minute: "2-digit",
                      })
                    : "—"}
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-white/10 flex justify-end">
              <button type="button" onClick={() => setDetalleProducto(null)}
                className="px-4 py-2 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 transition-all text-sm">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
