import { Search, ChevronLeft, ChevronRight, ToggleLeft, ToggleRight } from "lucide-react";

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
            className="w-full bg-white/5 border border-white/10 rounded-lg
                      pl-9 pr-4 py-2 text-sm text-white placeholder:text-white/30
                      focus:outline-none focus:border-[var(--accent-green)] transition-colors"
          />
        </div>

        <button
          onClick={onNuevo}
          className="flex items-center gap-2 bg-[var(--accent-green)] hover:opacity-90
                    text-black text-sm font-medium px-4 py-2 rounded-lg
                    transition-opacity whitespace-nowrap"
        >
          Nuevo cliente
        </button>
      </div>
      
      {/* Tabla */}
      <div className="bg-[var(--bg-card)] border border-white/5 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-white/40 text-left">
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
                <tr key={i} className="border-b border-white/5">
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
              const esJuridica = c.tipoCliente === "JURIDICA";
              const nombre = esJuridica
                ? (c.razonSocial || "—")
                : ([c.name ?? c.firstName, c.lastName].filter(Boolean).join(" ") || "—");
              const doc = c.documentNumber || "—";
              const activo = c.activo !== false;

              return (
                <tr
                  key={c.id ?? c.idCliente}
                  onClick={() => onSeleccionar(c)}
                  className={`border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors ${
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
      {paginacion.totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm text-white/50">
          <button
            onClick={() => onPageChange(paginacion.page - 1)}
            disabled={paginacion.page === 0}
            className="p-1.5 rounded hover:bg-white/10 disabled:opacity-30
                       disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} />
          </button>

          <span>
            Página {paginacion.page + 1} de {paginacion.totalPages}
          </span>

          <button
            onClick={() => onPageChange(paginacion.page + 1)}
            disabled={paginacion.page >= paginacion.totalPages - 1}
            className="p-1.5 rounded hover:bg-white/10 disabled:opacity-30
                       disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
