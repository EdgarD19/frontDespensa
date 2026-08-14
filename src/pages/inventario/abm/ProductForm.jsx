import {
  Barcode,
  Tag,
  FolderOpen,
  List,
  Building2,
  Scale,
  Ruler,
  Package,
  Truck,
  FileText,
} from "lucide-react";

const fieldClass =
  "flex items-center gap-2 rounded-lg px-3 py-2 bg-white/5 border border-white/10";

const inputClass =
  "flex-1 bg-transparent border-none outline-none w-full text-white placeholder:text-white/30 focus:ring-0 text-sm";

const iconClass = "w-5 h-5 flex-shrink-0 text-white/50";

const labelClass = "block text-sm text-white/50 mb-1";

const selectClass = "w-full bg-transparent border-none outline-none text-white focus:ring-0 cursor-pointer text-sm";

export default function ProductForm({
  formData,
  setFormData,
  onSubmit,
  onClear,
  onClose,
  isEditing,
  lockNonPriceFields = false,
  categorias = [],
  subcategorias = [],
  marcas = [],
  unidades = [],
  proveedores = [],
  loading = false,
}) {
  const ro = lockNonPriceFields;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleRadioChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCodigoBarrasChange = (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 13);
    setFormData((prev) => ({ ...prev, codigoBarras: digits }));
  };

  const handleNumChange = (e) => {
    const { name, value } = e.target;
    const num = value === "" ? "" : Math.max(0, parseFloat(value) || 0);
    setFormData((prev) => ({ ...prev, [name]: num === "" ? "" : String(num) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(e);
  };

  const isPeso = formData.productoPesable === "si";
  const unidadOptions = (unidades || []).filter((u) => {
    const abv = (u.abreviatura || "").toLowerCase();
    return isPeso ? ["kg", "gr"].includes(abv) : !["kg", "gr"].includes(abv);
  });

  return (
    <div className="bg-[var(--bg-card)] border border-white/10 rounded-2xl">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <h2 className="text-white font-semibold text-lg">
          {isEditing ? "Editar Producto" : "Nuevo Producto"}
        </h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="px-6 py-5 flex flex-col gap-4">

          {lockNonPriceFields && (
            <div className="px-3 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs rounded-lg">
              Modo edición — campos bloqueados.
            </div>
          )}

          <div className="grid grid-cols-1 min-w-0 sm:grid-cols-2 xl:grid-cols-3 gap-x-4 gap-y-3">

          <div className="min-w-0">
            <label className={labelClass}>Codigo de barras</label>
            <div className={fieldClass}>
              <Barcode className={iconClass} />
              <input
                type="text"
                name="codigoBarras"
                inputMode="numeric"
                autoComplete="off"
                value={formData.codigoBarras}
                onChange={handleCodigoBarrasChange}
                disabled={ro}
                maxLength={13}
                className={inputClass}
                placeholder="Opcional"
              />
            </div>
          </div>

          <div className="min-w-0 sm:col-span-1 xl:col-span-2">
            <label className={labelClass}>
              Nombre del producto <span className="text-red-400">*</span>
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

          <div className="min-w-0">
            <label className={labelClass}>
              Categoria <span className="text-red-400">*</span>
            </label>
            <div className={fieldClass}>
              <FolderOpen className={iconClass} />
              <select
                name="idCategoria"
                value={formData.idCategoria ?? ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, idCategoria: e.target.value }))
                }
                required={!ro}
                disabled={loading || ro}
                className={selectClass}
              >
                <option value="">Seleccionar...</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="min-w-0">
            <label className={labelClass}>Subcategoria</label>
            <div className={fieldClass}>
              <List className={iconClass} />
              <select
                name="idSubcategoria"
                value={formData.idSubcategoria ?? ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, idSubcategoria: e.target.value }))
                }
                disabled={loading || ro || !formData.idCategoria || subcategorias.length === 0}
                className={selectClass}
              >
                <option value="">
                  {formData.idCategoria ? "Seleccionar..." : "Sin categoría"}
                </option>
                {subcategorias.map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="min-w-0">
            <label className={labelClass}>Marca</label>
            <div className={fieldClass}>
              <Building2 className={iconClass} />
              <select
                name="idMarca"
                value={formData.idMarca ?? ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, idMarca: e.target.value }))
                }
                disabled={loading || ro}
                className={selectClass}
              >
                <option value="">Seleccionar...</option>
                {marcas.map((m) => (
                  <option key={m.id} value={m.id}>{m.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="col-span-1 sm:col-span-2 xl:col-span-3 -mb-1 mt-1">
            <hr className="border-t border-[#30363d]/60" />
          </div>

          <div className="min-w-0 sm:col-span-1 xl:col-span-2">
            <label className={labelClass}>
              Producto vende por peso? <span className="text-red-400">*</span>
            </label>
            <div className={fieldClass}>
              <Scale className={iconClass} />
              <label className="flex items-center gap-2 cursor-pointer ml-1">
                <input
                  type="radio"
                  name="productoPesable"
                  value="si"
                  checked={formData.productoPesable === "si"}
                  onChange={handleRadioChange}
                  disabled={ro}
                  className="accent-[var(--accent-green)]"
                />
                <span className="text-[#d3d3d3] text-sm">Sí</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer ml-4">
                <input
                  type="radio"
                  name="productoPesable"
                  value="no"
                  checked={formData.productoPesable === "no"}
                  onChange={handleRadioChange}
                  disabled={ro}
                  className="accent-[var(--accent-green)]"
                />
                <span className="text-[#d3d3d3] text-sm">No</span>
              </label>
            </div>
          </div>

          <div className="min-w-0">
            <label className={labelClass}>
              Unidad <span className="text-red-400">*</span>
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
                {unidadOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre}{u.abreviatura ? ` (${u.abreviatura})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="min-w-0 sm:col-span-2 xl:col-span-3">
            <label className={labelClass}>Contenido por unidad</label>
            <div className={fieldClass}>
              <Package className={iconClass} />
              <input
                type="text"
                name="contenido"
                value={formData.contenido}
                onChange={handleChange}
                disabled={ro}
                className={inputClass}
                placeholder='Opcional — ej: "30 unidades", "500g", "1L"'
              />
            </div>
          </div>

          <div className="col-span-1 sm:col-span-2 xl:col-span-3 -mb-1 mt-1">
            <hr className="border-t border-[#30363d]/60" />
          </div>

          <div className="min-w-0">
            <label className={labelClass}>
              Disponible <span className="text-red-400">*</span>
            </label>
            <div className={fieldClass}>
              <label className="flex items-center gap-2 cursor-pointer ml-1">
                <input
                  type="radio"
                  name="activo"
                  checked={formData.activo === true || formData.activo === undefined}
                  onChange={() =>
                    setFormData((prev) => ({ ...prev, activo: true }))
                  }
                  disabled={ro}
                  className="accent-[var(--accent-green)]"
                />
                <span className="text-[#d3d3d3] text-sm">Activo</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer ml-4">
                <input
                  type="radio"
                  name="activo"
                  checked={formData.activo === false}
                  onChange={() =>
                    setFormData((prev) => ({ ...prev, activo: false }))
                  }
                  disabled={ro}
                  className="accent-[var(--accent-green)]"
                />
                <span className="text-[#d3d3d3] text-sm">Inactivo</span>
              </label>
            </div>
          </div>

          <div className="min-w-0">
            <label className={labelClass}>Proveedor</label>
            <div className={fieldClass}>
              <Truck className={iconClass} />
              <select
                name="idProveedor"
                value={formData.idProveedor ?? ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, idProveedor: e.target.value }))
                }
                disabled={loading || ro}
                className={selectClass}
              >
                <option value="">Seleccionar...</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="min-w-0 sm:col-span-2 xl:col-span-2">
            <label className={labelClass}>Observaciones</label>
            <div className={`${fieldClass} items-start`}>
              <FileText className="w-5 h-5 flex-shrink-0 text-white mt-1" />
              <textarea
                name="observaciones"
                value={formData.observaciones}
                onChange={handleChange}
                rows={2}
                disabled={ro}
                className={`${inputClass} resize-none min-h-[2.5rem]`}
                placeholder="Opcional"
              />
            </div>
          </div>

        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10">
          {onClose ? (
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-white/60 hover:text-white transition-colors">
              Cancelar
            </button>
          ) : (
            <button type="button" onClick={onClear}
              className="px-4 py-2 text-sm text-white/60 hover:text-white transition-colors">
              Limpiar
            </button>
          )}
          <button type="submit"
            className="px-5 py-2 text-sm font-medium bg-[var(--accent-green)] text-black rounded-lg hover:opacity-90 transition-opacity">
            {isEditing ? "Guardar cambios" : "Agregar producto"}
          </button>
        </div>
        </div>
      </form>
    </div>
  );
}
