import { useState } from "react";
import { Check, Search, PackageOpen, X } from "lucide-react";
import { stockEntero } from "./utils";

export default function AjusteStock({ productos, categorias, disabled, onGenerar }) {
  const [categoria, setCategoria] = useState("");
  const [seleccion, setSeleccion] = useState([]);
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const q = search.trim().toLowerCase();
  const idsSeleccion = new Set(seleccion.map((p) => p.id));

  const candidatos = categoria
    ? productos.filter(
        (p) => Number(p.idCategoria) === Number(categoria) && !idsSeleccion.has(p.id)
      )
    : [];

  const resultados = search.trim()
    ? productos.filter(
        (p) =>
          !idsSeleccion.has(p.id) &&
          (p.nombre?.toLowerCase().includes(q) ||
            (p.codigoBarras && String(p.codigoBarras).includes(search.trim())))
      )
    : [];

  function toggleProducto(p) {
    setSeleccion((prev) =>
      idsSeleccion.has(p.id) ? prev.filter((x) => x.id !== p.id) : [...prev, p]
    );
  }

  function seleccionarTodos() {
    setSeleccion((prev) => {
      const ids = new Set(prev.map((x) => x.id));
      const faltantes = candidatos.filter((c) => !ids.has(c.id));
      return [...prev, ...faltantes];
    });
  }

  function limpiar() {
    setSeleccion([]);
    setCategoria("");
    setSearch("");
  }

  function generar() {
    if (seleccion.length === 0) return;
    const cat = categorias.find((c) => Number(c.id) === Number(categoria));
    onGenerar({
      productos: seleccion,
      descripcion: cat?.nombre || (categoria ? String(categoria) : "Manual"),
    });
    limpiar();
  }

  return (
    <div className="space-y-5">
      <ul className="flex flex-wrap gap-2">
        {seleccion.map((p) => (
          <li
            key={p.id}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#2a2a32] bg-[#1a1a22] px-3 py-1.5 text-xs text-[#f1f1f3]"
          >
            {p.nombre}
            {Number.isFinite(Number(p.stockActual)) && (
              <span className="text-[#22c55e] font-semibold tabular-nums">
                {stockEntero(p)}
              </span>
            )}
            <button
              type="button"
              onClick={() => toggleProducto(p)}
              disabled={disabled}
              className="text-[#5a5a6e] hover:text-rose-400 transition-colors disabled:opacity-50"
              title="Quitar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="block space-y-1.5">
          <span className="text-xs font-medium text-[#9a9aac]">
            Buscar producto para agregar
          </span>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a5a6e]" />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              disabled={disabled}
              placeholder="Buscar por nombre o código…"
              className="w-full rounded-lg border border-[#2a2a32] bg-[#111114] pl-10 pr-3 py-2.5 text-sm text-[#f1f1f3] placeholder:text-[#4a4a5a] focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/20 outline-none disabled:opacity-50"
            />
            {showDropdown && (
              <div className="absolute z-30 left-0 right-0 mt-1 rounded-lg border border-[#1e1e24] bg-[#111114] shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                {resultados.length === 0 ? (
                  <p className="p-3 text-sm text-[#5a5a6e]">
                    {search.trim() ? "No hay coincidencias." : "Escribí para buscar."}
                  </p>
                ) : (
                  <ul className="divide-y divide-[#1e1e24]">
                    {resultados.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onMouseDown={() => toggleProducto(p)}
                          className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-[#1a1a22] transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-[#f1f1f3] text-sm block truncate">
                              {p.nombre}
                            </span>
                            {p.codigoBarras ? (
                              <span className="text-xs text-[#5a5a6e] block truncate">
                                {p.codigoBarras}
                              </span>
                            ) : null}
                          </div>
                          <span className="text-xs font-semibold text-[#22c55e] tabular-nums whitespace-nowrap">
                            {stockEntero(p)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-[#9a9aac]">
            Filtrar por categoría
          </span>
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            disabled={disabled}
            className="w-full rounded-lg border border-[#2a2a32] bg-[#111114] px-3 py-2.5 text-sm text-[#f1f1f3] placeholder:text-[#4a4a5a] focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/25 outline-none disabled:opacity-50"
          >
            <option value="">Todas las categorías</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>

      {categoria && (
        <div className="rounded-xl border border-[#1e1e24] bg-[#0d0d0f] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1e1e24] flex items-center gap-2">
            <PackageOpen className="w-4 h-4 text-[#22c55e]" aria-hidden />
            <h3 className="text-sm font-semibold text-[#e1e1eb]">
              Productos de la categoría
            </h3>
            <span className="ml-auto text-xs text-[#5a5a6e] tabular-nums">
              {candidatos.length} disponible{candidatos.length !== 1 ? "s" : ""}
            </span>
            <button
              type="button"
              onClick={seleccionarTodos}
              disabled={disabled || candidatos.length === 0}
              className="text-xs font-medium text-[#22c55e] hover:text-green-400 disabled:opacity-40 transition-colors"
            >
              Seleccionar todo
            </button>
          </div>

          {candidatos.length === 0 ? (
            <p className="px-4 py-5 text-center text-sm text-[#5a5a6e]">
              {idsSeleccion.size
                ? "Todos los productos de esta categoría ya están en la lista."
                : "No hay productos en esta categoría."}
            </p>
          ) : (
            <ul className="max-h-56 overflow-y-auto divide-y divide-[#1e1e24]">
              {candidatos.map((p) => (
                <li key={p.id}>
                  <label className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#13131a] transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={idsSeleccion.has(p.id)}
                      onChange={() => toggleProducto(p)}
                      disabled={disabled}
                      className="accent-[#22c55e] w-4 h-4"
                    />
                    <span className="flex-1 min-w-0 font-medium text-[#f1f1f3] text-sm truncate">
                      {p.nombre}
                    </span>
                    <span className="text-xs font-semibold text-[#22c55e] tabular-nums whitespace-nowrap">
                      {stockEntero(p)}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex gap-3 items-center">
        <button
          type="button"
          onClick={generar}
          disabled={disabled || seleccion.length === 0}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[#22c55e] hover:bg-[#1aad4e] text-[#0d0d0f] text-sm font-semibold px-5 py-2.5 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <Check className="w-4 h-4" aria-hidden />
          Generar
        </button>
        <button
          type="button"
          disabled={disabled || (seleccion.length === 0 && !categoria)}
          onClick={limpiar}
          className="rounded-lg border border-[#2a2a32] bg-[#111114] px-4 py-2.5 text-sm font-medium text-[#b0b0c0] hover:bg-[#1a1a22] hover:text-[#e1e1eb] disabled:opacity-40 transition-colors"
        >
          Limpiar
        </button>
      </div>
    </div>
  );
}