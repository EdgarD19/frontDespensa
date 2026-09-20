import { Search, ToggleLeft, ToggleRight, Pencil } from "lucide-react";
import Pagination from "../../../../components/ui/Pagination";

export default function ProveedoresTabla({
  proveedores = [],
  loading = false,
  search = "",
  onSearch,
  onSeleccionar,
  onToggleActivo,
  onNuevo,
  paginacion = { page: 0, totalPages: 0 },
  onPageChange,
  totalItems = 0,
  pageSize = 10,
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 py-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input type="text" value={search} onChange={(e) => onSearch(e.target.value)}
            placeholder="Buscar por nombre, RUC, contacto, teléfono..."
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[var(--accent-green)] transition-colors" />
        </div>
        <button onClick={onNuevo}
          className="flex items-center gap-2 bg-[var(--accent-green)] hover:opacity-90 text-black text-sm font-medium px-4 py-2 rounded-lg transition-opacity whitespace-nowrap">
          Nuevo proveedor
        </button>
      </div>

      <div className="overflow-hidden border border-[#1e1e24] bg-[#111114] shadow-lg shadow-black/20">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-emerald-500/10 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
              <th className="px-4 py-3 font-medium">Nombre / Razón Social</th>
              <th className="px-4 py-3 font-medium">Documento</th>
              <th className="px-4 py-3 font-medium">Contacto</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="w-24 px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-[#1e1e24] last:border-0">
                {Array.from({ length: 5 }).map((_, j) => (
                  <td key={j} className="px-4 py-4"><div className="h-4 w-3/4 animate-pulse rounded bg-white/10" /></td>
                ))}
              </tr>
            ))}
            {!loading && proveedores.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-white/30">No se encontraron proveedores.</td></tr>
            )}
            {!loading && proveedores.map((p) => {
              const activo = p.activo !== false;
              const nombre = p.tipoPersona === "FISICA"
                ? [p.nombre, p.apellido].filter(Boolean).join(" ") || "—"
                : (p.nombre || "—");
              return (
                <tr key={p.id ?? p.idProveedor} onClick={() => onSeleccionar(p)}
                  className={`border-b border-[#1e1e24] cursor-pointer transition-colors hover:bg-white/[0.04] last:border-0 ${!activo ? "opacity-60" : ""}`}>
                  <td className="px-4 py-4 text-white">{nombre}</td>
                  <td className="px-4 py-4 text-white/70">{p.numeroDocumento || "—"}</td>
                  <td className="px-4 py-4 text-white/70">{p.personaContacto || "—"}</td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                      activo ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${activo ? "bg-emerald-400" : "bg-red-400"}`} />
                      {activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button type="button" onClick={(e) => { e.stopPropagation(); onSeleccionar(p); }}
                        className="p-1.5 rounded text-white/40 hover:text-[var(--accent-green)] hover:bg-[var(--accent-green)]/10 transition-colors"
                        title="Editar proveedor" aria-label="Editar proveedor">
                        <Pencil size={16} />
                      </button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); onToggleActivo?.(p); }}
                        className={`p-1.5 rounded transition-colors ${activo ? "text-green-400 hover:bg-green-500/10" : "text-white/40 hover:text-green-400 hover:bg-green-500/10"}`}
                        title={activo ? "Inactivar proveedor" : "Activar proveedor"} aria-label={activo ? "Inactivar proveedor" : "Activar proveedor"}>
                        {activo ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {paginacion.totalPages > 0 && (
        <Pagination
          page={paginacion.page}
          totalPages={paginacion.totalPages}
          onPageChange={onPageChange}
          pageSize={pageSize}
          totalItems={totalItems || undefined}
        />
      )}
    </div>
  );
}
