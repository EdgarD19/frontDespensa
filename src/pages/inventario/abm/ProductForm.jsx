import { Hash, Barcode, Tag, FolderOpen, Layers, Award, Scale, Ruler, DollarSign, Package, Image, FileText, Eraser, Plus } from "lucide-react";

const MARCAS = ["Coca-Cola", "Pepsi", "Nestlé", "La Serenísima", "Genérica", "Arcor", "Bagley", "Quilmes"];

/* Estilo del .txt: campo con icono, fondo #171717, sombra inset, rounded 25px */
const fieldClass =
  "flex items-center gap-2 rounded-[25px] py-2.5 px-4 bg-[#171717] shadow-[inset_2px_5px_10px_rgb(5,5,5)]";
const inputClass =
  "flex-1 bg-transparent border-none outline-none w-full text-[#d3d3d3] placeholder-[#8b949e] focus:ring-0";
const iconClass = "w-5 h-5 flex-shrink-0 text-white";
const labelClass = "block text-sm font-medium text-[#8b949e] mb-1.5";
const selectClass = "w-full bg-transparent border-none outline-none text-[#d3d3d3] focus:ring-0 cursor-pointer";

function InputPrecio({ label, name, value, onChange, required, disabled }) {
  return (
    <div>
      <label className={labelClass}>
        {label} {required && <span className="text-[#ef4444]">*</span>}
      </label>
      <div className={`${fieldClass} gap-2`}>
        <DollarSign className={iconClass} />
        <span className="text-[#8b949e] text-sm">Gs</span>
        <input
          type="number"
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          min="0"
          step="0.01"
          className={inputClass}
          placeholder="0"
        />
      </div>
    </div>
  );
}

export default function ProductForm({
  formData,
  setFormData,
  onSubmit,
  onClear,
  isEditing,
  /** El backend solo aplica PATCH del precio; el resto queda bloqueado al editar. */
  lockNonPriceFields = false,
  categorias = [],
  subcategorias = [],
  unidades = [],
  proveedores = [],
  loading = false,
}) {
  /* --- inputs normales ----
    e.target -> es el input que el usuario toco
    name -> "nombre", "categoria"
    [name] -> escritura dinamica, solo ese campo
    ...prev -> copia todo los demas sin tocarlo */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };
  /* 
    --- para inputs numericos ---
    Math.max(0, ...) impide numeros negativos
    Guarda el numero como string porque los inputs siempre trabajan con texto
  */
  const handleNumChange = (e) => {
    const { name, value } = e.target;
    const num = value === "" ? "" : Math.max(0, parseFloat(value) || 0);
    setFormData((prev) => ({ ...prev, [name]: num === "" ? "" : String(num) }));
  };

  const isPesable = formData.productoPesable === "si";
  const ro = lockNonPriceFields;

  const handleSubmit = (e) => {
    e.preventDefault();
    const precioCompra = isPesable ? formData.precioCompraKg : formData.precioCompra;
    const precioVenta = isPesable ? formData.precioVentaKg : formData.precioVenta;
    if (Number(precioCompra) < 0 || Number(precioVenta) < 0) return;
    onSubmit(e);
  };

  return (
    <div className="bg-[#171717] rounded-[25px] px-8 pb-4 pt-2 transition-all duration-100 ease-in-out hover:scale-[1.01] ">
      <h2 id="heading" className="text-center my-8 text-white text-xl">
        Gestión de Producto
      </h2>

      {lockNonPriceFields && (
        <p className="text-center text-xs text-amber-200/90 px-2 -mt-4 mb-2">
          El servidor solo permite actualizar el <strong>precio de venta</strong> (PATCH con <span className="font-mono">precio</span>).
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">

        <div>
          <label className={labelClass}>Código</label>
          <div className={fieldClass}>
            <Hash className={iconClass} />
            <input type="text"
              name="codigo"
              value={formData.codigo}
              onChange={handleChange}
              disabled={ro}
              className={inputClass}
              placeholder="ej: 1234"
            />
          </div>
        </div>
        
        <div>
          <label className={labelClass}>Código de Barras</label>
          <div className={fieldClass}>
            <Barcode className={iconClass} />
            <input
              type="text"
              name="codigoBarras"
              value={formData.codigoBarras}
              onChange={handleChange}
              disabled={ro}
              className={inputClass}
              placeholder="Ej: 123456789"
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>
            Nombre <span className="text-[#ef4444]">*</span>
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
              placeholder="Nombre completo del producto"
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>
            Categoría <span className="text-[#ef4444]">*</span>
          </label>
          <div className={fieldClass}>
            <FolderOpen className={iconClass} />
            <select
              name="idCategoria"
              value={formData.idCategoria ?? ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, idCategoria: e.target.value }))}
              required
              disabled={loading || ro}
              className={selectClass}
            >
              <option value="">Seleccionar categoría...</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>Subcategoría</label>
          <div className={fieldClass}>
            <Layers className={iconClass} />
            <select
              name="idSubcategoria"
              value={formData.idSubcategoria ?? ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, idSubcategoria: e.target.value }))}
              disabled={loading || !formData.idCategoria || ro}
              className={selectClass}
            >
              <option value="">Seleccionar subcategoría...</option>
              {subcategorias.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>Marca</label>
          <div className={fieldClass}>
            <Award className={iconClass} />
            <select
              name="marca"
              value={formData.marca}
              onChange={handleChange}
              disabled={ro}
              className={selectClass}
            >
              <option value="">Seleccionar marca...</option>
              {MARCAS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>
            Proveedor <span className="text-[#ef4444]">*</span>
          </label>
          <div className={fieldClass}>
            <Package className={iconClass} />
            <select
              name="idProveedor"
              value={formData.idProveedor ?? ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, idProveedor: e.target.value }))}
              required
              disabled={loading || ro}
              className={selectClass}
            >
              <option value="">Seleccionar proveedor...</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>Producto Pesable</label>
          <div className={fieldClass}>
            <Scale className={iconClass} />
            <select
              name="productoPesable"
              value={formData.productoPesable}
              onChange={handleChange}
              disabled={ro}
              className={selectClass}
            >
              <option value="no">No</option>
              <option value="si">Sí</option>
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>
            Unidad de Medida <span className="text-[#ef4444]">*</span>
          </label>
          <div className={fieldClass}>
            <Ruler className={iconClass} />
            <select
              name="idUnidad"
              value={formData.idUnidad ?? ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, idUnidad: e.target.value }))}
              required
              disabled={loading || ro}
              className={selectClass}
            >
              <option value="">Seleccionar unidad...</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>{u.nombre} {u.abreviatura ? `(${u.abreviatura})` : ""}</option>
              ))}
            </select>
          </div>
        </div>

        {!isPesable ? (
          <>
            <InputPrecio
              label="Precio de Compra"
              name="precioCompra"
              value={formData.precioCompra}
              onChange={handleNumChange}
              required={!ro}
              disabled={ro}
            />
            <InputPrecio
              label="Precio de Venta Unitario"
              name="precioVenta"
              value={formData.precioVenta}
              onChange={handleNumChange}
              required
            />
          </>
        ) : (
          <>
            <InputPrecio
              label="Precio de Compra por kg"
              name="precioCompraKg"
              value={formData.precioCompraKg}
              onChange={handleNumChange}
              required={!ro}
              disabled={ro}
            />
            <InputPrecio
              label="Precio de Venta por kg"
              name="precioVentaKg"
              value={formData.precioVentaKg}
              onChange={handleNumChange}
              required
            />
          </>
        )}

        <div>
          <label className={labelClass}>Stock Mínimo</label>
          <div className={fieldClass}>
            <Package className={iconClass} />
            <input
              type="number"
              name="stockMinimo"
              value={formData.stockMinimo}
              onChange={handleNumChange}
              min="0"
              disabled={ro}
              className={inputClass}
              placeholder="0"
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Stock actual</label>
          <div className={fieldClass}>
            <Package className={iconClass} />
            <input
              type="number"
              name="stockActual"
              value={
                formData.stockActual === "" || formData.stockActual === undefined
                  ? ""
                  : formData.stockActual
              }
              onChange={handleNumChange}
              min="0"
              step="0.01"
              disabled={ro}
              className={inputClass}
              placeholder="0"
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Foto del Producto</label>
          <div className={`${fieldClass} flex-col items-stretch`}>
            <div className="flex items-center gap-2 w-full">
              <Image className={iconClass} />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = () =>
                      setFormData((prev) => ({ ...prev, foto: reader.result, imagenNombre: file.name }));
                    reader.readAsDataURL(file);
                  } else {
                    setFormData((prev) => ({ ...prev, foto: "", imagenNombre: "" }));
                  }
                }}
                className="hidden"
                id="imagen-input"
                disabled={ro}
              />
              <label
                htmlFor="imagen-input"
                className={`px-4 py-2 bg-[#252525] text-white rounded-md text-sm transition-all duration-300 ${ro ? "opacity-40 pointer-events-none" : "cursor-pointer hover:bg-black"}`}
              >
                Seleccionar archivo
              </label>
            </div>
            {formData.foto && (
              <div className="mt-3">
                <img src={formData.foto} alt="Preview" className="h-16 object-cover rounded mx-auto" />
              </div>
            )}
            <p className="text-xs text-[#8b949e] mt-2">{formData.imagenNombre || "Sin archivos seleccionados"}</p>
          </div>
        </div>

        <div>
          <label className={labelClass}>Observaciones</label>
          <div className={`${fieldClass} items-start`}>
            <FileText className="w-5 h-5 flex-shrink-0 text-white mt-1" />
            <textarea
              name="observaciones"
              value={formData.observaciones}
              onChange={handleChange}
              rows={3}
              disabled={ro}
              className={`${inputClass} resize-none min-h-[4rem]`}
              placeholder="Observaciones adicionales..."
            />
          </div>
        </div>

        <div className="flex justify-center flex-row gap-2 mt-10">
          <button
            type="button"
            onClick={onClear}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#252525] hover:bg-black text-white rounded-md font-medium transition-all duration-300"
          >
            <Eraser className="w-4 h-4" />
            Limpiar
          </button>
          <button
            type="submit"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#252525] hover:bg-black text-white rounded-md font-medium transition-all duration-300"
          >
            <Plus className="w-4 h-4" />
            {isEditing ? "Guardar Cambios" : "Agregar Producto"}
          </button>
        </div>
      </form>
    </div>
  );
}
