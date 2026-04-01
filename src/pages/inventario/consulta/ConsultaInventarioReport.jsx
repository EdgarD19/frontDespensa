// ClipboardList → ícono del encabezado del reporte
// Loader2       → ícono de spinner animado (animate-spin) mientras carga
import { ClipboardList, Loader2 } from "lucide-react";

// Función utilitaria que determina el estado de stock de un producto.
// Devuelve: "normal" | "bajo" | "sin"
import { getEstadoStock } from "../utils";

// FUNCIÓN AUXILIAR: hashHue

/*
  Convierte un string (nombre de categoría o producto) en un número de tono
  de color (hue) entre 0 y 359, para usarlo en hsl() y generar colores únicos
  pero consistentes para cada categoría.

*/
function hashHue(str) {
  let h = 0;
  for (let i = 0; i < (str || "").length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h) % 360; // Siempre retorna un número entre 0 y 359
}

// COMPONENTE AUXILIAR: ProductThumb

/*
  Muestra un avatar circular con la inicial del producto y un gradiente de color
  generado por hashHue a partir de la categoría (o el nombre si no hay categoría).

  Se usa cuando el producto no tiene foto (p.foto es null/undefined).
*/
function ProductThumb({ nombre, categoria }) {
  const inicial = (nombre?.[0] || "?").toUpperCase(); // Primera letra del nombre, en mayúscula
  const hue = hashHue(categoria || nombre);            // Tono basado en la categoría (o nombre)

  return (
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-inner shrink-0"
      style={{
        // Gradiente diagonal generado dinámicamente con el tono calculado
        background: `linear-gradient(135deg, hsl(${hue}, 55%, 38%) 0%, hsl(${(hue + 40) % 360}, 50%, 28%) 100%)`,
      }}
    >
      {inicial}
    </div>
  );
}

/*
      FUNCIÓN AUXILIAR: formatPrecioValor
  Devuelve el precio formateado de un producto según:
    - tipo: "compra" o "venta"
    - si el producto es pesable (productoPesable === "si") → usa precio por kg
    - si no es pesable → usa precio por unidad

  Retorna un objeto con:
    text      → string listo para mostrar, ej: "15.000/kg" o "3.500"
    isPesable → booleano, útil si el componente que llama necesita saberlo

  El sufijo "/kg" se agrega solo si el producto es pesable, para dejar claro
  que el precio es por kilogramo y no por unidad.
*/
function formatPrecioValor(p, tipo) {
  const isPesable = p.productoPesable === "si";

  // Ternario anidado: primero elige compra/venta, luego elige kg/unidad
  const valor =
    tipo === "compra"
      ? isPesable ? p.precioCompraKg : p.precioCompra
      : isPesable ? p.precioVentaKg  : p.precioVenta;

  const sufijo = isPesable ? "/kg" : ""; // Solo agrega "/kg" si es pesable
  const n = Number(valor || 0);

  return {
    text: `${n.toLocaleString("es-PY")}${sufijo}`, // "15.000/kg" o "3.500"
    isPesable,
  };
}

/*
        COMPONENTE AUXILIAR: EstadoPill
  Muestra un "badge" (píldora de color) que indica el estado de stock.
  El color y el texto cambian según el estado:
    "sin"    → rojo     → "Sin stock"
    "bajo"   → naranja  → "5 kg (Bajo)"  (muestra el stock actual y la unidad)
    "normal" → verde    → "42 kg"        (muestra el stock actual y la unidad)
*/
function EstadoPill({ estado, stock, unidadMedida }) {
  const base =
    "inline-flex items-center justify-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap";

  if (estado === "sin") {
    // Rojo translúcido → texto rojo claro
    return (
      <span className={`${base} bg-[#ef4444]/20 text-[#f87171]`}>
        Sin stock
      </span>
    );
  }

  if (estado === "bajo") {
    // Naranja translúcido → texto naranja claro + stock actual y unidad
    return (
      <span className={`${base} bg-[#f97316]/20 text-[#fb923c]`}>
        {stock}
        {unidadMedida ? ` ${unidadMedida}` : ""} (Bajo)
      </span>
    );
  }

  // Estado normal: verde translúcido → texto verde claro + stock actual y unidad
  return (
    <span className={`${base} bg-[#22c55e]/20 text-[#4ade80]`}>
      {stock}
      {unidadMedida ? ` ${unidadMedida}` : ""}
    </span>
  );
}

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
            min-w-[1000px]  → la tabla nunca se achica de 1000px;
                              en lugar de colapsar columnas, el usuario scrollea.
            border-collapse → fusiona los bordes de celdas adyacentes (sin gap entre ellos).
          */
          <div className="overflow-x-auto rounded-[20px] border border-[#30363d]/80 bg-[#0d0d0d]/50">
            <table className="w-full min-w-[1000px] text-sm border-collapse">

              {/* ── ENCABEZADO DE COLUMNAS ─────────────────────────── */}
              <thead>
                <tr className="bg-[#252525] text-left">
                  {/* Cada <th> define una columna. Los últimos usan text-right/center para alinear números */}
                  <th className="px-4 py-3 font-semibold text-[#8b949e] border-b border-[#30363d]">Producto</th>
                  <th className="px-4 py-3 font-semibold text-[#8b949e] border-b border-[#30363d]">Categoría</th>
                  <th className="px-4 py-3 font-semibold text-[#8b949e] border-b border-[#30363d]">Marca</th>
                  <th className="px-4 py-3 font-semibold text-[#8b949e] border-b border-[#30363d]">Código</th>
                  <th className="px-4 py-3 font-semibold text-[#8b949e] border-b border-[#30363d]">Unidad</th>
                  <th className="px-4 py-3 font-semibold text-[#8b949e] border-b border-[#30363d] text-right">Compra</th>
                  <th className="px-4 py-3 font-semibold text-[#8b949e] border-b border-[#30363d] text-right">Venta</th>
                  <th className="px-4 py-3 font-semibold text-[#8b949e] border-b border-[#30363d] text-center">Stock (act. / mín.)</th>
                  <th className="px-4 py-3 font-semibold text-[#8b949e] border-b border-[#30363d] text-center">Estado</th>
                  <th className="px-4 py-3 font-semibold text-[#8b949e] border-b border-[#30363d] whitespace-nowrap">Últ. actualización</th>
                </tr>
              </thead>

              {/* ── CUERPO DE LA TABLA ─────────────────────────────── */}
              <tbody>
                {/*
                  .map() genera un <tr> (fila) por cada producto.
                  key={p.id} → obligatorio para el algoritmo de reconciliación de React.

                  Las variables locales (estado, stock, compra, venta, codigoLine)
                  se calculan dentro del map para que cada fila tenga sus propios valores.
                */}
                {productos.map((p) => {
                  const estado  = getEstadoStock(p); // "normal" | "bajo" | "sin"
                  const stock   = Number(p.stockActual ?? p.stock ?? 0);
                  const minimo  = Number(p.stockMinimo ?? 0);
                  const compra  = formatPrecioValor(p, "compra"); // { text, isPesable }
                  const venta   = formatPrecioValor(p, "venta");

                  // Línea de código: une codigoBarras/codigo y unidad con " • " si ambos existen
                  // .filter(Boolean) elimina los vacíos antes de hacer join
                  const codigoLine = [p.codigoBarras || p.codigo, p.unidadMedida]
                    .filter(Boolean)
                    .join(" • ");

                  return (
                    <tr
                      key={p.id}
                      // hover:bg → resalta la fila al pasar el mouse, transition suaviza el cambio
                      className="border-b border-[#30363d]/60 hover:bg-[#252525]/40 transition-colors"
                    >

                      {/* ── CELDA: Producto (avatar + nombre + código) ── */}
                      <td className="px-4 py-3 align-middle">
                        <div className="flex items-center gap-3 min-w-0">
                          {/*
                            Si el producto tiene foto → muestra la imagen real.
                            Si no → muestra el avatar generado con ProductThumb.
                            Renderizado condicional con ternario: condición ? A : B
                          */}
                          {p.foto ? (
                            <img
                              src={p.foto}
                              alt=""
                              className="w-10 h-10 rounded-xl object-cover shrink-0 shadow-inner"
                            />
                          ) : (
                            <ProductThumb nombre={p.nombre} categoria={p.categoria} />
                          )}
                          <div className="min-w-0">
                            {/* title={p.nombre} → tooltip nativo al pasar el mouse (útil con truncate) */}
                            <p className="font-semibold text-[#f0f6fc] truncate" title={p.nombre}>
                              {p.nombre}
                            </p>
                            <p className="text-xs text-[#8b949e] truncate" title={codigoLine}>
                              {codigoLine || "—"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/*  CELDA: Categoría (badge verde si existe, "—" si no)  */}
                      <td className="px-4 py-3 align-middle">
                        {p.categoria ? (
                          // Badge verde translúcido para la categoría
                          <span className="inline-block rounded-full bg-[#22c55e]/15 text-[#4ade80] px-2.5 py-0.5 text-xs font-medium">
                            {p.categoria}
                          </span>
                        ) : (
                          <span className="text-[#8b949e]">—</span>
                        )}
                      </td>

                      {/*  CELDA: Marca */}
                      {/* || "—" → si marca es null/undefined/"", muestra guión */}
                      <td className="px-4 py-3 text-[#d3d3d3] align-middle">{p.marca || "—"}</td>

                      {/* CELDA: Código */}
                      {/* font-mono → fuente monoespaciada, ideal para códigos */}
                      <td className="px-4 py-3 text-[#8b949e] font-mono text-xs align-middle">
                        {p.codigoBarras || p.codigo || "—"}
                      </td>

                      {/* CELDA: Unidad de medida */}
                      <td className="px-4 py-3 text-[#d3d3d3] align-middle">{p.unidadMedida || "—"}</td>

                      {/*  CELDA: Precio de compra (tachado, secundario) */}
                      {/*
                        El precio de compra se muestra tachado (line-through)
                        para indicar visualmente que es un dato interno/referencial,
                        mientras el precio de venta se destaca en verde.
                      */}
                      <td className="px-4 py-3 text-right align-middle">
                        <span className="text-[#8b949e] line-through decoration-[#6b7280]">
                          ₲{compra.text}
                        </span>
                      </td>

                      {/*  CELDA: Precio de venta (verde, destacado) */}
                      <td className="px-4 py-3 text-right align-middle">
                        <span className="font-bold text-[var(--accent-green)]">
                          ₲{venta.text}
                        </span>
                      </td>

                      {/* CELDA: Stock actual / mínimo  */}
                      {/*
                        tabular-nums → hace que los dígitos tengan ancho fijo,
                        alineando los números en columna aunque varíen de cifras.
                        minimo || "—" → si stockMinimo es 0/null muestra "—"
                      */}
                      <td className="px-4 py-3 text-center text-[#d3d3d3] tabular-nums align-middle">
                        {stock} / {minimo || "—"}
                      </td>

                      {/*  CELDA: Badge de estado de stock*/}
                      <td className="px-4 py-3 text-center align-middle">
                        <EstadoPill
                          estado={estado}
                          stock={stock}
                          unidadMedida={p.unidadMedida}
                        />
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
