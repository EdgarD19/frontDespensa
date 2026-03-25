import { Search, Pencil, Trash2, Filter } from "lucide-react";
import { getEstadoStock } from "../utils";

const filterOptions = [
  { value: "todos", label: "Todos" },
  { value: "normal", label: "Normal" },
  { value: "bajo", label: "Bajo" },
  { value: "sin", label: "Sin stock" },
];

/* Estilo del .txt: fondo #171717, rounded 25px, campos con sombra inset */
const fieldClass =
  "flex items-center gap-2 rounded-[25px] py-2.5 px-4 bg-[#171717] shadow-[inset_2px_5px_10px_rgb(5,5,5)]";
const inputClass =
  "flex-1 bg-transparent border-none outline-none w-full text-[#d3d3d3] placeholder-[#8b949e] focus:ring-0";
const iconClass = "w-5 h-5 flex-shrink-0 text-white";

export default function ProductList({
  products,
  onEdit,
  onDelete,
  search,
  setSearch,
  filterCategoria,
  setFilterCategoria,
  filterStock,
  setFilterStock,
}) {
  const total = products.length;
  const stockBajo = products.filter((p) => getEstadoStock(p) === "bajo").length;
  const sinStock = products.filter((p) => getEstadoStock(p) === "sin").length;

  const categorias = [...new Set(products.map((p) => p.categoria))].filter(Boolean);
  const filteredProducts = products
    .filter((p) => {
      const matchSearch =
        !search ||
        p.nombre?.toLowerCase().includes(search.toLowerCase()) ||
        p.codigoBarras?.includes(search) ||
        p.observaciones?.toLowerCase().includes(search.toLowerCase());
      const matchCat = !filterCategoria || p.categoria === filterCategoria;
      const estado = getEstadoStock(p);
      const matchStock =
        filterStock === "todos" ||
        (filterStock === "normal" && estado === "normal") ||
        (filterStock === "bajo" && estado === "bajo") ||
        (filterStock === "sin" && estado === "sin");
      return matchSearch && matchCat && matchStock;
    })
    .sort((a, b) => a.nombre?.localeCompare(b.nombre) || 0);

  const formatPrecio = (p, tipo = "venta") => {
    const isPesable = p.productoPesable === "si";
    const valor = tipo === "compra"
      ? (isPesable ? p.precioCompraKg : p.precioCompra)
      : (isPesable ? p.precioVentaKg : p.precioVenta);
    const sufijo = isPesable ? "/kg" : "";
    return `Gs ${Number(valor || 0).toLocaleString("es-PY")}${sufijo}`;
  };

  const StockBadge = ({ estado, stock, unidadMedida }) => {
    const config = {
      normal: { text: `${stock} ${unidadMedida}`, class: "text-[#22c55e]" },
      bajo: { text: `${stock} ${unidadMedida}`, class: "text-[#f97316]" },
      sin: { text: "Sin stock", class: "text-[#ef4444]" },
    };
    const { text, class: cls } = config[estado];
    return <span className={`font-medium ${cls}`}>{text}</span>;
  };

  const ProductCard = ({ producto }) => {
    const estado = getEstadoStock(producto);
    const stock = Number(producto.stockActual ?? producto.stock ?? 0);
    const inicial = (producto.nombre?.[0] || "?").toUpperCase();

    return (
      <div className="group relative bg-[#252525] rounded-[25px] overflow-hidden shadow-[inset_2px_5px_10px_rgb(5,5,5)] transition-all duration-300 hover:scale-[1.03] hover:shadow-lg">
        {/* Foto */}
        <div className="aspect-square bg-[#171717] flex items-center justify-center overflow-hidden">
          {producto.foto ? (
            <img
              src={producto.foto}
              alt={producto.nombre}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-5xl font-bold text-[#22c55e]/60">{inicial}</span>
          )}
        </div>

        {/* Info principal */}
        <div className="p-4">
          <h3 className="font-semibold text-[#d3d3d3] truncate" title={producto.nombre}>
            {producto.nombre}
          </h3>
          <div className="mt-2 space-y-1 text-sm">
            <p className="text-[#8b949e]">
              Compra: <span className="text-[#d3d3d3]">{formatPrecio(producto, "compra")}</span>
            </p>
            <p className="text-[#8b949e]">
              Venta: <span className="text-[#d3d3d3] font-medium">{formatPrecio(producto)}</span>
            </p>
            <p className="flex items-center gap-1">
              Stock: <StockBadge estado={estado} stock={stock} unidadMedida={producto.unidadMedida || ""} />
            </p>
          </div>
        </div>

        {/* Overlay al pasar el mouse: categoría, subcategoría, marca + acciones */}
        <div className="absolute inset-0 bg-black/85 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-4">
          <div className="text-sm text-[#d3d3d3] space-y-1">
            <p><span className="text-[#8b949e]">Categoría:</span> {producto.categoria || "—"}</p>
            <p><span className="text-[#8b949e]">Subcategoría:</span> {producto.subcategoria || "—"}</p>
            <p><span className="text-[#8b949e]">Marca:</span> {producto.marca || "—"}</p>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => onEdit(producto)}
              className="p-2 rounded-md bg-[#252525] text-white hover:bg-black border border-[#30363d] transition-all duration-300"
              title="Editar"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(producto.id)}
              className="p-2 rounded-md bg-[#252525] text-white hover:bg-red-600 border border-[#30363d] transition-all duration-300"
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
    <div className="bg-[#171717] rounded-[25px] px-8 pb-6 pt-2 flex flex-col h-full transition-all duration-100 ease-in-out hover:scale-[1.01]">
      <h2 id="heading" className="text-center my-8 text-white text-xl">
        Lista de Productos
      </h2>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className={`${fieldClass} flex-col items-center justify-center py-4`}>
          <p className="text-2xl font-bold text-[#06b6d4]">{total}</p>
          <p className="text-xs text-[#8b949e] font-medium mt-1">TOTAL</p>
        </div>
        <div className={`${fieldClass} flex-col items-center justify-center py-4`}>
          <p className="text-2xl font-bold text-[#f97316]">{stockBajo}</p>
          <p className="text-xs text-[#8b949e] font-medium mt-1">STOCK BAJO</p>
        </div>
        <div className={`${fieldClass} flex-col items-center justify-center py-4`}>
          <p className="text-2xl font-bold text-[#ef4444]">{sinStock}</p>
          <p className="text-xs text-[#8b949e] font-medium mt-1">SIN STOCK</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex-1 min-w-[200px]">
          <div className={fieldClass}>
            <Search className={iconClass} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar productos..."
              className={`${inputClass} text-sm`}
            />
          </div>
        </div>
        <div className="flex gap-2">
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilterStock(opt.value)}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-300 ${
                filterStock === opt.value
                  ? "bg-black text-white"
                  : "bg-[#252525] text-white hover:bg-black"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className={fieldClass}>
          <Filter className={iconClass} />
          <select
            value={filterCategoria}
            onChange={(e) => setFilterCategoria(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-[#d3d3d3] text-sm cursor-pointer focus:ring-0"
          >
            <option value="">Todas las categorías</option>
            {categorias.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto min-h-0 rounded-[25px] shadow-[inset_2px_5px_10px_rgb(5,5,5)] bg-[#171717] p-4">
        {filteredProducts.length === 0 ? (
          <p className="text-[#8b949e] text-center py-12 text-sm">
            No hay productos que coincidan con los filtros.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredProducts.map((producto) => (
              <ProductCard key={producto.id} producto={producto} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
