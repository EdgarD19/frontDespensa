// ClipboardList → ícono del encabezado del reporte
// Loader2       → ícono de spinner animado (animate-spin) mientras carga
import { ClipboardList, Loader2 } from "lucide-react";

// COMPONENTE PRINCIPAL: ConsultaInventarioReport

/*
  Muestra la tabla detallada del inventario con tres estados posibles:
    1. Cargando  → spinner centrado
    2. Sin datos → mensaje vacío
    3. Con datos → tabla con una fila por producto

  Props:
    productos → array de productos ya filtrados (viene de ConsultaInventario)
    loading   → booleano: true mientras el padre está esperando la respuesta del backend
*/
export default function ConsultaInventarioReport({ productos, loading }) {
  // ?? 0 → si productos es undefined/null, usa 0 en lugar de romper
  const count = productos?.length ?? 0;

  return (
    // Tarjeta contenedora. overflow-hidden recorta la tabla dentro de los bordes redondeados.
    <div className="bg-[#171717] rounded-[25px] overflow-hidden shadow-[inset_2px_5px_10px_rgb(5,5,5)]">

      {/* Encabezado con contador dinámico */}
      <div className="flex items-center gap-2 px-6 pt-6 pb-4 border-b border-[#30363d]">
        <ClipboardList className="w-5 h-5 text-[var(--accent-cyan)] flex-shrink-0" />
        <h3 className="text-[#f0f6fc] font-semibold text-base">
          {/*
            Mientras carga muestra "…" en lugar del número.
            Cuando termina muestra la cantidad real de productos filtrados.
          */}
          Inventario detallado — {loading ? "…" : count} productos
        </h3>
      </div>

      <div className="p-4 sm:p-6 pt-2">

        {/*
          Renderizado condicional con tres ramas (ternario anidado):
            loading          → Spinner
            !loading y count === 0  → Mensaje vacío
            !loading y count > 0    → Tabla
        */}
        {loading ? (

          // ── ESTADO: CARGANDO ─────────────────────────────────────────
          // animate-spin → clase que aplica una rotación CSS infinita
          <div className="flex flex-col items-center justify-center py-20 text-[#8b949e] gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-cyan)]" />
            <span className="text-sm">Cargando inventario…</span>
          </div>

        ) : count === 0 ? (

          // ── ESTADO: SIN RESULTADOS 
          <p className="text-[#8b949e] text-center py-16 text-sm">
            No hay productos que coincidan con los filtros o el catálogo está vacío.
          </p>

        ) : (

          // ── ESTADO: TABLA CON DATOS
          /*
            overflow-x-auto → habilita scroll horizontal en mobile.
            min-w-[640px]  → ancho mínimo de la tabla;
                              en lugar de colapsar columnas, el usuario scrollea.
            border-collapse → fusiona los bordes de celdas adyacentes (sin gap entre ellos).
          */
          <div className="overflow-x-auto rounded-[20px] border border-[#30363d]/80 bg-[#0d0d0d]/50">
            <table className="w-full min-w-[640px] text-sm border-collapse">

              {/* ── ENCABEZADO DE COLUMNAS ─────────────────────────── */}
              <thead>
                <tr className="bg-[#252525] text-left">
                  <th className="px-4 py-3 font-semibold text-[#8b949e] border-b border-[#30363d]">Código</th>
                  <th className="px-4 py-3 font-semibold text-[#8b949e] border-b border-[#30363d]">Producto</th>
                  <th className="px-4 py-3 font-semibold text-[#8b949e] border-b border-[#30363d]">Categoría</th>
                  <th className="px-4 py-3 font-semibold text-[#8b949e] border-b border-[#30363d]">Marca</th>
                  <th className="px-4 py-3 font-semibold text-[#8b949e] border-b border-[#30363d]">Unidad</th>
                  <th className="px-4 py-3 font-semibold text-[#8b949e] border-b border-[#30363d] text-center">
                    Stock actual
                  </th>
                </tr>
              </thead>

              {/* ── CUERPO DE LA TABLA ─────────────────────────────── */}
              <tbody>
                {/*
                  .map() genera un <tr> (fila) por cada producto.
                  key={p.id} → obligatorio para el algoritmo de reconciliación de React.

                  Variables locales (stock) por fila.
                */}
                {productos.map((p) => {
                  const rawStock = p.stockActual ?? p.stock;
                  const stockUnknown =
                    rawStock === "" || rawStock === undefined || rawStock === null;
                  const stock = Number(rawStock ?? 0);
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

                      <td className="px-4 py-3 align-middle">
                        {p.categoria ? (
                          <span className="inline-block rounded-full bg-[#22c55e]/15 text-[#4ade80] px-2.5 py-0.5 text-xs font-medium">
                            {p.categoria}
                          </span>
                        ) : (
                          <span className="text-[#8b949e]">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-[#d3d3d3] align-middle">{p.marca || "—"}</td>

                      <td className="px-4 py-3 text-[#d3d3d3] align-middle">{p.unidadMedida || "—"}</td>

                      <td className="px-4 py-3 text-center text-[#d3d3d3] tabular-nums align-middle">
                        {stockText}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
