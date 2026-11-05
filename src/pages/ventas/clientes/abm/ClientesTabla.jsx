import { ToggleLeft, ToggleRight, Pencil, Trash2 } from "lucide-react";
import Pagination from "../../../../components/ui/Pagination";
import { THEAD_ROW } from "../../../../components/ui/styles";
import SearchField from "../../../../components/ui/SearchField";

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
        <SearchField
          value={search}
          onChange={onSearch}
          placeholder="Buscar por Nombre / Razón Social, apellido o CI / RUC"
          ariaLabel="Buscar cliente por nombre, razón social, apellido o CI/RUC"
          wrapperClass="relative flex-1"
        />

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
            <tr className={THEAD_ROW}>
              <th className="px-4 py-3 font-medium">Nombre / Razón Social</th>
              <th className="px-4 py-3 font-medium">Celular</th>
              <th className="px-4 py-3 font-medium">CI / RUC</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium w-20" aria-label="Acciones" />
            </tr>
          </thead>

          <tbody>
            {loading && (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-white/10 last:border-0 transition hover:bg-white/[0.04]">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-white/10 rounded-none animate-pulse w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            )}

            {!loading && clientes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-white/30">
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
                  <td className="px-4 py-3 text-white/70">{c.celular || "—"}</td>
                  <td className="px-4 py-3 text-white/70">{doc}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      esJuridica
                        ? "bg-blue-500/10 text-blue-400"
                        : "bg-[var(--accent-dim)] text-[var(--accent)]"
                    }`}>
                      {esJuridica ? "Jurídica" : "Física"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      activo
                        ? "bg-[var(--accent-dim)] text-[var(--accent)]"
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
                        className="p-1.5 rounded-none text-white/40 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
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
                        className={`p-1.5 rounded-none transition-colors ${
                          activo
                            ? "text-[var(--accent)] hover:bg-[var(--accent-dim)]"
                            : "text-white/40 hover:text-[var(--accent)] hover:bg-[var(--accent-dim)]"
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
