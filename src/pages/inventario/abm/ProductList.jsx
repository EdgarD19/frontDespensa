import {
  Pencil,
  Plus,
  Check,
  Ban,
  Trash2,
} from "lucide-react";
import Pagination from "../../../components/ui/Pagination";
import { TABLE_SHELL,THEAD_ROW } from "../../../components/ui/styles";
import SearchField from "../../../components/ui/SearchField";

/* ───────────── Helpers ───────────── */

function getPrecio(p) {
  return Number(p.precioVenta ?? p.price ?? 0);
}

function formatPrecioVenta(p) {
  return getPrecio(p).toLocaleString("es-PY");
}

const iconBtn =
  "flex h-8 w-8 items-center justify-center rounded-none text-white/40 transition-colors";

/* ───────────── Componente principal ───────────── */

export default function ProductList({
  products = [],
  loading = false,
  search = "",
  onSearch,
  onSeleccionar,
  onToggleActivo,
  onPrecio,
  onNuevo,
  paginacion = { page: 0, totalPages: 0 },
  onPageChange,
  totalItems = 0,
  pageSize = 10,
}) {
  const { page = 0, totalPages = 0 } = paginacion;

  return (
    <div className="flex flex-col gap-5">

      {/* Barra superior */}
      <div className="flex items-center gap-3">
        <SearchField
          value={search}
          onChange={onSearch}
          placeholder="Buscar por nombre..."
          ariaLabel="Buscar producto por nombre"
          className="py-2.5"
          wrapperClass="relative flex-1"
        />

        <button
          type="button"
          onClick={onNuevo}
          className="flex items-center gap-2 whitespace-nowrap rounded-none
            bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-black
            transition hover:bg-[var(--accent-hover)] focus:outline-none
            focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50"
        >
          <Plus className="h-4 w-4" />
          Nuevo producto
        </button>
      </div>

      {/* Tabla */}
      <div className={TABLE_SHELL}>
        <table className="w-full text-sm">
          <thead>
            <tr className={THEAD_ROW}>
              <th className="w-36 px-4 py-3 font-medium">Código</th>
              <th className="px-4 py-3 font-medium">Producto</th>
              <th className="w-40 px-4 py-3 font-medium">Categoría</th>
              <th className="w-32 px-4 py-3 font-medium">Unidad</th>
              <th className="w-40 px-4 py-3 text-right font-medium">Precio venta</th>
              <th className="w-32 px-4 py-3 font-medium">Estado</th>
              <th className="w-32 px-4 py-3 font-medium" aria-label="Acciones" />
            </tr>
          </thead>

          <tbody>
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-white/10 last:border-0 transition hover:bg-white/[0.04]">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 w-3/4 animate-pulse rounded-none bg-white/10" />
                    </td>
                  ))}
                </tr>
              ))}

            {!loading && products.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <p className="text-white/60">No se encontraron productos.</p>
                  <p className="mt-1 text-xs text-white/30">
                    {search
                      ? "Probá con otro nombre o limpiá la búsqueda."
                      : "Agregá el primero con “Nuevo producto”."}
                  </p>
                </td>
              </tr>
            )}

            {!loading &&
              products.map((p) => {
                const activo = p.activo !== false;
                const sinPrecioVenta = getPrecio(p) <= 0;

                return (
                  <tr
                    key={p.id}
                    onClick={() => onSeleccionar?.(p)}
                    className={`cursor-pointer border-b border-white/10 transition-colors
                      last:border-0 hover:bg-white/[0.04] ${!activo ? "opacity-60" : ""}`}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-white/40">
                      {p.codigoBarras || "—"}
                    </td>

                    <td
                      className="max-w-[14rem] truncate px-4 py-3 font-medium capitalize text-white"
                      title={p.nombre}
                    >
                      {p.nombre}
                    </td>

                    <td className="px-4 py-3">
                      {p.categoria ? (
                        <span className="inline-flex rounded-full bg-white/5 px-2.5 py-1 text-xs font-medium text-white/70 ring-1 ring-inset ring-white/10">
                          {p.categoria}
                        </span>
                      ) : (
                        <span className="text-white/30">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-white/70">{p.unidadMedida || "—"}</td>

                    <td className="px-4 py-3 text-right tabular-nums">
                      {sinPrecioVenta ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300 ring-1 ring-inset ring-amber-500/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                          Sin precio
                        </span>
                      ) : (
                        <span className="font-semibold text-zinc-100">
                          ₲{formatPrecioVenta(p)}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                          activo
                            ? "bg-[var(--accent-dim)] text-[var(--accent)]"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            activo ? "bg-[var(--accent)]" : "bg-red-400"
                          }`}
                        />
                        {activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {/* Editar */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSeleccionar?.(p);
                          }}
                          className={`${iconBtn} hover:bg-sky-500/10 hover:text-sky-400`}
                          title="Editar producto"
                          aria-label="Editar producto"
                        >
                          <Pencil size={16} />
                        </button>

                        {/* Precio de venta */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPrecio?.(p);
                          }}
                          className={`${iconBtn} hover:bg-[var(--accent-dim)] hover:text-[var(--accent)] ${
                            sinPrecioVenta ? "!text-amber-400" : ""
                          }`}
                          title={sinPrecioVenta ? "Definir precio de venta" : "Actualizar precio de venta"}
                          aria-label="Actualizar precio de venta"
                        >
                          <span className="text-sm leading-none font-semibold">₲</span>
                        </button>

                        {/* Activar / Desactivar */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleActivo?.(p);
                          }}
                          className={`${iconBtn} ${
                            activo
                              ? "hover:bg-red-500/10 hover:text-red-400"
                              : "hover:bg-[var(--accent-dim)] hover:text-[var(--accent)]"
                          }`}
                          title={activo ? "Desactivar producto" : "Activar producto"}
                          aria-label={activo ? "Desactivar producto" : "Activar producto"}
                        >
                          {activo ? <Ban size={16} /> : <Check size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Paginación << < > >> */}
      {totalPages > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={onPageChange}
          pageSize={pageSize}
          totalItems={totalItems || undefined}
        />
      )}
    </div>
  );
}