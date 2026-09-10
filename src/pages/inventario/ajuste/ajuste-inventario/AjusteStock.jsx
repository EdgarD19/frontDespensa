import { useState, useEffect, useRef } from "react";
import { Check, Search, PackageOpen, X, Barcode } from "lucide-react";
import { stockEntero } from "./utils";
import { getProductos, getProductoByCodigo } from "../../../../api/productosApi";

export default function AjusteStock({ productos, categorias, disabled, onGenerar }) {
  const [categoria, setCategoria] = useState("");
  const [seleccion, setSeleccion] = useState([]);
  const [search, setSearch] = useState("");
  const [motivo, setMotivo] = useState("");
  const [motivoError, setMotivoError] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [codigoNoEncontrado, setCodigoNoEncontrado] = useState("");
  const [resultados, setResultados] = useState([]);
  const rootRef = useRef(null);

  const idsSeleccion = new Set(seleccion.map((p) => p.id));
  const visibles = resultados.filter((p) => !idsSeleccion.has(p.id));

  useEffect(() => {
    function cerrar(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setShowDropdown(false);
    }
    document.addEventListener("mousedown", cerrar);
    return () => document.removeEventListener("mousedown", cerrar);
  }, []);

  useEffect(() => {
    if (!showDropdown) return;
    let activo = true;
    const qry = search.trim();
    const t = setTimeout(async () => {
      try {
        const res = await getProductos({ search: qry || undefined, pageSize: 20 });
        if (activo) setResultados(res?.content || []);
      } catch {
        if (activo) setResultados([]);
      }
    }, qry.length > 0 ? 300 : 0);
    return () => {
      activo = false;
      clearTimeout(t);
    };
  }, [search, showDropdown]);

  const candidatos = categoria
    ? productos.filter(
        (p) => Number(p.idCategoria) === Number(categoria) && !idsSeleccion.has(p.id)
      )
    : [];

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
      setShowDropdown(false);
      return;
    }
    setCodigoNoEncontrado(c);
    setTimeout(() => setCodigoNoEncontrado(""), 2500);
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
          <div className="relative" ref={rootRef}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a5a6e]" />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  buscarPorCodigo(search);
                }
              }}
              disabled={disabled}
placeholder="Escanear código de barras o buscar por nombre…"
                className="w-full rounded-lg border border-[#2a2a32] bg-[#111114] pl-10 pr-12 py-2.5 text-sm text-[#f1f1f3] placeholder:text-[#4a4a5a] focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/20 outline-none disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => buscarPorCodigo(search)}
              disabled={disabled}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5a5a6e] hover:text-white transition-colors disabled:opacity-50"
              title="Buscar por código de barras"
            >
              <Barcode size={16} />
            </button>
            {codigoNoEncontrado ? (
              <p className="mt-1.5 text-xs text-rose-400">
                No se encontró el código "{codigoNoEncontrado}".
              </p>
            ) : null}
            {showDropdown && (
              <div className="absolute z-30 left-0 right-0 mt-1 rounded-lg border border-[#1e1e24] bg-[#111114] shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                {visibles.length === 0 ? (
                  <p className="p-3 text-sm text-[#5a5a6e]">
                    {resultados.length === 0
                      ? "Sin resultados."
                      : "Todos los resultados ya están en la lista."}
                  </p>
                ) : (
                  <ul className="divide-y divide-[#1e1e24]">
                    {visibles.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onMouseDown={() => toggleProducto(p)}
                          className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-[#1a1a22] transition-colors"
                        >
                          <span className="flex-1 min-w-0 font-medium text-[#f1f1f3] text-sm truncate">
                            {p.nombre}
                          </span>
                          {p.unitAbbreviation || p.unidadMedida ? (
                            <span className="text-xs text-[#5a5a6e] whitespace-nowrap">
                              {p.unitAbbreviation || p.unidadMedida}
                            </span>
                          ) : null}
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
            Motivo
          </span>
          <select
            value={motivo}
            onChange={(e) => {
              setMotivo(e.target.value);
              setMotivoError(false);
            }}
            disabled={disabled}
            className="w-full rounded-lg border border-[#2a2a32] bg-[#111114] px-3 py-2.5 text-sm text-[#f1f1f3] focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/20 outline-none disabled:opacity-50"
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