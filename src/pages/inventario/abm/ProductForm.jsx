import { X } from "lucide-react";

const inputClass =
  "w-full rounded-none border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:border-[var(--accent)] outline-none transition-colors";

const selectClass =
  "w-full rounded-none border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-white focus:border-[var(--accent)] outline-none cursor-pointer transition-colors";

const labelClass = "block space-y-0.5";

const labelText = "text-[11px] text-white/50";

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
      <div className="bg-[#0c0c0e] border border-white/10 rounded-none w-full max-w-2xl flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 shrink-0">
          <h2 className="text-sm font-semibold text-white">
            {isEditing ? "Editar Producto" : "Nuevo Producto"}
          </h2>
          <button type="button" onClick={onClose}
            className="p-1 rounded text-white/40 hover:text-white hover:bg-[#1a1f2e] transition-colors">
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
              
              placeholder="Descripcion del producto"
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
                  setFormData((prev) => ({
                    ...prev,
                    idCategoria: e.target.value,
                    idSubcategoria: "",
                  }))
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
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, idSubcategoria: e.target.value }))
                }
                disabled={loading || !formData.idCategoria}
                className={selectClass}
              >
                <option value="">Seleccionar...</option>
                {subcategorias.map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </label>
          </div>

          {/* Fila 4: Vende por peso + IVA + Unidad de medida */}
          <div className="grid grid-cols-3 gap-3">
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
                    
                    className="accent-[var(--accent)]"
                  />
                  <span className="text-xs text-white/70">Si</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="productoPesable"
                    value="no"
                    checked={formData.productoPesable === "no"}
                    onChange={handleRadioChange}
                    
                    className="accent-[var(--accent)]"
                  />
                  <span className="text-xs text-white/70">No</span>
                </label>
              </div>
            </div>

            <div>
              <span className={labelText}>IVA</span>
              <select
                name="iva"
                value={formData.iva ?? "10"}
                onChange={handleChange}
                className={selectClass}
              >
                <option value="0">Exento</option>
                <option value="5">5%</option>
                <option value="10">10%</option>
              </select>
            </div>

            <label className={labelClass}>
              <span className={labelText}>
                Unidad de medida <span className="text-rose-400">*</span>
              </span>
              <select
                name="idUnidad"
                value={formData.idUnidad ?? ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, idUnidad: e.target.value }))
                }
                disabled={loading}
                required
                className={selectClass}
              >
                <option value="" disabled>Seleccionar...</option>
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
              className="flex-1 rounded-none border border-white/10 bg-white/[0.03] py-1.5 text-sm text-white/70 hover:text-white transition-colors">
              Cancelar
            </button>
            <button type="submit"
              className="flex-1 rounded-none bg-[var(--accent)] py-1.5 text-sm font-semibold text-black hover:bg-[var(--accent-hover)] disabled:opacity-40 transition-colors">
              {isEditing ? "Guardar cambios" : "Agregar producto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
