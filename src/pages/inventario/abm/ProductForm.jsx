// Íconos de lucide-react
// Cada ícono es un componente React que recibe props
import {
  Barcode,      //  de código de barras → campo codigoBarras
  Tag,          //  de etiqueta → campo nombre
  FolderOpen,   //  de carpeta → select categoría
  Ruler,        //  de regla → select unidad de medida
  DollarSign,   //  "$" → campos de precio
  Package,      //  de caja → select proveedor y campo stockActual
  FileText,     //  de documento → textarea descripción
  Eraser,       //  de borrador → botón "Limpiar"
  Plus,         //  "+" → botón "Agregar / Guardar"
} from "lucide-react";

// CONSTANTES DE ESTILOS 

// Contenedor de cada campo: fondo oscuro, bordes redondeados, sombra interior (inset)
const fieldClass =
  "flex items-center gap-2 rounded-[25px] py-2.5 px-4 bg-[#171717] shadow-[inset_2px_5px_10px_rgb(5,5,5)]";

// Input de texto: sin fondo propio, sin borde, texto claro, placeholder gris
const inputClass =
  "flex-1 bg-transparent border-none outline-none w-full text-[#d3d3d3] placeholder-[#8b949e] focus:ring-0";

// Ícono dentro del campo: tamaño fijo, no se encoge si el espacio es poco
const iconClass = "w-5 h-5 flex-shrink-0 text-white";

// Etiqueta (label) encima de cada campo
const labelClass = "block text-sm font-medium text-[#8b949e] mb-1.5";

// Select (desplegable): hereda las mismas reglas visuales que el input
const selectClass = "w-full bg-transparent border-none outline-none text-[#d3d3d3] focus:ring-0 cursor-pointer";

// COMPONENTE AUXILIAR: InputPrecio

/*
  InputPrecio es un componente (presentacional): no tiene estado propio,
  solo recibe props y renderiza un campo de precio con el símbolo "Gs".

  Se define FUERA de ProductForm para que React no lo re-cree en cada render
  del formulario. 

  Props que recibe:
    label    → texto de la etiqueta visible
    name     → atributo name del <input> (necesario para handleChange)
    value    → valor controlado (viene del estado formData del padre)
    onChange → función que actualiza el estado cuando el usuario escribe
    required → si true, agrega el asterisco rojo y marca el campo como requerido
    disabled → si true, el campo queda de solo lectura (modo edición bloqueado)
*/
function InputPrecio({ label, name, value, onChange, required, disabled }) {
  return (
    <div>
      {/* Label: si required es true, muestra un asterisco rojo */}
      <label className={labelClass}>
        {label} {required && <span className="text-[var-(--accent-red)]">*</span>}
      </label>

      {/* Contenedor del campo con ícono, prefijo "Gs" e input numérico */}
      <div className={`${fieldClass} gap-2`}>
        <DollarSign className={iconClass} />
        <span className="text-[#8b949e] text-sm">Gs</span>  {/* Prefijo de moneda */}
        <input
          type="number"
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          min="0"        // No acepta valores menores a 0 en el navegador
          step="0.01"    // Permite decimales de hasta 2 lugares
          className={inputClass}
          placeholder="0"
        />
      </div>
    </div>
  );
}

// COMPONENTE PRINCIPAL: ProductForm

/*
  ProductForm es el formulario de alta/edición de productos.
  
  Props que recibe:
    formData            → objeto con todos los valores actuales del formulario
    setFormData         → función para actualizar formData en el padre
    onSubmit            → función a llamar cuando el usuario confirma el formulario
    onClear             → función a llamar cuando el usuario hace clic en "Limpiar"
    onClose             → (opcional) si se pasa, reemplaza "Limpiar" por "Cancelar"
    isEditing           → booleano: true = modo edición, false = modo alta
    lockNonPriceFields  → booleano: si true, todos los campos menos precio quedan
                          en solo lectura (útil cuando el backend solo permite PATCH precio)
    categorias          → array de objetos {id, nombre} para el select de categorías
    unidades            → array de objetos {id, nombre, abreviatura} para el select de unidades
    proveedores         → array de objetos {id, nombre} para el select de proveedores
    loading             → booleano: deshabilita los selects mientras cargan los maestros
*/
export default function ProductForm({
  formData,
  setFormData,
  onSubmit,
  onClear,
  onClose,                   // Opcional: si viene, botón izquierdo = "Cancelar"
  isEditing,
  lockNonPriceFields = false, // Valor por defecto: false (ningún campo bloqueado)
  categorias = [],            // Valor por defecto: array vacío (evita errores si no llega)
  unidades = [],
  proveedores = [],
  loading = false,
}) {

  /**
      HANDLERS 
   * handleChange
   * Manejador genérico para inputs de texto y checkboxes.
   * Se conecta al evento onChange de cada <input> o <textarea>.
  
   */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      // Si es checkbox usamos `checked` (true/false), si no usamos `value` (string)
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  /** Código de barras: solo dígitos, máximo 13 (rango válido 9–13 al enviar). */
  const handleCodigoBarrasChange = (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 13);
    setFormData((prev) => ({ ...prev, codigoBarras: digits }));
  };

  /**
   * handleNumChange
   * Manejador específico para inputs numéricos (precios, stock).
   * Hace lo mismo que handleChange pero además:
   *   - Si el campo está vacío (""), lo deja como "" (no lo convierte a 0)
   *     para que el input no muestre "0" mientras el usuario está borrando.
   *   - Si el valor es negativo, lo clampea a 0 (Math.max(0, ...))
   *   - Siempre guarda el número como string en el estado (los inputs HTML
   *     trabajan con strings; la conversión a number se hace al enviar al backend)
   */
  const handleNumChange = (e) => {
    const { name, value } = e.target;
    // Si value es "" lo dejamos "", si no parseamos y nos aseguramos que sea >= 0
    const num = value === "" ? "" : Math.max(0, parseFloat(value) || 0);
    setFormData((prev) => ({ ...prev, [name]: num === "" ? "" : String(num) }));
  };

  
  //`ro` (read-only) es un alias corto para lockNonPriceFields.
  const ro = lockNonPriceFields;

  /**
   * handleSubmit
   * Intercepta el submit del <form> antes de llamar al onSubmit del padre.
   * Hace una validación extra: precio de venta no puede ser negativo.
   * Si pasa la validación, delega al handler del padre (Inventario.handleSubmit).
   *
   * e.preventDefault() → siempre necesario en formularios React para evitar
   * que la página se recargue (comportamiento nativo del navegador).
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    if (Number(formData.precioVenta) < 0) return; // Precio negativo → corta aquí
    onSubmit(e); // Llama al handleSubmit de Inventario.jsx
  };

  return (
    // Tarjeta principal del formulario: fondo oscuro, bordes muy redondeados
    <div className="bg-[#171717] rounded-[25px] px-6 sm:px-8 pb-4 pt-2 transition-all duration-100 ease-in-out">

      {/*
        Título del modal: cambia según el modo.
        isEditing → "Editar precio"
        alta nueva → "Nuevo producto"
      */}
      <h2 id="heading" className="text-center my-6 text-white text-xl">
        {isEditing ? "Editar precio" : "Nuevo producto"}
      </h2>

      {/*
        Aviso ámbar: solo se muestra en modo edición (lockNonPriceFields = true).
        Informa al usuario que el backend solo permite cambiar el precio.
        Renderizado condicional: {condición && <JSX />}
      */}
      {lockNonPriceFields && (
        <p className="text-center text-xs text-amber-200/90 px-2 -mt-4 mb-2">
          El backend solo permite <strong>PATCH</strong> del campo{" "}
          <span className="font-mono">precio</span>. El resto es solo lectura.
        </p>
      )}

      {/*
        <form onSubmit={handleSubmit}>
        Al hacer clic en el botón type="submit", el navegador dispara el evento
        "submit" del form, que llama a handleSubmit.
      */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/*
          Grid responsivo de campos:
            - 1 columna en mobile
            - 2 columnas en sm (≥640px)
            - 3 columnas en xl (≥1280px)
          Algunos campos usan col-span para ocupar más de una columna.
        */}
        <div className="grid grid-cols-1 min-w-0 sm:grid-cols-2 xl:grid-cols-3 gap-x-4 gap-y-3">

          {/* ── CAMPO: Código de barras (solo números, 9–13 dígitos) */}
          <div className="min-w-0">
            <label className={labelClass}>
              Código de barras <span className="text-[var(--accent-red)]">*</span>
            </label>
            <div className={fieldClass}>
              <Barcode className={iconClass} />
              <input
                type="text"
                name="codigoBarras"
                inputMode="numeric"
                autoComplete="off"
                value={formData.codigoBarras}
                onChange={handleCodigoBarrasChange}
                required={!ro}
                minLength={!ro ? 9 : undefined}
                maxLength={13}
                disabled={ro}
                pattern={!ro ? "[0-9]{9,13}" : undefined}
                className={inputClass}
                placeholder="9 a 13 dígitos"
              />
            </div>
          </div>

          {/* CAMPO: Nombre (ocupa toda la fila en sm y xl)*/}
          {/*
            sm:col-span-2 xl:col-span-3 → en pantallas medianas ocupa 2 columnas,
            en pantallas grandes ocupa las 3 columnas completas.
          */}
          <div className="min-w-0 sm:col-span-2 xl:col-span-3">
            <label className={labelClass}>
              Nombre <span className="text-[var(--accent-red)]">*</span>
            </label>
            <div className={fieldClass}>
              <Tag className={iconClass} />
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                required 
                disabled={ro}
                className={inputClass}
                placeholder="Nombre del producto"
              />
            </div>
          </div>

          {/* SELECT: Categoría */}
          {/*
            Los <select> usan un onChange inline en lugar de handleChange
            porque actualizan directamente formData.idCategoria.
            Nota: value={formData.idCategoria ?? ""} → el ?? asegura que si
            idCategoria es null o undefined, el select reciba "" (opción vacía).
          */}
          <div className="min-w-0">
            <label className={labelClass}>
              Categoría <span className="text-[var(--accent-red)]">*</span>
            </label>
            <div className={fieldClass}>
              <FolderOpen className={iconClass} />
              <select
                name="idCategoria"
                value={formData.idCategoria ?? ""}
                onChange={(e) =>
                  // Actualiza solo idCategoria en el estado del padre
                  setFormData((prev) => ({ ...prev, idCategoria: e.target.value }))
                }
                required={!ro}
                disabled={loading || ro}  // Bloqueado mientras carga O en modo ro
                className={selectClass}
              >
                <option value="">Seleccionar...</option>
                {/*
                  .map() genera un <option> por cada categoría del array.
                  key={c.id} → obligatorio en listas React para que el diffing
                  sea eficiente (identifica cada elemento de forma única).
                */}
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SELECT: Proveedor */}
          <div className="min-w-0">
            <label className={labelClass}>
              Proveedor <span className="text-[var(--accent-red)]">*</span>
            </label>
            <div className={fieldClass}>
              <Package className={iconClass} />
              <select
                name="idProveedor"
                value={formData.idProveedor ?? ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, idProveedor: e.target.value }))
                }
                required={!ro}
                disabled={loading || ro}
                className={selectClass}
              >
                <option value="">Seleccionar...</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/*
                 SELECT: Unidad de medida
            sm:col-span-2 xl:col-span-1 → en tablets ocupa 2 columnas (fila completa),
            en desktop vuelve a 1 columna porque hay 3 columnas disponibles.
          */}
          <div className="min-w-0 sm:col-span-2 xl:col-span-1">
            <label className={labelClass}>
              Unidad de medida <span className="text-[var(--accent-red)]">*</span>
            </label>
            <div className={fieldClass}>
              <Ruler className={iconClass} />
              <select
                name="idUnidad"
                value={formData.idUnidad ?? ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, idUnidad: e.target.value }))
                }
                required={!ro}
                disabled={loading || ro}
                className={selectClass}
              >
                <option value="">Seleccionar...</option>
                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre}{" "}
                    {/*
                      Si la unidad tiene abreviatura la muestra entre paréntesis.
                      {u.abreviatura ? `(${u.abreviatura})` : ""} es un ternario:
                      si abreviatura existe → "(kg)", si no → cadena vacía
                    */}
                    {u.abreviatura ? `(${u.abreviatura})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/*
                  CAMPO: Precio de venta 
            Usa el componente InputPrecio definido arriba.
            En modo edición (ro=true) este campo NO se bloquea → es el único
            que el backend permite modificar con PATCH.
          */}
          <div className="min-w-0">
            <InputPrecio
              label="Precio"
              name="precioVenta"
              value={formData.precioVenta}
              onChange={handleNumChange}  // Handler numérico (clampea negativos)
              required
              // Sin disabled → siempre editable, incluso en modo lockNonPriceFields
            />
          </div>

          {/*
              CAMPO: Stock actual
            El value tiene una expresión larga para normalizar los casos en que
            stockActual llegue como "", undefined o null:
            todos se convierten a "" para que el input muestre el placeholder
            en lugar de "0" o "undefined".
          */}
          <div className="min-w-0">
            <label className={labelClass}>
              Stock actual <span className="text-[var(--accent-red)]">*</span>
            </label>
            <div className={fieldClass}>
              <Package className={iconClass} />
              <input
                type="number"
                name="stockActual"
                value={
                  formData.stockActual === "" ||
                  formData.stockActual === undefined ||
                  formData.stockActual === null
                    ? ""
                    : formData.stockActual
                }
                onChange={handleNumChange}
                min="0"
                step="0.01"
                required={!ro}
                disabled={ro}
                className={inputClass}
                placeholder="0"
              />
            </div>
          </div>

          {/*
              CAMPO: Descripción (textarea)
            Un <textarea> es igual a un <input> controlado, solo que
            acepta múltiples líneas. Se usa el mismo handleChange genérico.
            resize-none → deshabilita el resize manual del textarea.
          */}
          <div className="min-w-0 sm:col-span-2 xl:col-span-3">
            <label className={labelClass}>Descripción (descripcion)</label>
            <div className={`${fieldClass} items-start`}>
              {/* mt-1 para alinear el ícono con la primera línea de texto */}
              <FileText className="w-5 h-5 flex-shrink-0 text-white mt-1" />
              <textarea
                name="observaciones"
                value={formData.observaciones}
                onChange={handleChange}
                rows={3}
                disabled={ro}
                className={`${inputClass} resize-none min-h-[4rem]`}
                placeholder="Opcional"
              />
            </div>
          </div>

        </div>
        
        {/*
          flex-col-reverse → en mobile los botones se apilan y "Guardar" queda arriba
          sm:flex-row → en tablet/desktop quedan lado a lado
          sm:justify-center → centrados horizontalmente en pantallas grandes
        */}
        <div className="flex flex-col-reverse gap-2 pt-4 border-t border-[var(--border)]/50 mt-2 sm:flex-row sm:justify-center">

          {/*
            Botón izquierdo: condicional según si viene la prop `onClose`.
            ─ Si onClose existe → botón "Cancelar" (cierra el modal sin guardar)
            ─ Si no existe     → botón "Limpiar" (resetea el formulario, pero lo deja abierto)
          */}
          {onClose ? (
            <button
              type="button"   // type="button" → NO dispara el submit del form
              onClick={onClose}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--border)] hover:bg-[#484f58] text-white rounded-md font-medium transition-all duration-300"
            >
              Cancelar
            </button>
          ) : (
            <button
              type="button"   // type="button" → NO dispara el submit del form
              onClick={onClear}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#252525] hover:bg-black text-white rounded-md font-medium transition-all duration-300"
            >
              <Eraser className="w-4 h-4" />
              Limpiar
            </button>
          )}

          {/*
            Botón derecho: siempre es el de confirmar.
            type="submit" → al hacer clic dispara el evento submit del <form>,
            que llama a handleSubmit (definido arriba).
            El texto cambia según el modo: "Guardar precio" o "Agregar producto".
          */}
          <button
            type="submit"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--accent-green)]/90 hover:bg-[var(--accent-green)] text-white rounded-md font-medium transition-all duration-300"
          >
            <Plus className="w-4 h-4" />
            {isEditing ? "Guardar precio" : "Agregar producto"}
          </button>

        </div>
      </form>
    </div>
  );
}
