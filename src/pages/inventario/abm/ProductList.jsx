// Íconos de lucide-react 
import {
  Search,  // de lupa → estado vacío (sin resultados)
  Tag,     // de etiqueta → input "buscar por nombre"
  Hash,    // "#" → input "buscar por código"
  Pencil,  // de lápiz → botón editar en la tarjeta
  Trash2,  // de tacho → botón eliminar en la tarjeta
} from "lucide-react";

// CONSTANTES DE ESTILOS 

const fieldClass =
  "flex items-center gap-2 rounded-[25px] py-2.5 px-4 bg-[#171717] shadow-[inset_2px_5px_10px_rgb(5,5,5)]";
const inputClass =
  "flex-1 bg-transparent border-none outline-none w-full text-[#d3d3d3] placeholder-[#8b949e] focus:ring-0";
const iconClass = "w-5 h-5 flex-shrink-0 text-white";

/*
  ProductList es el componente principal "presentacional": muestra la lista de productos 
  y los filtros de búsqueda.
*/
export default function ProductList({
  products, // array completo de productos (ya cargados del backend)
  onEdit, // función a llamar cuando el usuario hace clic en "Editar"
  onDelete, // función a llamar cuando el usuario hace clic en "Eliminar"
  filterNombre, // valor actual del input "buscar por nombre"
  setFilterNombre, // función para actualizar filterNombre en el padre
  filterCodigo, // valor actual del input "buscar por código"
  setFilterCodigo, // función para actualizar filterCodigo en el padre
  primaryAction, // (opcional) un elemento JSX que se renderiza como botón principal:"Agregar producto" 
}) {

  /*
    filteredProducts: versión filtrada y ordenada del array `products`.
      .filter() → mantiene solo los productos que coinciden con ambos filtros
      .sort()   → ordena los resultados alfabéticamente por nombre
  */
  const filteredProducts = products
    .filter((p) => {
      // Normaliza los filtros: quita espacios al inicio/fin y pasa a minúsculas
      // || "" protege ante undefined (si la prop no llegó)
      const n = (filterNombre || "").trim().toLowerCase();
      const c = (filterCodigo || "").trim().toLowerCase();

      // Si el filtro está vacío (!n), el producto siempre pasa esa condición.
      // Si hay texto, verifica que el nombre del producto lo incluya.
      const matchNombre =
        !n || (p.nombre && p.nombre.toLowerCase().includes(n));

      // Combina codigoBarras y codigo en un solo string para buscar en ambos a la vez
      const codigoStr = `${p.codigoBarras || ""} ${p.codigo || ""}`.toLowerCase();
      const matchCodigo = !c || codigoStr.includes(c);

      // Solo pasa el filtro si cumple AMBAS condiciones (nombre Y código)
      return matchNombre && matchCodigo;
    })
    /*
      .sort() con localeCompare: ordena strings considerando el idioma local
      (respeta tildes, ñ, etc. ).
      El || 0 evita errores si algún nombre es null/undefined.
    */
    .sort((a, b) => a.nombre?.localeCompare(b.nombre) || 0);

  // Totales para mostrar en el encabezado
  const total = filteredProducts.length;   // Cuántos quedan después del filtro
  const totalCargados = products.length;   // Cuántos hay en total (sin filtrar)

  /*
        FUNCIÓN AUXILIAR: formatPrecio 
    Formatea el precio de un producto para mostrarlo en la tarjeta.

    Usa el operador ?? (nullish coalescing) dos veces:
      - Primero intenta precioVenta (producto por unidad)
      - Si es null/undefined, intenta precioVentaKg (producto pesable)
      - Si ambos son null/undefined, usa ""

    toLocaleString("es-PY") formatea el número
  */
  const formatPrecio = (p) => {
    const valor = p.precioVenta ?? p.precioVentaKg ?? "";
    return `Gs ${Number(valor || 0).toLocaleString("es-PY")}`;
  };

  /*
      COMPONENTE INTERNO: ProductCard
    ProductCard es un componente definido DENTRO de ProductList.
    Representa la tarjeta visual de un producto en la grilla.
  */
  const ProductCard = ({ producto }) => {
    /*
      Inicial del nombre para mostrar en el placeholder de imagen.
      producto.nombre?.[0] → accede al primer carácter con optional chaining (?.)
      Si nombre es undefined/null, devuelve undefined → el || "?" lo convierte en "?"
      .toUpperCase() → siempre en mayúscula
    */
    const inicial = (producto.nombre?.[0] || "?").toUpperCase();

    return (
      /*
        "group" en el div raíz activa el sistema de group-hover de Tailwind.
        hover:scale-[1.03] → la tarjeta crece levemente al hacer hover (efecto lift).
        overflow-hidden → recorta el overlay para que no se salga de los bordes redondeados.
      */
      <div className="group relative bg-[#252525] rounded-[25px] overflow-hidden shadow-[inset_2px_5px_10px_rgb(5,5,5)] transition-all duration-300 hover:scale-[1.03] hover:shadow-lg">

        {/* Área de imagen: cuadrado (aspect-square) con la inicial del producto */}
        <div className="aspect-square bg-[#171717] flex items-center justify-center overflow-hidden">
          <span className="text-5xl font-bold text-[#22c55e]/60">{inicial}</span>
        </div>

        {/* Información del producto */}
        <div className="p-4">
          {/*
            title={producto.nombre} → tooltip nativo del navegador al hacer hover
            sobre el nombre. Útil cuando el texto está truncado (truncate).
          */}
          <h3
            className="font-semibold text-[#d3d3d3] truncate"
            title={producto.nombre}
          >
            {producto.nombre}
          </h3>

          <div className="mt-2 space-y-1 text-sm">
            <p className="text-[#8b949e]">
              Código:{" "}
              <span className="text-[#d3d3d3] font-mono text-xs">
                {/* Si no hay código de barras, muestra un guión largo "—" */}
                {producto.codigoBarras || "—"}
              </span>
            </p>
            <p className="text-[#8b949e]">
              Precio:{" "}
              <span className="text-[#d3d3d3] font-medium">
                {formatPrecio(producto)}
              </span>
            </p>
            {/*
              Renderizado condicional con ternario:
              Si hay observaciones → muestra el párrafo
              Si no hay → null (React no renderiza nada)
              line-clamp-2 → corta el texto a 2 líneas máximo
            */}
            {producto.observaciones ? (
              <p className="text-[#8b949e] line-clamp-2 text-xs">
                {producto.observaciones}
              </p>
            ) : null}
          </div>
        </div>

        <div className="absolute inset-0 bg-black/85 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
          <div className="flex gap-2 justify-end">

            {/* Botón Editar: llama a onEdit pasando el objeto producto completo */}
            <button
              type="button"
              onClick={() => onEdit(producto)}  // Pasa el producto entero al padre
              className="p-2 rounded-md bg-[#252525] text-white hover:bg-black border border-[var(--border)] transition-all duration-300"
              title="Editar precio"
            >
              <Pencil className="w-4 h-4" />
            </button>

            {/* Botón Eliminar: llama a onDelete pasando solo el ID */}
            <button
              type="button"
              onClick={() => onDelete(producto.id)}  // Solo necesita el ID para el DELETE
              className="p-2 rounded-md bg-[#252525] text-white hover:bg-red-600 border border-[var(--border)] transition-all duration-300"
              title="Eliminar"
            >
              <Trash2 className="w-4 h-4" />
            </button>

          </div>
        </div>
      </div>
    );
  };

  return (
    /*
      Contenedor principal: flex columna con altura mínima.
      min-h-[60vh] → ocupa al menos el 60% de la altura de la ventana,
      así el componente no "colapsa" cuando la lista está vacía.
    */
    <div className="bg-[#171717] rounded-[25px] flex flex-col min-h-[60vh] transition-all duration-100 ease-in-out border border-[#30363d]/40">

      {/* ── ENCABEZADO: título, contador y botón primario  */}
      <div className="p-4 sm:p-6 border-b border-[var(--border)]/50 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white tracking-tight">
              Lista de productos
            </h2>
            {/*
              Contador dinámico:
            */}
            <p className="text-xs text-[#8b949e] mt-0.5">
              {totalCargados} cargados
              {total !== totalCargados ? ` · ${total} con filtros` : ""}
            </p>
          </div>

          {/*
            primaryAction: si el padre pasó un elemento JSX como prop,
            se renderiza aquí:"Agregar producto"
            Si no se pasó, el ternario devuelve null y no se renderiza nada.
          */}
          {primaryAction ? (
            <div className="flex justify-end sm:justify-start shrink-0">{primaryAction}</div>
          ) : null}
        </div>

        {/*
                FILTROS DE BÚSQUEDA
          Los inputs de filtro son "controlados":
          su value viene del estado del padre (filterNombre, filterCodigo)
          y onChange llama al setter del padre (setFilterNombre, setFilterCodigo).
          Cada tecla que el usuario presiona actualiza el estado → React re-renderiza
          → filteredProducts se recalcula → la grilla se actualiza en tiempo real.
        */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className={fieldClass}>
            <Tag className={iconClass} />
            <input
              type="text"
              value={filterNombre}
              onChange={(e) => setFilterNombre(e.target.value)}
              placeholder="Buscar por nombre..."
              className={`${inputClass} text-sm`}
              aria-label="Buscar por nombre"  // Accesibilidad
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

      {/* ── ÁREA DE CONTENIDO: grilla de tarjetas o estado vacío ─────── */}
      {/*
        overflow-auto → habilita scroll si las tarjetas superan la altura disponible
        min-h-0 → necesario en flex para que overflow-auto funcione correctamente
      */}
      <div className="flex-1 overflow-auto min-h-0 p-4 sm:p-6">

        {/*
          Renderizado condicional:
          - Si no hay resultados → muestra el estado vacío (ícono + mensaje)
          - Si hay resultados    → muestra la grilla de tarjetas
        */}
        {filteredProducts.length === 0 ? (

          // Estado vacío: centrado vertical y horizontalmente
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            {/* aria-hidden → el ícono ess decorativo*/}
            <Search className="w-10 h-10 text-[#30363d] mb-3" aria-hidden />
            <p className="text-[#8b949e] text-sm">
              No hay productos que coincidan con nombre y código.
            </p>
          </div>

        ) : (

          /*
            Grilla responsiva de tarjetas:
              2 columnas  en mobile
              3 columnas  en sm  (≥640px)
              4 columnas  en md  (≥768px)
              5 columnas  en lg  (≥1024px)
              6 columnas  en xl  (≥1280px)
          */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {/*
              .map() recorre filteredProducts y genera una ProductCard por cada uno.
              key={producto.id} → obligatorio en listas React: permite al algoritmo
              de reconciliación identificar qué tarjeta actualizar/agregar/quitar
              sin tener que re-renderizar toda la grilla.
            */}
            {filteredProducts.map((producto) => (
              <ProductCard key={producto.id} producto={producto} />
            ))}
          </div>

        )}
      </div>
    </div>
  );
}
