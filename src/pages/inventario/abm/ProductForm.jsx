import { X } from "lucide-react";

const inputClass =
  "w-full rounded-lg border border-[#2a2a32] bg-[#0d0d0f] px-3 py-1.5 text-sm text-[#f1f1f3] placeholder:text-[#4a4a5a] focus:border-[#22c55e]/50 outline-none transition-colors";

const selectClass =
  "w-full rounded-lg border border-[#2a2a32] bg-[#0d0d0f] px-3 py-1.5 text-sm text-[#f1f1f3] focus:border-[#22c55e]/50 outline-none cursor-pointer transition-colors";

const labelClass = "block space-y-0.5";

const labelText = "text-[11px] text-[#7a7a8c]";

export default function ProductForm({
  formData,
  setFormData,
  onSubmit,
  onClose,
  isEditing,
  categorias = [],
  subcategorias = [],
  unidades = [],
  loading = false,
}) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRadioChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCodigoBarrasChange = (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 13);
    setFormData((prev) => ({ ...prev, codigoBarras: digits }));
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="bg-[#111114] border border-[#1e1e24] rounded-xl w-full max-w-2xl flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1e1e24] shrink-0">
          <h2 className="text-sm font-semibold text-[#f1f1f3]">
            {isEditing ? "Editar Producto" : "Nuevo Producto"}
          </h2>
          <button type="button" onClick={onClose}
            className="p-1 rounded text-[#5a5a6e] hover:text-[#e1e1eb] hover:bg-[#1a1f2e] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body — sin scroll, todo visible */}
        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-2.5">

          {/* Fila 1: Codigo + Nombre */}
          <div className="grid grid-cols-2 gap-3">
            <label className={labelClass}>
              <span className={labelText}>Codigo de barras</span>
              <input
                type="text"
                name="codigoBarras"
                inputMode="numeric"
                autoComplete="off"
                value={formData.codigoBarras}
                onChange={handleCodigoBarrasChange}
                
                maxLength={13}
                placeholder="Opcional"
                className={inputClass}
              />
            </label>

            <label className={labelClass}>
              <span className={labelText}>
                Nombre <span className="text-rose-400">*</span>
              </span>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                required
                
                placeholder="Nombre del producto"
                className={inputClass}
              />
            </label>
          </div>

          {/* Fila 2: Descripcion */}
          <label className={labelClass}>
            <span className={labelText}>Descripcion</span>
            <input
              type="text"
              name="descripcion"
              value={formData.descripcion || ""}
              onChange={handleChange}
              
              placeholder="Descripcion del producto (opcional)"
              className={inputClass}
            />
          </label>

          {/* Fila 3: Categoria + Subcategoria */}
          <div className="grid grid-cols-2 gap-3">
            <label className={labelClass}>
              <span className={labelText}>Categoria</span>
              <select
                name="idCategoria"
                value={formData.idCategoria ?? ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, idCategoria: e.target.value }))
                }
                disabled={loading}
                className={selectClass}
              >
                <option value="">Seleccionar...</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </label>

            <label className={labelClass}>
              <span className={labelText}>Subcategoria</span>
              <select
                name="idSubcategoria"
                value={formData.idSubcategoria ?? ""}
                disabled
                className={`${selectClass} text-[#4a4a5a] cursor-not-allowed opacity-50`}
              >
                <option value="">Proximamente...</option>
              </select>
            </label>
          </div>

          {/* Fila 4: Vende por peso + Unidad de medida */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className={labelText}>Vende por peso?</span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="productoPesable"
                    value="si"
                    checked={formData.productoPesable === "si"}
                    onChange={handleRadioChange}
                    
                    className="accent-[#22c55e]"
                  />
                  <span className="text-xs text-[#9a9aac]">Si</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="productoPesable"
                    value="no"
                    checked={formData.productoPesable === "no"}
                    onChange={handleRadioChange}
                    
                    className="accent-[#22c55e]"
                  />
                  <span className="text-xs text-[#9a9aac]">No</span>
                </label>
              </div>
            </div>

            <label className={labelClass}>
              <span className={labelText}>Unidad de medida</span>
              <select
                name="idUnidad"
                value={formData.idUnidad ?? ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, idUnidad: e.target.value }))
                }
                disabled={loading}
                className={selectClass}
              >
                <option value="">Seleccionar...</option>
                {unidadOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre}{u.abreviatura ? ` (${u.abreviatura})` : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Botones */}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-[#2a2a32] bg-[#0d0d0f] py-1.5 text-sm text-[#9a9aac] hover:text-[#e1e1eb] transition-colors">
              Cancelar
            </button>
            <button type="submit"
              className="flex-1 rounded-lg bg-[#22c55e] py-1.5 text-sm font-semibold text-[#0d0d0f] hover:bg-[#16a34a] disabled:opacity-40 transition-colors">
              {isEditing ? "Guardar cambios" : "Agregar producto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
