import { useState } from "react";
import { Check, Search, Trash2, Barcode } from "lucide-react";
import { stockEntero } from "./utils";
import { getProductoByCodigo } from "../../../../api/productosApi";

export default function AjusteStock({ productos, categorias, disabled, onGenerar }) {
  const [categoria, setCategoria] = useState("");
  const [seleccion, setSeleccion] = useState([]);
  const [search, setSearch] = useState("");
  const [motivo, setMotivo] = useState("");
  const [motivoError, setMotivoError] = useState(false);
  const [codigoNoEncontrado, setCodigoNoEncontrado] = useState("");

  const idsSeleccion = new Set(seleccion.map((p) => p.id));

  const q = search.trim().toLowerCase();
  const base = q
    ? productos.filter((p) =>
        String(p.nombre || "").toLowerCase().includes(q) ||
        String(p.codigo || "").toLowerCase().includes(q) ||
        String(p.unitAbbreviation || p.unidadMedida || "").toLowerCase().includes(q)
      )
    : productos;
  const visibles = base
    .filter((p) => (categoria ? Number(p.idCategoria) === Number(categoria) : true))
    .filter((p) => !idsSeleccion.has(p.id))
    .sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || ""), "es"));

  function toggleProducto(p) {
    setSeleccion((prev) =>
      idsSeleccion.has(p.id) ? prev.filter((x) => x.id !== p.id) : [...prev, p]
    );
  }

  async function buscarPorCodigo(codigo) {
    const c = String(codigo ?? "").trim();
    if (!c) return;
    let prod = null;
    try {
      prod = await getProductoByCodigo(c);
    } catch {
      prod = null;
    }
    if (prod) {
      toggleProducto(prod);
      setSearch("");
      return;
    }
    setCodigoNoEncontrado(c);
    setTimeout(() => setCodigoNoEncontrado(""), 2500);
  }

  function seleccionarTodos() {
    setSeleccion((prev) => {
      const ids = new Set(prev.map((x) => x.id));
      const faltantes = visibles.filter((c) => !ids.has(c.id));
      return [...prev, ...faltantes];
    });
  }

  function limpiar() {
    setSeleccion([]);
    setCategoria("");
    setSearch("");
    setMotivo("");
    setMotivoError(false);
  }

  function generar() {
    if (seleccion.length === 0) return;
    if (!motivo) {
      setMotivoError(true);
      return;
    }
    const cat = categorias.find((c) => Number(c.id) === Number(categoria));
    onGenerar({
      productos: seleccion,
      descripcion: cat?.nombre || (categoria ? String(categoria) : "Manual"),
      motivo,
    });
    limpiar();
  }

  return (
    <div className="flex flex-col gap-5 h-full min-h-0">
      <div className="flex gap-5 flex-1 min-h-0">
        {/* Columna izquierda: buscar producto + lista de resultados */}
        <section className="w-[40%] min-w-0 flex flex-col gap-3 min-h-0">
          <label className="block space-y-1.5 shrink-0">
            <span className="text-xs font-medium text-white/70">
              Buscar producto para agregar
            </span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    buscarPorCodigo(search);
                  }
                }}
                disabled={disabled}
                placeholder="Escanear código de barras o buscar por nombre…"
                className="w-full rounded-none border border-white/10 bg-[#0c0c0e] pl-10 pr-12 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-[var(--accent)] focus:ring-1 focus:ring-[#22c55e]/20 outline-none disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => buscarPorCodigo(search)}
                disabled={disabled}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors disabled:opacity-50"
                title="Buscar por código de barras"
              >
                <Barcode size={16} />
              </button>
            </div>
          </label>

          {codigoNoEncontrado ? (
            <p className="shrink-0 text-xs text-rose-400">
              No se encontró el código "{codigoNoEncontrado}".
            </p>
          ) : null}

          <div className="flex-1 min-h-0 flex flex-col rounded-none border border-white/10 bg-white/[0.03] overflow-hidden">
            <div className="px-3 py-2 border-b border-white/10 flex items-center gap-2 shrink-0">
              <h3 className="text-sm font-semibold text-white">Productos</h3>
              <span className="ml-auto text-xs text-white/40 tabular-nums">
                {visibles.length} disponible{visibles.length !== 1 ? "s" : ""}
              </span>
              {categoria && visibles.length > 0 ? (
                <button
                  type="button"
                  onClick={seleccionarTodos}
                  disabled={disabled}
                  className="text-xs font-medium text-[var(--accent)] hover:text-green-400 disabled:opacity-40 transition-colors"
                >
                  Seleccionar todos
                </button>
              ) : null}
            </div>
            <ul className="flex-1 min-h-0 overflow-y-auto divide-y divide-[#1e1e24]">
              {visibles.length === 0 ? (
                <li className="px-4 py-3 text-sm text-white/40">
                  {q
                    ? "Sin resultados para esa búsqueda."
                    : categoria
                      ? "No hay productos en esta categoría."
                      : "Sin productos disponibles."}
                </li>
              ) : (
                visibles.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => toggleProducto(p)}
                      disabled={disabled}
                      className="w-full text-left px-3 py-2.5 flex items-center gap-2 hover:bg-[#13131a] transition-colors disabled:opacity-60"
                    >
                      <span className="flex-1 min-w-0 font-medium text-white text-sm truncate">
                        {p.nombre}
                      </span>
                      {p.unitAbbreviation || p.unidadMedida ? (
                        <span className="text-xs text-white/40 whitespace-nowrap">
                          {p.unitAbbreviation || p.unidadMedida}
                        </span>
                      ) : null}
                      <span className="text-xs font-semibold text-[var(--accent)] tabular-nums whitespace-nowrap">
                        {stockEntero(p)}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </section>

        {/* Columna derecha: motivo, categoría y seleccionados */}
        <section className="flex-1 min-w-0 flex flex-col gap-4 min-h-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 shrink-0">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-white/70">
              Filtrar por categoría
            </span>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              disabled={disabled}
              className="w-full rounded-none border border-white/10 bg-[#0c0c0e] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-[var(--accent)] focus:ring-1 focus:ring-[#22c55e]/25 outline-none disabled:opacity-50"
            >
              <option value="">Todas las categorías</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-white/70">Motivo</span>
            <select
              value={motivo}
              onChange={(e) => {
                setMotivo(e.target.value);
                setMotivoError(false);
              }}
              disabled={disabled}
              className="w-full rounded-none border border-white/10 bg-[#0c0c0e] px-3 py-2.5 text-sm text-white focus:border-[var(--accent)] focus:ring-1 focus:ring-[#22c55e]/20 outline-none disabled:opacity-50"
            >
              <option value="">Seleccionar motivo…</option>
              <option value="ROBO">Robo</option>
              <option value="MERMA">Merma</option>
              <option value="REGALO">Regalo</option>
              <option value="ERROR">Error</option>
              <option value="OTROS">Otros</option>
            </select>
            {motivoError && (
              <span className="mt-1 block text-xs text-rose-400">
                Seleccioná un motivo para la lista.
              </span>
            )}
          </label>
          </div>

          <div className="flex-1 min-h-0 flex flex-col">
            <label className="block text-xs font-medium text-white/70 mb-1.5 uppercase tracking-wider">
              Productos seleccionados
            </label>
            {seleccion.length > 0 ? (
              <div className="flex-1 min-h-0 overflow-hidden rounded-none border border-white/10 bg-[#0c0c0e]">
                <div className="h-full max-h-full overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-emerald-500/10 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300 sticky top-0">
                        <th className="px-4 py-3 font-medium">Producto</th>
                        <th className="w-16 px-4 py-3 text-center font-medium">U.M.</th>
                        <th className="w-24 px-4 py-3 text-right font-medium">Stock</th>
                        <th className="w-10 px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {seleccion.map((p) => (
                        <tr
                          key={p.id}
                          className="border-b border-white/10 last:border-0 transition hover:bg-white/[0.04]"
                        >
                          <td className="px-4 py-3 text-white">
                            {p.nombre || `Producto #${p.id}`}
                          </td>
                          <td className="px-4 py-3 text-center text-white/50">
                            {p.unitAbbreviation || p.unidadMedida || "—"}
                          </td>
                          <td className="px-4 py-3 text-right text-[var(--accent)] font-semibold tabular-nums">
                            {Number.isFinite(Number(p.stockActual)) ? stockEntero(p) : "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => toggleProducto(p)}
                              disabled={disabled}
                              className="p-1 text-white/40 hover:text-red-400 transition-colors disabled:opacity-50"
                              title="Quitar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="flex-1 rounded-none border border-dashed border-white/10 px-4 py-6 text-center text-sm text-white/40">
                Todavía no agregaste productos a esta lista.
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="flex items-center justify-between gap-3 pt-1 shrink-0">
        <span className="text-sm text-white/40">
          {seleccion.length > 0
            ? `${seleccion.length} producto${seleccion.length !== 1 ? "s" : ""}`
            : "Ningún producto seleccionado"}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={disabled || seleccion.length === 0}
            onClick={limpiar}
            className="rounded-none border border-white/10 bg-[#0c0c0e] px-4 py-2.5 text-sm font-medium text-[#b0b0c0] hover:bg-[#1a1a22] hover:text-white disabled:opacity-40 transition-colors"
          >
            Limpiar
          </button>
          <button
            type="button"
            onClick={generar}
            disabled={disabled || seleccion.length === 0}
            className="inline-flex items-center gap-2 rounded-none bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-black text-sm font-semibold px-6 py-2.5 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <Check className="w-4 h-4" aria-hidden />
            Generar
          </button>
        </div>
      </div>
    </div>
  );
}