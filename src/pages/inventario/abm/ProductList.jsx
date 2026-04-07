import { useState, useEffect } from "react";
// Íconos de lucide-react
import {
  Search,
  Tag,
  Hash,
  Pencil,
  Trash2,
} from "lucide-react";

// Estilo del contenedor de cada campo de búsqueda (el "cajón" con ícono + input).
const fieldClass =
  "flex items-center gap-2 rounded-[25px] py-2.5 px-4 bg-[#171717] shadow-[inset_2px_5px_10px_rgb(5,5,5)]";

// Estilo del <input> de texto dentro del campo: fondo transparente, sin borde visible.
const inputClass =
  "flex-1 bg-transparent border-none outline-none w-full text-[#d3d3d3] placeholder-[#8b949e] focus:ring-0";

// Estilo común para todos los íconos del encabezado (tamaño fijo, color blanco).
const iconClass = "w-5 h-5 flex-shrink-0 text-white";


function formatPrecioValor(p, tipo) {
  const isPesable = p.productoPesable === "si";
  const valor =
    tipo === "compra"
      ? isPesable
        ? p.precioCompraKg
        : p.precioCompra
      : isPesable
        ? p.precioVentaKg
        : p.precioVenta;
  const sufijo = isPesable ? "/kg" : "";
  const n = Number(valor || 0);
  return {
    text: `${n.toLocaleString("es-PY")}${sufijo}`,
    isPesable,
  };
}

/*
  
  · products        → array con todos los productos cargados desde el backend
  · onEdit          → función que se llama cuando el usuario hace clic en "Editar"
  · onDelete        → función que se llama cuando el usuario hace clic en "Eliminar"
  · filterNombre    → valor actual del filtro por nombre (string controlado desde el padre)
  · setFilterNombre → función para actualizar filterNombre (viene del useState del padre)
  · filterCodigo    → valor actual del filtro por código
  · setFilterCodigo → función para actualizar filterCodigo
  · primaryAction   → (opcional) un elemento JSX que se renderiza como botón principal
                      en el encabezado (ej: el botón "Agregar producto")
*/
export default function ProductList({
  products,
  onEdit,
  onDelete,
  filterNombre,
  setFilterNombre,
  filterCodigo,
  setFilterCodigo,
  primaryAction,
}) {
 /*
        FILTRADO Y ORDENAMIENTO DE PRODUCTOS
 * .filter() recorre el array `products` y conserva solo los elementos
 * que cumplan con las condiciones de búsqueda por nombre y/o código.
 * .sort() ordena el resultado alfabéticamente por nombre.
 */
const filteredProducts = products
.filter((p) => {
  // Normalizamos los filtros: si son null/undefined usamos "", luego
  // quitamos espacios al inicio/fin y convertimos a minúsculas.
  // Esto hace la búsqueda insensible a mayúsculas y espacios accidentales.
  const n = (filterNombre || "").trim().toLowerCase();
  const c = (filterCodigo || "").trim().toLowerCase();

  // Si `n` está vacío (el usuario no escribió nada), matchNombre = true
  // y el filtro "pasa" todos los productos por nombre.
  // Si escribió algo, verifica que p.nombre contenga ese texto.
  const matchNombre = !n || (p.nombre && p.nombre.toLowerCase().includes(n));

  // Convertimos codigoBarras a string por si viene como número (ej: 123 → "123").
  // Luego aplicamos la misma lógica: si no hay filtro, pasa todo.
  const codigoStr = String(p.codigoBarras || "").toLowerCase();
  const matchCodigo = !c || codigoStr.includes(c);

  // El producto solo queda si cumple AMBAS condiciones a la vez.
  return matchNombre && matchCodigo;
})
// .sort() compara pares de productos (a, b).
// localeCompare devuelve negativo, 0 o positivo → el array queda A-Z.
// El `|| 0` es un fallback por si `a.nombre` es undefined.
.sort((a, b) => a.nombre?.localeCompare(b.nombre) || 0);

// Cantidad de productos DESPUÉS de aplicar los filtros activos.
const total = filteredProducts.length;

// Cantidad TOTAL de productos cargados desde el backend, sin filtrar.
// Útil para mostrar algo como "Mostrando 3 de 20 productos".
const totalCargados = products.length;

/*
* ESTADO: producto seleccionado para ver su detalle
*
* `detailProduct` guarda el objeto del producto que el usuario clickeó.
* null  → no hay modal/panel abierto.
* {...} → hay un producto seleccionado y su detalle está visible.
*/
const [detailProduct, setDetailProduct] = useState(null);

 //EFECTO: comportamiento del modal de detalle
useEffect(() => {
// Si no hay producto seleccionado, no hay nada que configurar.
if (!detailProduct) return;

// Creamos el handler fuera del listener para poder removerlo después.
// Si usáramos una función anónima en ambos lugares, addEventListener y
// removeEventListener no reconocerían que es "la misma función".
const onKey = (e) => {
  if (e.key === "Escape") setDetailProduct(null); // cierra el modal
};

window.addEventListener("keydown", onKey);

// Guardamos el valor ACTUAL de overflow antes de tocarlo,
// para poder restaurarlo exactamente como estaba al cerrar.
const prevOverflow = document.body.style.overflow;

// "hidden" oculta la scrollbar y bloquea el scroll del fondo
// mientras el modal está encima.
document.body.style.overflow = "hidden";

return () => {
  window.removeEventListener("keydown", onKey); // evita memory leaks
  document.body.style.overflow = prevOverflow;  // restaura el scroll
};
}, [detailProduct]); // ← dependencia: el efecto se re-ejecuta solo cuando este valor cambia

  return (
    <div className="bg-[#171717] rounded-[25px] flex flex-col min-h-[60vh] transition-all duration-100 ease-in-out border border-[#30363d]/40">
      <div className="p-4 sm:p-6 border-b border-[var(--border)]/50 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white tracking-tight">Lista de productos</h2>
            <p className="text-xs text-[#8b949e] mt-0.5">
              {totalCargados} cargados
              {total !== totalCargados ? ` · ${total} con filtros` : ""}
            </p>
          </div>
          {primaryAction ? (
            <div className="flex justify-end sm:justify-start shrink-0">{primaryAction}</div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className={fieldClass}>
            <Tag className={iconClass} />
            <input
              type="text"
              value={filterNombre}
              onChange={(e) => setFilterNombre(e.target.value)}
              placeholder="Buscar por nombre..."
              className={`${inputClass} text-sm`}
              aria-label="Buscar por nombre"
            />
          </div>
          <div className={fieldClass}>
            <Hash className={iconClass} />
            <input
              type="text"
              value={filterCodigo}
              onChange={(e) => setFilterCodigo(e.target.value)}
              placeholder="Buscar por código..."
              className={`${inputClass} text-sm`}
              aria-label="Buscar por código"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto min-h-0 p-4 sm:p-6">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <Search className="w-10 h-10 text-[#30363d] mb-3" aria-hidden />
            <p className="text-[#8b949e] text-sm">
              No hay productos que coincidan con nombre y código.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[20px] border border-[#30363d]/80 bg-[#0d0d0d]/50">
            <table className="w-full min-w-[720px] text-sm border-collapse">
              <thead>
                <tr className="bg-[#252525] text-left">
                  <th className="px-4 py-3 font-semibold text-[#8b949e] border-b border-[#30363d]">Código</th>
                  <th className="px-4 py-3 font-semibold text-[#8b949e] border-b border-[#30363d]">Producto</th>
                  <th className="px-4 py-3 font-semibold text-[#8b949e] border-b border-[#30363d] text-right">
                    Compra
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#8b949e] border-b border-[#30363d] text-right">
                    Venta
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#8b949e] border-b border-[#30363d] text-center">
                    Stock actual
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#8b949e] border-b border-[#30363d] text-center whitespace-nowrap">
                    Detalle
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#8b949e] border-b border-[#30363d] text-center">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => {
                  const rawStock = p.stockActual ?? p.stock;
                  const stockUnknown =
                    rawStock === "" || rawStock === undefined || rawStock === null;
                  const stock = Number(rawStock ?? 0);
                  const compra = formatPrecioValor(p, "compra");
                  const venta = formatPrecioValor(p, "venta");
                  const stockText =
                    stockUnknown || !Number.isFinite(stock)
                      ? "—"
                      : `${stock}${p.unidadMedida ? ` ${p.unidadMedida}` : ""}`;

                  return (
                    <tr
                      key={p.id}
                      className="border-b border-[#30363d]/60 hover:bg-[#252525]/40 transition-colors"
                    >
                      <td className="px-4 py-3 text-[#8b949e] font-mono text-xs align-middle">
                        {p.codigoBarras || "—"}
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <p className="font-semibold text-[#f0f6fc] truncate max-w-[14rem] sm:max-w-xs" title={p.nombre}>
                          {p.nombre}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right align-middle">
                        <span className="text-[#8b949e] line-through decoration-[#6b7280]">
                          ₲{compra.text}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right align-middle">
                        <span className="font-bold text-[var(--accent-green)]">₲{venta.text}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-[#d3d3d3] tabular-nums align-middle">
                        {stockText}
                      </td>
                      <td className="px-4 py-3 text-center align-middle">
                        <button
                          type="button"
                          onClick={() => setDetailProduct(p)}
                          className="text-xs font-medium text-[var(--accent-cyan)] hover:text-[#67e8f9] hover:underline underline-offset-2 transition-colors"
                        >
                          Más detalles
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center align-middle">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => onEdit(p)}
                            className="p-2 rounded-md bg-[#252525] text-white hover:bg-black border border-[var(--border)] transition-all duration-300"
                            title="Editar precio"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(p.id)}
                            className="p-2 rounded-md bg-[#252525] text-white hover:bg-red-600 border border-[var(--border)] transition-all duration-300"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {detailProduct ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]"
          role="presentation"
          onClick={() => setDetailProduct(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="detalles-producto-titulo"
            className="relative w-full max-w-sm rounded-[20px] border border-[#30363d] bg-[#252525] shadow-[inset_2px_5px_10px_rgb(5,5,5)] p-5 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <h4
              id="detalles-producto-titulo"
              className="text-[#f0f6fc] font-semibold text-sm"
            >
              Más detalles
            </h4>
            <p className="text-xs text-[#8b949e] mt-1 mb-4 line-clamp-2" title={detailProduct.nombre}>
              {detailProduct.nombre}
            </p>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-[#8b949e] text-xs font-medium uppercase tracking-wide">Categoría</dt>
                <dd className="text-[#f0f6fc] mt-0.5">
                  {detailProduct.categoria ? (
                    <span className="inline-block rounded-full bg-[#22c55e]/15 text-[#4ade80] px-2.5 py-0.5 text-xs font-medium">
                      {detailProduct.categoria}
                    </span>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-[#8b949e] text-xs font-medium uppercase tracking-wide">Marca</dt>
                <dd className="text-[#d3d3d3] mt-0.5">{detailProduct.marca || "—"}</dd>
              </div>
              <div>
                <dt className="text-[#8b949e] text-xs font-medium uppercase tracking-wide">Unidad</dt>
                <dd className="text-[#d3d3d3] mt-0.5">{detailProduct.unidadMedida || "—"}</dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={() => setDetailProduct(null)}
              className="mt-5 w-full py-2.5 rounded-xl text-sm font-medium bg-[#171717] text-[#f0f6fc] border border-[#30363d] hover:bg-[#30363d]/50 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
