import { Search, ToggleLeft, ToggleRight, Pencil } from "lucide-react";
import Pagination from "../../../../components/ui/Pagination";

export default function ClientesTabla({
  clientes = [],
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
      
      {/* Barra superior */}
      <div className="flex items-center gap-3 py-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"/>
          <input 
            type="text" 
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Buscar por nombre, apellido, razón social, RUC o documento"
            className="w-full bg-white/5 border border-white/10 rounded-none
                      pl-9 pr-4 py-2 text-sm text-white placeholder:text-white/30
                      focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>

        <button
          onClick={onNuevo}
          className="flex items-center gap-2 bg-[var(--accent)] hover:opacity-90
                    text-black text-sm font-medium px-4 py-2 rounded-none
                    transition-opacity whitespace-nowrap"
        >
          Nuevo cliente
        </button>
      </div>
      
      {/* Tabla */}
      <div className="overflow-hidden border border-white/10 bg-[#0c0c0e]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-emerald-500/10 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
              <th className="px-4 py-3 font-medium">Nombre / Razón Social</th>
              <th className="px-4 py-3 font-medium">Documento</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium w-20" aria-label="Acciones" />
            </tr>
          </thead>

          <tbody>
            {loading && (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-white/10 last:border-0 transition hover:bg-white/[0.04]">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-white/10 rounded animate-pulse w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            )}

            {!loading && clientes.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-white/30">
                  No se encontraron clientes.
                </td>
              </tr>
            )}

            {!loading && clientes.map((c) => {
              const esJuridica = c.tipoCliente === "JURIDICA" || c.tipoDocumento === "RUC";
              const nombre = [c.nombre ?? c.firstName ?? c.name ?? c.razonSocial, c.apellido ?? c.lastName]
                .filter(Boolean)
                .join(" ") || "—";
              const doc = c.numeroDocumento || c.documentNumber || "—";
              const activo = c.activo !== false;

              return (
                <tr
                  key={c.id ?? c.idCliente}
                  onClick={() => onSeleccionar(c)}
                  className={`border-b border-white/10 hover:bg-white/[0.04] last:border-0
 cursor-pointer transition-colors ${
                    !activo ? "opacity-60" : ""
                  }`}
                >
                  <td className="px-4 py-3 text-white">{nombre}</td>
                  <td className="px-4 py-3 text-white/70">{doc}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      esJuridica
                        ? "bg-blue-500/10 text-blue-400"
                        : "bg-green-500/10 text-green-400"
                    }`}>
                      {esJuridica ? "Jurídica" : "Física"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      activo
                        ? "bg-green-500/10 text-green-400"
                        : "bg-red-500/10 text-red-400"
                    }`}>
                      {activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSeleccionar?.(c);
                        }}
                        className="p-1.5 rounded text-white/40 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                        title="Editar cliente"
                        aria-label="Editar cliente"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleActivo?.(c);
                        }}
                        className={`p-1.5 rounded transition-colors ${
                          activo
                            ? "text-green-400 hover:bg-green-500/10"
                            : "text-white/40 hover:text-green-400 hover:bg-green-500/10"
                        }`}
                        title={activo ? "Inactivar cliente" : "Activar cliente"}
                        aria-label={activo ? "Inactivar cliente" : "Activar cliente"}
                      >
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

      {/* Paginación */}
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
